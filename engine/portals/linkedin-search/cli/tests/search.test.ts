import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runSearchServing, runSearchUnit } from "./helpers.ts";

function searchCard(id: string, title: string): string {
  return `<li>
    <div data-entity-urn="urn:li:jobPosting:${id}">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/${id}"></a>
      <h3 class="base-search-card__title">${title}</h3>
    </div>
  </li>`;
}

describe("runSearch", () => {
  // --limit 0 is rejected by the CLI's own flag validation, so this exercises
  // the runSearch function directly in a child process: limit 0 -> slice(0, 0)
  // -> zero results.
  test("--limit 0 emits zero results", async () => {
    const result = await runSearchUnit(searchCard("123456", "Engineer"), {
      location: "Copenhagen, Denmark",
      jobage: 9999,
      page: 1,
      limit: 0,
      format: "json",
    });
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).results.length, 0);
  });

  test("--jobage-minutes 30 constructs f_TPR=r1800 in the request URL", async () => {
    const { result, requests } = await runSearchServing("", [
      "-l",
      "Remote",
      "--jobage-minutes",
      "30",
      "--format",
      "json",
    ]);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].searchParams.get("f_TPR"), "r1800");
  });
});
