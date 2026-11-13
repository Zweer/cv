import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runSearchFixture } from "./helpers.ts";

const LOCATION = "Copenhagen, Denmark";

// workTypeFlag() maps a mode it does not recognise to null, and the search
// URL then carries no f_WT at all. So `--remote remote,hybrid`, a misspelt
// mode, or a bare `--remote` searched every workplace type - onsite included -
// and exited 0 as if the filter had been applied. These run the real CLI
// against the saved search fixture and count the outbound requests.
describe("--remote mode", () => {
  for (const args of [
    ["--remote", "remote,hybrid"],
    ["--remote", "remotely"],
    ["--remote", "--limit", "1"],
    ["--remote"],
  ]) {
    test(`${args.join(" ")} exits 1 with BAD_ARG before any request`, async () => {
      const { result, requests } = await runSearchFixture([
        "search",
        "-l",
        LOCATION,
        "-q",
        "engineer",
        ...args,
      ]);
      assert.equal(result.exitCode, 1);
      assert.equal(result.stdout, "");
      const error = JSON.parse(result.stderr);
      assert.equal(error.code, "BAD_ARG");
      assert.ok(error.error.includes("--remote"));
      assert.equal(requests.length, 0);
    });
  }

  for (const [mode, wt] of [
    ["remote", "2"],
    ["hybrid", "3"],
    ["onsite", "1"],
    ["on-site", "1"],
    ["Remote", "2"],
  ]) {
    test(`--remote ${mode} sends f_WT=${wt}`, async () => {
      const { result, requests } = await runSearchFixture(["search", "-l", LOCATION, "--remote", mode]);
      assert.equal(result.exitCode, 0);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].searchParams.get("f_WT"), wt);
    });
  }

  test("omitting --remote still searches every workplace type", async () => {
    const { result, requests } = await runSearchFixture(["search", "-l", LOCATION]);
    assert.equal(result.exitCode, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].searchParams.has("f_WT"), false);
  });
});
