import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runCLI, runSearchFixture } from "./helpers.ts";

const LOCATION = "Copenhagen, Denmark";

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("LinkedIn CLI flag validation", () => {
  describe("numeric flag validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--jobage", "foo"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "BAD_ARG");
      assert.match(err.error ?? "", /jobage/);
    });

    test("boolean flag (no value) exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--jobage"]);
      assert.notEqual(result.exitCode, 0);
      assert.ok(result.stderr);
    });

    test("valid integer passes validation", async () => {
      const { result, requests } = await runSearchFixture([
        "search",
        "-l",
        LOCATION,
        "--jobage",
        "7",
        "--limit",
        "1",
      ]);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stderr, "");
      assert.equal(requests.length, 1);
      assert.equal(requests[0].searchParams.get("location"), LOCATION);
      assert.equal(requests[0].searchParams.get("f_TPR"), "r604800");
      const output = JSON.parse(result.stdout);
      assert.equal(output.meta.count, 1);
      assert.deepEqual(
        output.results.map((job: { id: string }) => job.id),
        ["4425498329"],
      );
    });

    for (const name of ["jobage", "jobage-minutes", "page", "limit"]) {
      test(`--${name} fractional exits 1 with BAD_ARG instead of truncating`, async () => {
        const result = await runCLI(["search", "-l", LOCATION, `--${name}`, "1.5"]);
        assert.notEqual(result.exitCode, 0);
        const err = parsedStderr(result.stderr);
        assert.equal(err.code, "BAD_ARG");
        assert.match(err.error ?? "", new RegExp(name));
      });
    }

    test("--jobage 0.5 exits 1 with BAD_ARG instead of dropping the freshness filter", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--jobage", "0.5"]);
      assert.notEqual(result.exitCode, 0);
      assert.equal(parsedStderr(result.stderr).code, "BAD_ARG");
    });

    for (const name of ["jobage", "jobage-minutes", "page", "limit"]) {
      test(`--${name} 0 exits 1 with BAD_ARG`, async () => {
        const result = await runCLI(["search", "-l", LOCATION, `--${name}`, "0"]);
        assert.notEqual(result.exitCode, 0);
        const err = parsedStderr(result.stderr);
        assert.equal(err.code, "BAD_ARG");
        assert.match(err.error ?? "", new RegExp(name));
      });
    }
  });

  describe("--jobage-minutes validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--jobage-minutes", "foo"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "BAD_ARG");
      assert.match(err.error ?? "", /jobage-minutes/);
    });

    test("negative value is parsed as a missing value and exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--jobage-minutes", "-5"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "UNKNOWN_FLAG");
    });
  });

  describe("--jobage / --jobage-minutes conflict", () => {
    test("both set exits 1 with CONFLICTING_AGE_FLAGS", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--jobage", "7", "--jobage-minutes", "30"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "CONFLICTING_AGE_FLAGS");
    });
  });

  describe("--page NaN validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--page", "abc"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "BAD_ARG");
      assert.match(err.error ?? "", /page/);
    });
  });

  describe("--limit NaN validation", () => {
    test("non-numeric string exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--limit", "xyz"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "BAD_ARG");
      assert.match(err.error ?? "", /limit/);
    });
  });

  describe("existing validations (regression)", () => {
    test("missing --location exits 1 with NO_LOCATION", async () => {
      const result = await runCLI(["search"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "NO_LOCATION");
    });

    test("all valid flags construct the requested search offline", async () => {
      const { result, requests } = await runSearchFixture([
        "search",
        "-l",
        LOCATION,
        "--jobage",
        "7",
        "--page",
        "1",
        "--limit",
        "5",
      ]);
      assert.equal(result.exitCode, 0);
      assert.equal(result.stderr, "");
      assert.equal(requests.length, 1);
      assert.equal(requests[0].searchParams.get("f_TPR"), "r604800");
      assert.equal(requests[0].searchParams.get("start"), "0");
      const output = JSON.parse(result.stdout);
      assert.deepEqual(output.meta, { count: 2, page: 1 });
      assert.deepEqual(
        output.results.map((job: { id: string }) => job.id),
        ["4425498329", "4425494976"],
      );
    });
  });

  describe("--format validation", () => {
    test("search with an unsupported format exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["search", "-l", LOCATION, "--format", "invalid"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "BAD_ARG");
      assert.match(err.error ?? "", /format/);
    });

    test("detail with an unsupported format exits 1 with BAD_ARG", async () => {
      const result = await runCLI(["detail", "123456", "--format", "table"]);
      assert.notEqual(result.exitCode, 0);
      const err = parsedStderr(result.stderr);
      assert.equal(err.code, "BAD_ARG");
      assert.match(err.error ?? "", /format/);
    });
  });
});

describe("unknown flag rejection", () => {
  test("a bogus --flag exits 1 with a JSON error instead of being silently discarded", async () => {
    const result = await runCLI(["search", "-l", "Denmark", "-q", "test", "--bogus-flag", "xyz"]);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    const error = JSON.parse(result.stderr);
    assert.equal(error.code, "UNKNOWN_FLAG");
    assert.ok(error.error.includes("--bogus-flag"));
  });
});
