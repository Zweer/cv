import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeId } from "../src/commands/detail.ts";
import { extractDivContent, minutesToTPR, parseJobCards, parseJobDetail } from "../src/helpers.ts";

// Minimal search-card markup: parseJobCards splits on the job-posting URN and
// needs an id, a base-search-card__title, and a full-link. Everything else is
// optional. We inject HTML entities into the title/company to exercise decoding.
function searchCard(id: string, title: string, company = "Acme"): string {
  return `<li>
    <div data-entity-urn="urn:li:jobPosting:${id}">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/${id}"></a>
      <h3 class="base-search-card__title">${title}</h3>
      <h4 class="base-search-card__subtitle"><a href="https://www.linkedin.com/company/acme">${company}</a></h4>
    </div>
  </li>`;
}

// The /scrape contract fields beyond title/company. The original fixture had
// no <time> or location element at all, so deleting the date extraction from
// parseJobCards left every test green (review finding F35, 2026-08-19).
function searchCardWithMeta(
  id: string,
  datetimeAttr: string,
  listdateClass = "job-search-card__listdate",
): string {
  return `<li>
    <div data-entity-urn="urn:li:jobPosting:${id}">
      <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/${id}"></a>
      <h3 class="base-search-card__title">Data Engineer</h3>
      <h4 class="base-search-card__subtitle"><a href="https://www.linkedin.com/company/acme">Acme</a></h4>
      <span class="job-search-card__location">Copenhagen, Denmark</span>
      <time class="${listdateClass}" datetime="${datetimeAttr}">3 days ago</time>
    </div>
  </li>`;
}

describe("parseJobCards contract fields", () => {
  test("extracts date from the listdate <time> element", () => {
    const [card] = parseJobCards(searchCardWithMeta("200", "2026-08-10"));
    assert.equal(card.date, "2026-08-10");
  });

  test("extracts date from the listdate--new variant class", () => {
    const [card] = parseJobCards(searchCardWithMeta("201", "2026-08-15", "job-search-card__listdate--new"));
    assert.equal(card.date, "2026-08-15");
  });

  test("extracts location from the location span", () => {
    const [card] = parseJobCards(searchCardWithMeta("202", "2026-08-10"));
    assert.equal(card.location, "Copenhagen, Denmark");
  });

  test("date and location are null when the elements are absent", () => {
    const [card] = parseJobCards(searchCard("203", "Bare Card"));
    assert.equal(card.date, null);
    assert.equal(card.location, null);
  });
});

describe("decodeHtmlEntities (via parseJobCards)", () => {
  test("decodes hexadecimal numeric entities (&#xE9;)", () => {
    const [card] = parseJobCards(searchCard("123", "Caf&#xE9; Manager"));
    assert.equal(card.title, "Café Manager");
  });

  test("decodes uppercase-X hexadecimal entities (&#X...;)", () => {
    const [card] = parseJobCards(searchCard("124", "Deb&#XFC;t Role")); // &#XFC; = ü
    assert.equal(card.title, "Debüt Role");
  });

  test("still decodes decimal numeric entities (&#233;) — regression", () => {
    const [card] = parseJobCards(searchCard("125", "Caf&#233; Lead"));
    assert.equal(card.title, "Café Lead");
  });

  test("decodes supplementary-plane code points with fromCodePoint (&#128512;)", () => {
    const [card] = parseJobCards(searchCard("126", "Growth &#128512;"));
    assert.equal(card.title, "Growth 😀");
  });

  test("decodes hex supplementary-plane code points (&#x1F600;)", () => {
    const [card] = parseJobCards(searchCard("127", "Growth &#x1F600;"));
    assert.equal(card.title, "Growth 😀");
  });

  test("decodes hex entities in the company subtitle too", () => {
    const [card] = parseJobCards(searchCard("128", "Engineer", "N&#xF8;rrebro ApS"));
    assert.equal(card.company, "Nørrebro ApS");
  });
});

