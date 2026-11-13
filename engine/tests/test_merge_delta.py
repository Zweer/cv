"""merge_delta.py merges a base profile with a per-application delta.

Why this test exists: the merge is the heart of the tailoring engine. The delta
carries only what changes for one posting, and the resolved file must be a
faithful, compilable superset of the base with exactly those changes applied.
The reorder/filter/override/skill semantics are easy to get subtly wrong (drop a
job on a typo, double a skill, deep-merge where a replace was meant), so they are
pinned here.
"""
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))
import merge_delta  # noqa: E402


def base_profile():
    return {
        "language": "en",
        "name": "Test",
        "surname": "Person",
        "abstract": "base abstract",
        "skills": ["Alpha", "Beta", "Gamma"],
        "works": [
            {"structure": "Acme", "title": "Engineer", "resume": True, "tasks": ["a"]},
            {"structure": "Globex", "title": "Lead", "resume": False, "tasks": ["b"]},
            {"structure": "Initech", "title": "Intern", "resume": False, "hidden": True, "tasks": ["c"]},
        ],
    }


class PlainOverrides(unittest.TestCase):
    def test_scalar_override_replaces_base(self):
        resolved = merge_delta.merge(base_profile(), {"abstract": "tailored abstract"})
        self.assertEqual(resolved["abstract"], "tailored abstract")

    def test_untouched_keys_survive(self):
        resolved = merge_delta.merge(base_profile(), {"abstract": "x"})
        self.assertEqual(resolved["name"], "Test")
        self.assertEqual(resolved["language"], "en")

    def test_cover_letter_attached_verbatim(self):
        cl = {"recipient": {"company": "Acme"}, "body": ["p1"]}
        resolved = merge_delta.merge(base_profile(), {"cover_letter": cl})
        self.assertEqual(resolved["cover_letter"], cl)

    def test_empty_delta_is_identity(self):
        self.assertEqual(merge_delta.merge(base_profile(), {}), base_profile())


class WorksSelect(unittest.TestCase):
    def test_reorder_and_filter(self):
        resolved = merge_delta.merge(
            base_profile(), {"works_select": ["Globex | Lead", "Acme | Engineer"]}
        )
        titles = [(w["structure"], w["title"]) for w in resolved["works"]]
        self.assertEqual(titles, [("Globex", "Lead"), ("Acme", "Engineer")])

    def test_select_by_title_alone_when_unique(self):
        resolved = merge_delta.merge(base_profile(), {"works_select": ["Engineer"]})
        self.assertEqual(len(resolved["works"]), 1)
        self.assertEqual(resolved["works"][0]["structure"], "Acme")

    def test_selecting_a_hidden_work_unhides_it(self):
        resolved = merge_delta.merge(base_profile(), {"works_select": ["Initech | Intern"]})
        self.assertNotIn("hidden", resolved["works"][0])

    def test_unmatched_identifier_is_an_error(self):
        with self.assertRaises(ValueError):
            merge_delta.merge(base_profile(), {"works_select": ["Nonexistent | Role"]})


class WorksOverride(unittest.TestCase):
    def test_shallow_merge_on_matched_work(self):
        resolved = merge_delta.merge(
            base_profile(),
            {"works_override": {"Globex | Lead": {"resume": True, "description": "new"}}},
        )
        globex = next(w for w in resolved["works"] if w["structure"] == "Globex")
        self.assertTrue(globex["resume"])
        self.assertEqual(globex["description"], "new")
        self.assertEqual(globex["tasks"], ["b"])  # untouched field survives

    def test_override_applies_after_select(self):
        resolved = merge_delta.merge(
            base_profile(),
            {
                "works_select": ["Acme | Engineer"],
                "works_override": {"Acme | Engineer": {"title": "Senior Engineer"}},
            },
        )
        self.assertEqual(resolved["works"][0]["title"], "Senior Engineer")

    def test_override_on_unselected_work_is_an_error(self):
        with self.assertRaises(ValueError):
            merge_delta.merge(
                base_profile(),
                {
                    "works_select": ["Acme | Engineer"],
                    "works_override": {"Globex | Lead": {"resume": True}},
                },
            )


class Skills(unittest.TestCase):
    def test_append_deduplicates_and_preserves_order(self):
        resolved = merge_delta.merge(
            base_profile(), {"skills_append": ["Delta", "alpha"]}  # "alpha" dups "Alpha"
        )
        self.assertEqual(resolved["skills"], ["Alpha", "Beta", "Gamma", "Delta"])

    def test_remove_is_case_insensitive(self):
        resolved = merge_delta.merge(base_profile(), {"skills_remove": ["beta"]})
        self.assertEqual(resolved["skills"], ["Alpha", "Gamma"])

    def test_remove_then_append(self):
        resolved = merge_delta.merge(
            base_profile(), {"skills_remove": ["Alpha"], "skills_append": ["Delta"]}
        )
        self.assertEqual(resolved["skills"], ["Beta", "Gamma", "Delta"])

    def test_skills_wholesale_replace_via_plain_override(self):
        resolved = merge_delta.merge(base_profile(), {"skills": ["Only"]})
        self.assertEqual(resolved["skills"], ["Only"])


class Validation(unittest.TestCase):
    def test_non_mapping_base_rejected(self):
        with self.assertRaises(ValueError):
            merge_delta.merge([1, 2, 3], {})

    def test_none_delta_is_identity(self):
        self.assertEqual(merge_delta.merge(base_profile(), None), base_profile())


if __name__ == "__main__":
    unittest.main()
