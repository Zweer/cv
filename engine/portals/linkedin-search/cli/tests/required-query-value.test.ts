import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { runSearchFixture } from "./helpers.ts";

const LOCATION = "Copenhagen, Denmark";

// parseFlags stores a value-less flag as `true` and an empty argument as "",
// and the search took `--query` only when it was a non-empty string. So a
// bare `-q`, `-q ""` (an unset shell variable) or a blank query dropped the
// keywords and returned every posting in the location with exit 0. These run
// the real CLI against the saved search fixture and count outbound requests.
describe("--query requires a value", () => {
  for (const args of [["-q"], ["-q", "--jobage", "7"], ["--query", ""], ["-q", "   "]]) {
    test(`${JSON.stringify(args)} exits 1 with BAD_ARG before any request`, async () => {
      const { result, requests } = await runSearchFixture(["search", "-l", LOCATION, ...args]);
      assert.equal(result.exitCode, 1);
      assert.equal(result.stdout, "");
      const error = JSON.parse(result.stderr);
      assert.equal(error.code, "BAD_ARG");
      assert.ok(error.error.includes("--query"));
      assert.equal(requests.length, 0);
    });
  }

  test("a query is sent as keywords", async () => {
    const { result, requests } = await runSearchFixture(["search", "-l", LOCATION, "-q", "data engineer"]);
    assert.equal(result.exitCode, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].searchParams.get("keywords"), "data engineer");
  });

  test("omitting --query is still an intentional location-only search", async () => {
    const { result, requests } = await runSearchFixture(["search", "-l", LOCATION]);
    assert.equal(result.exitCode, 0);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].searchParams.has("keywords"), false);
  });
});