describe("parseJobDetail active-status detection", () => {
  const closedBanner = `
    <figure class="closed-job closed-job__flavor topcard__flavor-row">
      <span class="closed-job__icon closed-job__icon--error-pebble lazy-load"></span>
      <figcaption class="closed-job__flavor--closed">No longer accepting applications</figcaption>
    </figure>`;

  const page = (topcardExtra: string, description: string) => `
    <h1 class="topcard__title">Data Engineer</h1>
    <span class="topcard__flavor topcard__flavor--bullet">Berlin</span>
    ${topcardExtra}
    <div class="show-more-less-html__markup">${description}</div>`;

  test("a closed posting's top-card banner yields isActive: false", () => {
    const job = parseJobDetail(page(closedBanner, "We build things."), "1");
    assert.equal(job.isActive, false);
  });

  test("an open posting yields isActive: true", () => {
    const job = parseJobDetail(page("", "We are hiring!"), "2");
    assert.equal(job.isActive, true);
  });

  test("recruiter boilerplate in the description does not flag a live posting", () => {
    const job = parseJobDetail(
      page("", "Apply soon - once filled, this posting is no longer accepting applications."),
      "3",
    );
    assert.equal(job.isActive, true);
  });

  test("a closed-job class named in the description does not flag a live posting", () => {
    const job = parseJobDetail(page("", "Our design system documents a closed-job__flavor CSS class."), "4");
    assert.equal(job.isActive, true);
  });
});

describe("parseJobDetail dropped fields", () => {
  test("emits no applyUrl field", () => {
    const job = parseJobDetail("<html></html>", "1");
    assert.equal("applyUrl" in job, false);
  });
});

describe("decodeHtmlEntities (via parseJobDetail)", () => {
  test("decodes hex entities inside the job title", () => {
    const html = `<h1 class="topcard__title">Se&#xF1;or Engineer</h1>`;
    const job = parseJobDetail(html, "999");
    assert.equal(job.title, "Señor Engineer");
  });
});

describe("extractDivContent", () => {
  test("extracts content from simple div", () => {
    const html = '<div class="description__text">Simple text</div>';
    assert.equal(extractDivContent(html, "description__text"), "Simple text");
  });

  test("extracts content with nested divs — the regression case", () => {
    const html = `<div class="description__text">
      <div>Requirements:</div>
      <ul><li>Skill A</li></ul>
      <div>About Us:</div>
      <p>We are...</p>
    </div>`;
    assert.equal(
      extractDivContent(html, "description__text"),
      "\n      <div>Requirements:</div>\n      <ul><li>Skill A</li></ul>\n      <div>About Us:</div>\n      <p>We are...</p>\n    ",
    );
  });

  test("returns null when class not found", () => {
    assert.equal(extractDivContent("<div>no class</div>", "nonexistent"), null);
  });

  test("works with show-more-less-html__markup class", () => {
    const html = '<div class="show-more-less-html__markup">LinkedIn content</div>';
    assert.equal(extractDivContent(html, "show-more-less-html__markup"), "LinkedIn content");
  });

  test("handles deeply nested divs (3 levels)", () => {
    const html = `<div class="description__text">
      <div>
        <div>Deep content</div>
      </div>
    </div>`;
    assert.equal(
      extractDivContent(html, "description__text"),
      "\n      <div>\n        <div>Deep content</div>\n      </div>\n    ",
    );
  });

  test("handles empty content", () => {
    const html = '<div class="description__text"></div>';
    assert.equal(extractDivContent(html, "description__text"), "");
  });

  test("parseJobDetail uses extractDivContent and preserves full description", () => {
    const html = `<div class="description__text">
      <div>Requirements:</div>
      <ul><li>5 years Python</li></ul>
      <div>About Us:</div>
      <p>We are hiring!</p>
    </div>`;
    const job = parseJobDetail(html, "999");
    assert.ok(job.description?.includes("Requirements:"));
    assert.ok(job.description?.includes("5 years Python"));
    assert.ok(job.description?.includes("About Us:"));
    assert.ok(job.description?.includes("We are hiring!"));
  });
});

