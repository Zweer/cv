// merge_delta.ts merges a base profile with a per-application delta.
//
// Why this test exists: the merge is the heart of the tailoring engine. The delta
// carries only what changes for one posting, and the resolved file must be a
// faithful, compilable superset of the base with exactly those changes applied.
// The reorder/filter/override/skill semantics are easy to get subtly wrong (drop a
// job on a typo, double a skill, deep-merge where a replace was meant), so they are
// pinned here.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { merge } from "../tools/merge_delta.ts";

function baseProfile(): Record<string, unknown> {
  return {
    language: "en",
    name: "Test",
    surname: "Person",
    abstract: "base abstract",
    skills: ["Alpha", "Beta", "Gamma"],
    works: [
      { structure: "Acme", title: "Engineer", resume: true, tasks: ["a"] },
      { structure: "Globex", title: "Lead", resume: false, tasks: ["b"] },
      { structure: "Initech", title: "Intern", resume: false, hidden: true, tasks: ["c"] },
    ],
  };
}

describe("PlainOverrides", () => {
  test("scalar override replaces base", () => {
    const resolved = merge(baseProfile(), { abstract: "tailored abstract" });
    assert.equal(resolved.abstract, "tailored abstract");
  });

  test("untouched keys survive", () => {
    const resolved = merge(baseProfile(), { abstract: "x" });
    assert.equal(resolved.name, "Test");
    assert.equal(resolved.language, "en");
  });

  test("cover_letter attached verbatim", () => {
    const cl = { recipient: { company: "Acme" }, body: ["p1"] };
    const resolved = merge(baseProfile(), { cover_letter: cl });
    assert.deepEqual(resolved.cover_letter, cl);
  });

  test("empty delta is identity", () => {
    assert.deepEqual(merge(baseProfile(), {}), baseProfile());
  });
});

describe("WorksSelect", () => {
  test("reorder and filter", () => {
    const resolved = merge(baseProfile(), { works_select: ["Globex | Lead", "Acme | Engineer"] });
    const titles = (resolved.works as Array<Record<string, unknown>>).map((w) => [w.structure, w.title]);
    assert.deepEqual(titles, [
      ["Globex", "Lead"],
      ["Acme", "Engineer"],
    ]);
  });

  test("select by title alone when unique", () => {
    const resolved = merge(baseProfile(), { works_select: ["Engineer"] });
    const works = resolved.works as Array<Record<string, unknown>>;
    assert.equal(works.length, 1);
    assert.equal(works[0].structure, "Acme");
  });

  test("selecting a hidden work unhides it", () => {
    const resolved = merge(baseProfile(), { works_select: ["Initech | Intern"] });
    const works = resolved.works as Array<Record<string, unknown>>;
    assert.ok(!("hidden" in works[0]));
  });

  test("unmatched identifier is an error", () => {
    assert.throws(() => merge(baseProfile(), { works_select: ["Nonexistent | Role"] }));
  });
});

describe("WorksOverride", () => {
  test("shallow merge on matched work", () => {
    const resolved = merge(baseProfile(), {
      works_override: { "Globex | Lead": { resume: true, description: "new" } },
    });
    const globex = (resolved.works as Array<Record<string, unknown>>).find((w) => w.structure === "Globex")!;
    assert.equal(globex.resume, true);
    assert.equal(globex.description, "new");
    assert.deepEqual(globex.tasks, ["b"]); // untouched field survives
  });

  test("override applies after select", () => {
    const resolved = merge(baseProfile(), {
      works_select: ["Acme | Engineer"],
      works_override: { "Acme | Engineer": { title: "Senior Engineer" } },
    });
    assert.equal((resolved.works as Array<Record<string, unknown>>)[0].title, "Senior Engineer");
  });

  test("override on unselected work is an error", () => {
    assert.throws(() =>
      merge(baseProfile(), {
        works_select: ["Acme | Engineer"],
        works_override: { "Globex | Lead": { resume: true } },
      }),
    );
  });
});

describe("Skills", () => {
  test("append deduplicates and preserves order", () => {
    const resolved = merge(baseProfile(), { skills_append: ["Delta", "alpha"] }); // "alpha" dups "Alpha"
    assert.deepEqual(resolved.skills, ["Alpha", "Beta", "Gamma", "Delta"]);
  });

  test("remove is case insensitive", () => {
    const resolved = merge(baseProfile(), { skills_remove: ["beta"] });
    assert.deepEqual(resolved.skills, ["Alpha", "Gamma"]);
  });

  test("remove then append", () => {
    const resolved = merge(baseProfile(), { skills_remove: ["Alpha"], skills_append: ["Delta"] });
    assert.deepEqual(resolved.skills, ["Beta", "Gamma", "Delta"]);
  });

  test("skills wholesale replace via plain override", () => {
    const resolved = merge(baseProfile(), { skills: ["Only"] });
    assert.deepEqual(resolved.skills, ["Only"]);
  });
});

describe("Validation", () => {
  test("non-mapping base rejected", () => {
    assert.throws(() => merge([1, 2, 3], {}));
  });

  test("null delta is identity", () => {
    assert.deepEqual(merge(baseProfile(), null), baseProfile());
  });
});
