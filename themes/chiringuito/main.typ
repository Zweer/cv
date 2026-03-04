// =============================================================================
// Chiringuito CV — faithful recreation of the old HTML "professional" layout
// Usage: typst compile themes/chiringuito/main.typ --input person=nic --root . --font-path fonts/
// =============================================================================

#import "@preview/fontawesome:0.5.0": *

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Theme ---
#let accent = rgb("#7D203F")
#let grey = rgb("#666666")
#let light-grey = rgb("#b2b2b2")

// --- Page Setup ---
#set page(paper: "a4", margin: (left: 2.8cm, right: 1.5cm, top: 1.2cm, bottom: 1cm))
#set text(font: "Ubuntu", size: 9pt, fill: luma(30))
#set par(leading: 0.5em, spacing: 0.55em)
#show link: it => text(fill: luma(30), it)

// --- Components ---

// The signature colored bar to the left of headings
#let accent-bar(height: 14pt, body) = {
  grid(
    columns: (8pt, 8pt, 1fr),
    column-gutter: 0pt,
    place(left + top, dy: 1pt, rect(width: 8pt, height: height, fill: accent)),
    [],
    body,
  )
}

#let section-heading(title) = {
  v(0.5em)
  text(size: 12pt, weight: "bold", upper(title))
  v(-0.1em)
  line(length: 100%, stroke: 0.3pt + light-grey)
  v(0.15em)
}

#let badge(body, outlined: false) = {
  box(
    inset: (x: 5pt, y: 2.5pt),
    radius: 2pt,
    fill: if outlined { white } else { light-grey },
    stroke: if outlined { 0.5pt + light-grey } else { none },
    text(size: 8pt, fill: if outlined { luma(30) } else { white }, body),
  )
}

#let work-item(from, to, title, company, location, tasks) = {
  accent-bar(height: 12pt)[
    *#text(size: 9.5pt)[#title]*
  ]
  text(size: 9pt)[#company]
  h(0.5em)
  text(size: 8pt, style: "italic", fill: grey)[#from – #to · #location]
  linebreak()
  text(size: 8pt, fill: luma(60))[#tasks.join(" · ")]
  v(0.4em)
}

// =============================================================================
// DOCUMENT
// =============================================================================

// --- Header ---
#grid(
  columns: (auto, 1fr),
  column-gutter: 1.2em,
  align: top,
  // Photo with quirky border-radius (simulated with clipping)
  {
    box(width: 2.4cm, height: 2.4cm, radius: (top-left: 50%, top-right: 50%, bottom-right: 3pt, bottom-left: 50%), clip: true, stroke: 1.5pt + light-grey)[
      #image(img-path, width: 100%, height: 100%, fit: "cover")
    ]
  },
  {
    // Name with accent bar
    accent-bar(height: 18pt)[
      #text(size: 22pt, fill: accent, weight: "bold")[#cv.name #cv.surname]
    ]
    v(-0.1em)
    text(size: 12pt, fill: grey)[#cv.title]
    v(0.15em)
    text(size: 9.5pt, fill: luma(60))[#cv.abstract]
    v(0.3em)

    // Contact row
    set text(size: 7.5pt)
    [
      #fa-icon("envelope", fill: accent, size: 7pt) #link("mailto:" + cv.email)[#cv.email]
      #h(0.8em)
      #fa-icon("phone", fill: accent, size: 7pt) #cv.phone
      #h(0.8em)
      #fa-icon("location-dot", fill: accent, size: 7pt) #cv.location
      #h(0.8em)
      #fa-icon("linkedin", fill: accent, size: 7pt) #link(cv.links.linkedin)[#cv.links.linkedin.replace("https://www.linkedin.com/in/", "").trim("/")]
      #if "github" in cv.links [
        #h(0.8em) #fa-icon("github", fill: accent, size: 7pt) #link(cv.links.github)[#cv.links.github.replace("https://github.com/", "")]
      ]
    ]
  },
)

#v(0.3em)
#line(length: 100%, stroke: 1pt + light-grey)

// --- Two-column body ---
#grid(
  columns: (1fr, 4.8cm),
  column-gutter: 1.2em,

  // === LEFT: Experience + Education ===
  {
    section-heading(i18n.curriculum)
    for work in cv.works {
      work-item(work.from, work.to, work.title, work.structure, work.location, work.tasks)
    }

    section-heading(i18n.titles)
    for edu in cv.educations {
      accent-bar(height: 10pt)[
        *#edu.title*
      ]
      text(size: 8pt, fill: grey)[#edu.structure · #edu.location · #str(edu.to)]
      v(0.3em)
    }

    if "teachings" in cv {
      section-heading("Teaching")
      for teaching in cv.teachings {
        text(size: 8.5pt, weight: "bold")[#teaching.name]
        linebreak()
        text(size: 8pt, fill: luma(60))[#teaching.courses.join(" · ")]
        v(0.2em)
      }
    }
  },

  // === RIGHT: Skills, Languages, Projects, Interests ===
  {
    section-heading(i18n.skills)
    cv.skills.map(s => badge(s)).join(h(3pt) + v(1pt))

    section-heading(i18n.spoken_languages)
    for lang in cv.languages [
      *#upper(lang.name.first())#lang.name.slice(1)* \
      #text(size: 8pt, fill: grey)[#lang.level] \
    ]

    if "projects" in cv {
      section-heading(i18n.projects)
      for project in cv.projects {
        text(size: 8.5pt)[*#project.name* #text(fill: grey)[(#project.date)]]
        linebreak()
        text(size: 7.5pt, fill: luma(60))[#project.descriptions.join(" · ")]
        v(0.2em)
      }
    }

    if "interests" in cv {
      section-heading(i18n.hobbies)
      cv.interests.map(i => badge(i, outlined: true)).join(h(3pt) + v(1pt))
    }
  },
)

// --- GDPR ---
#v(1fr)
#align(center, text(size: 5.5pt, fill: grey)[#i18n.gdpr.])
