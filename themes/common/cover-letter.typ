// =============================================================================
// Shared cover-letter page
// =============================================================================
// Renders an optional cover letter as an extra page AFTER the CV, in a clean
// layout that every theme can share. A theme opts in with a single line at the
// end of its document:
//
//   #import "/themes/common/cover-letter.typ": cover-letter-page
//   #cover-letter-page(cv, i18n, accent: <theme-accent-color>)
//
// Degrades gracefully: when the person's data has no `cover_letter` key the
// function renders NOTHING (no page break, no blank page), so existing PDFs are
// byte-for-byte unchanged. The letter sets its own page geometry, so it looks
// the same whether the theme uses A4 margins or a full-bleed `margin: 0pt`
// layout.
//
// Expected data shape (all under the person's top-level `cover_letter:` key):
//
//   cover_letter:
//     recipient:
//       company: "Acme Corp"        # required
//       name: "Jane Doe"            # optional contact person
//       role: "Head of Engineering" # optional contact role
//     location: "Milan, Italy"      # optional, printed in the dateline
//     date: "2026-11-13"            # optional, printed as-is (already localised)
//     body:                          # required: a list of paragraph strings
//       - "First paragraph..."
//       - "Second paragraph..."
//     greeting: "Dear Jane Doe,"    # optional, overrides the i18n default
//     closing: "Kind regards,"      # optional, overrides the i18n default
//
// The i18n file supplies the default greeting/closing/subject wording so the
// letter speaks the person's own language without per-letter boilerplate.
// =============================================================================

// Build the greeting line. An explicit `greeting` wins; otherwise fall back to
// the i18n salutation plus the contact name when one is given.
#let _greeting(letter, i18n) = {
  if "greeting" in letter { return letter.greeting }
  let salutation = i18n.at("cover_letter_greeting", default: "Dear")
  let recipient = letter.at("recipient", default: (:))
  if "name" in recipient {
    salutation + " " + recipient.name + ","
  } else {
    // No named contact: a neutral "Dear Hiring Manager,"-style line.
    salutation + " " + i18n.at("cover_letter_hiring_manager", default: "Hiring Manager") + ","
  }
}

#let _closing(letter, i18n) = {
  letter.at("closing", default: i18n.at("cover_letter_closing", default: "Kind regards,"))
}

// Public: render the cover-letter page, or nothing when absent.
// `accent` lets each theme pass its own highlight colour so the letter matches.
#let cover-letter-page(cv, i18n, accent: rgb("#333333")) = {
  // Graceful no-op: no cover_letter, no page.
  let letter = cv.at("cover_letter", default: none)
  if letter == none { return }

  let recipient = letter.at("recipient", default: (:))

  // Start a fresh page with its own clean geometry, independent of the theme's
  // page setup (some themes use margin: 0pt for full-bleed sidebars).
  pagebreak(weak: true)
  set page(
    paper: "a4",
    margin: (top: 2.2cm, bottom: 2cm, left: 2.2cm, right: 2.2cm),
    // No themed footer here: a letter carries its own signature block instead.
    footer: none,
    header: none,
  )
  set text(size: 10.5pt, fill: luma(40))
  set par(leading: 0.65em, spacing: 1em, justify: true)

  // --- Sender block (top-right): name + contacts, pulled from the CV data ---
  align(right)[
    #text(weight: "bold", fill: accent, size: 12pt)[#cv.name #cv.surname] \
    #set text(size: 9pt, fill: luma(90))
    #if "email" in cv [ #cv.email \ ]
    #if "phone" in cv [ #cv.phone \ ]
    #if "location" in cv [ #cv.location ]
  ]

  v(1.2em)

  // --- Recipient block (left) ---
  if "company" in recipient {
    text(weight: "bold")[#recipient.company]
    if "name" in recipient { linebreak(); recipient.name }
    if "role" in recipient { linebreak(); text(fill: luma(90))[#recipient.role] }
  }

  // --- Dateline (location + date), right-aligned under the sender ---
  if "location" in letter or "date" in letter {
    v(0.6em)
    align(right)[
      #let parts = ()
      #let _ = if "location" in letter { parts.push(letter.location) }
      #let _ = if "date" in letter { parts.push(letter.date) }
      #parts.join(", ")
    ]
  }

  v(1.2em)

  // --- Greeting ---
  _greeting(letter, i18n)

  v(0.4em)

  // --- Body paragraphs ---
  for paragraph in letter.at("body", default: ()) {
    par(paragraph)
  }

  v(1em)

  // --- Closing + signature ---
  _closing(letter, i18n)
  linebreak()
  v(0.3em)
  text(weight: "bold")[#cv.name #cv.surname]
}