describe("minutesToTPR", () => {
  test("converts minutes to an f_TPR seconds window", () => {
    assert.equal(minutesToTPR(30), "r1800");
    assert.equal(minutesToTPR(1), "r60");
    assert.equal(minutesToTPR(1440), "r86400"); // matches jobageToTPR(1)
  });

  test("returns null for non-positive input", () => {
    assert.equal(minutesToTPR(0), null);
    assert.equal(minutesToTPR(-5), null);
  });
});

describe("normalizeId", () => {
  test("extracts ID from raw numeric string", () => {
    assert.equal(normalizeId("1234567890"), "1234567890");
  });

  test("extracts ID from URN", () => {
    assert.equal(normalizeId("urn:li:jobPosting:1234567890"), "1234567890");
  });

  test("extracts ID from simple job view URL without trailing slash", () => {
    assert.equal(normalizeId("https://www.linkedin.com/jobs/view/1234567890"), "1234567890");
  });

  test("extracts ID from simple job view URL with trailing slash", () => {
    assert.equal(normalizeId("https://www.linkedin.com/jobs/view/1234567890/"), "1234567890");
  });

  test("extracts ID from simple job view URL with query parameter", () => {
    assert.equal(normalizeId("https://www.linkedin.com/jobs/view/1234567890?refId=abc"), "1234567890");
  });

  test("extracts ID from simple job view URL with trailing slash and query parameter", () => {
    assert.equal(normalizeId("https://www.linkedin.com/jobs/view/1234567890/?refId=abc"), "1234567890");
  });

  test("extracts ID from slug URL without trailing slash", () => {
    assert.equal(
      normalizeId("https://www.linkedin.com/jobs/view/software-engineer-1234567890"),
      "1234567890",
    );
  });

  test("extracts ID from slug URL with trailing slash", () => {
    assert.equal(
      normalizeId("https://www.linkedin.com/jobs/view/software-engineer-1234567890/"),
      "1234567890",
    );
  });

  test("extracts ID from slug URL with trailing slash and tracking query params", () => {
    assert.equal(
      normalizeId(
        "https://www.linkedin.com/jobs/view/software-engineer-at-company-1234567890/?trackingId=xyz&refId=123",
      ),
      "1234567890",
    );
  });

  test("extracts ID from regional subdomain LinkedIn URL with trailing slash", () => {
    assert.equal(normalizeId("https://dk.linkedin.com/jobs/view/data-scientist-9876543210/"), "9876543210");
  });

  test("accepts a scheme-less linkedin.com job URL and a bare title slug", () => {
    assert.equal(normalizeId("www.linkedin.com/jobs/view/1234567890"), "1234567890");
    assert.equal(normalizeId("software-engineer-1234567890"), "1234567890");
  });

  test("rejects a job URL on any other host instead of extracting its digits", () => {
    assert.equal(normalizeId("https://boards.greenhouse.io/acme/jobs/4567890"), null);
    assert.equal(normalizeId("https://jobs.lever.co/acme/1234567"), null);
    assert.equal(normalizeId("https://example.com/jobs/view/1234567890"), null);
  });

  test("rejects look-alike and userinfo hosts", () => {
    assert.equal(normalizeId("https://linkedin.com.evil.io/jobs/view/1234567890"), null);
    assert.equal(normalizeId("https://notlinkedin.com/jobs/view/1234567890"), null);
    assert.equal(normalizeId("https://www.linkedin.com@evil.io/jobs/view/1234567890"), null);
  });

  test("rejects a linkedin.com URL that is not a job view", () => {
    assert.equal(normalizeId("https://www.linkedin.com/in/someone-1234567890/"), null);
    assert.equal(normalizeId("https://www.linkedin.com/jobs/search/?currentJobId=1234567890"), null);
  });

  test("returns null for non-job URLs and invalid strings", () => {
    assert.equal(normalizeId("https://www.linkedin.com/feed/"), null);
    assert.equal(normalizeId("not-a-url"), null);
    assert.equal(normalizeId("12345"), null); // fewer than 6 digits
    assert.equal(normalizeId(""), null);
  });
});
