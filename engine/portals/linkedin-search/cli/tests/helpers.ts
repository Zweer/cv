import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execPath } from "node:process";

const CLI_PATH = join(import.meta.dirname, "../src/cli.ts");

export interface CLIResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Run the documented CLI in a fresh Node process. `preload` is a .mjs file
 * loaded via --import before the CLI module (the Node analogue of Bun's
 * --preload), used by the fixtures to redirect globalThis.fetch to a loopback
 * server.
 */
export async function runCLI(args: string[], preload?: string): Promise<CLIResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      execPath,
      [...(preload ? ["--import", `file://${preload}`] : []), CLI_PATH, ...args],
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 0 });
    });
  });
}

/** A loopback HTTP server returning `body` for every request, recording request URLs. */
function startServer(onRequest: (url: URL) => void, body: () => string | Buffer, contentType?: string) {
  const requests: URL[] = [];
  const server = createServer((req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    requests.push(url);
    onRequest(url);
    if (contentType) res.setHeader("Content-Type", contentType);
    res.end(body());
  });
  return new Promise<{ origin: string; requests: URL[]; stop: () => void }>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address() as AddressInfo;
      resolve({
        origin: `http://127.0.0.1:${port}`,
        requests,
        stop: () => server.close(),
      });
    });
  });
}

/** Run valid search controls through the real CLI with a saved, offline response. */
export async function runSearchFixture(args: string[]): Promise<{ result: CLIResult; requests: URL[] }> {
  const fixtureJson = readFileSync(join(import.meta.dirname, "fixtures/search-cards.json"), "utf-8");
  // The fixture stores the HTML as a JSON string (preserving whitespace); the
  // CLI reads response.text() and parses it as HTML, so serve the decoded HTML.
  const fixtureHtml = JSON.parse(fixtureJson) as string;
  const srv = await startServer(
    () => {},
    () => fixtureHtml,
  );
  const dir = mkdtempSync(join(tmpdir(), "linkedin-valid-flags-"));
  const preload = join(dir, "fetch.mjs");
  writeFileSync(
    preload,
    `
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== "https://www.linkedin.com" || url.pathname !== "/jobs-guest/jobs/api/seeMoreJobPostings/search") {
        throw new Error("Unexpected search fixture request");
      }
      return originalFetch(${JSON.stringify(srv.origin)} + url.pathname + url.search, init);
    };
  `,
  );
  try {
    const result = await runCLI(args, preload);
    return { result, requests: srv.requests };
  } finally {
    srv.stop();
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Serve arbitrary search HTML over loopback and run the CLI search command. */
export async function runSearchServing(
  html: string,
  args: string[],
): Promise<{ result: CLIResult; requests: URL[] }> {
  const srv = await startServer(
    () => {},
    () => html,
  );
  const dir = mkdtempSync(join(tmpdir(), "linkedin-search-html-"));
  const preload = join(dir, "fetch.mjs");
  writeFileSync(
    preload,
    `
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.origin !== "https://www.linkedin.com" || url.pathname !== "/jobs-guest/jobs/api/seeMoreJobPostings/search") {
        throw new Error("Unexpected search request");
      }
      return originalFetch(${JSON.stringify(srv.origin)} + url.pathname + url.search, init);
    };
  `,
  );
  try {
    const result = await runCLI(["search", ...args], preload);
    return { result, requests: srv.requests };
  } finally {
    srv.stop();
    rmSync(dir, { recursive: true, force: true });
  }
}

/**
 * Run the runSearch function directly in a fresh Node process with a stubbed
 * fetch, capturing only its stdout. Used for cases the CLI's own flag
 * validation rejects (e.g. --limit 0), where the function behaviour is the
 * unit under test. Isolating it in a child avoids the node:test reporter
 * interleaving writes on the parent's shared stdout.
 */
export async function runSearchUnit(html: string, opts: Record<string, unknown>): Promise<CLIResult> {
  const dir = mkdtempSync(join(tmpdir(), "linkedin-unit-"));
  const runner = join(dir, "run.mjs");
  const searchModule = join(import.meta.dirname, "../src/commands/search.ts");
  writeFileSync(
    runner,
    `
    globalThis.fetch = async () => new Response(${JSON.stringify(html)});
    const { runSearch } = await import(${JSON.stringify(`file://${searchModule}`)});
    const code = await runSearch(${JSON.stringify(opts)});
    process.exit(code);
  `,
  );
  try {
    return await new Promise<CLIResult>((resolve, reject) => {
      const child = spawn(execPath, [runner], { stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (d) => {
        stdout += d.toString();
      });
      child.stderr.on("data", (d) => {
        stderr += d.toString();
      });
      child.on("error", reject);
      child.on("close", (code) =>
        resolve({ stdout: stdout.trim(), stderr: stderr.trim(), exitCode: code ?? 0 }),
      );
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function parseJSON<T = unknown>(result: CLIResult): T {
  if (result.exitCode !== 0) {
    throw new Error(`CLI exited with code ${result.exitCode}. stderr: ${result.stderr}`);
  }
  try {
    return JSON.parse(result.stdout) as T;
  } catch {
    throw new Error(`Failed to parse JSON. stdout: ${result.stdout}\nstderr: ${result.stderr}`);
  }
}

/** Serve a detail page over loopback and run the CLI against the fixed guest endpoint. */
export async function runDetailFixture(
  page: string,
  format: "json" | "plain",
): Promise<{ stdout: string; stderr: string; exitCode: number; requests: string[] }> {
  const endpoint = "https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/4345841651";
  const requestPaths: string[] = [];
  const srv = await startServer(
    (url) => requestPaths.push(url.pathname),
    () => page,
    "text/html",
  );
  const dir = mkdtempSync(join(tmpdir(), "linkedin-detail-"));
  const preload = join(dir, "fetch.mjs");
  writeFileSync(
    preload,
    `
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      if (url !== ${JSON.stringify(endpoint)}) throw new Error("Unexpected fixture request");
      return originalFetch(${JSON.stringify(srv.origin)} + new URL(url).pathname, init);
    };
  `,
  );
  try {
    const result = await runCLI(["detail", "4345841651", "--format", format], preload);
    return { ...result, requests: requestPaths };
  } finally {
    srv.stop();
    rmSync(dir, { recursive: true, force: true });
  }
}
