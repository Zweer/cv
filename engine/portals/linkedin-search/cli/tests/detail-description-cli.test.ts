import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runDetailFixture } from "./helpers.ts";

const fixturePath = join(import.meta.dirname, "fixtures/detail-orbis-excerpt.html");

async function detail(format: "json" | "plain") {
  const page = readFileSync(fixturePath, "utf-8");
  const { stdout, stderr, exitCode, requests } = await runDetailFixture(page, format);
  assert.equal(exitCode, 0);
  assert.equal(stderr, "");
  assert.deepEqual(requests, ["/jobs-guest/jobs/api/jobPosting/4345841651"]);
  return stdout;
}

describe("detail description CLI", () => {
  test("detail JSON preserves paragraph and list boundaries from a captured guest response", async () => {
    const job = JSON.parse(await detail("json"));
    assert.ok(job.description.includes("Europe\n"));
    assert.ok(job.description.includes("Designing and building agentic & multi-agent systems\nDeveloping"));
    assert.ok(!job.description.includes("<p>"));
  });

  test("detail plain output preserves the same description boundaries", async () => {
    const output = await detail("plain");
    assert.ok(output.includes("Designing and building agentic & multi-agent systems\nDeveloping"));
    assert.ok(output.includes("Status: CLOSED / EXPIRED"));
  });

  test("description formatting retains the captured posting's other fields and text", async () => {
    const job = JSON.parse(await detail("json"));
    assert.equal(job.id, "4345841651");
    assert.equal(job.title, "Agentic AI Engineer - Full remote - Europe");
    assert.equal(job.seniority, "Mid-Senior level");
    assert.equal(job.employmentType, "Contract");
    assert.equal(job.isActive, false);
    assert.ok(job.description.includes("Designing and building agentic & multi-agent systems"));
    assert.ok(job.description.includes("Developing high-performance APIs that power AI agents at scale"));
  });
});
