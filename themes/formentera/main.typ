// =============================================================================
// Formentera CV — chiringuito header + budapest timeline + new-hipster split
// Usage: typst compile themes/formentera/main.typ --input person=nic --root . --font-path fonts/
// =============================================================================

#import "@preview/fontawesome:0.5.0": *

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Colors ---
#let accent = rgb("#2B6B5A")
#let light-accent = accent.lighten(90%)
#let grey = rgb("#666666")
#let light-line = rgb("#CCCCCC")

// --- Fonts ---
#let heading-font = "Montserrat"
#let body-font = "Roboto"

// --- Page ---
#set page(paper: "a4", margin: (top: 1.4cm, bottom: 1cm, left: 1.6cm, right: 1.6cm))
#set text(font: body-font, size: 10pt, fill: luma(40))
#set par(leading: 0.5em, spacing: 0.55em)
#show link: it => text(fill: luma(40), it)

// --- Components ---

#let section-title(title) = {
  v(0.7em)
  text(font: heading-font, size: 12pt, weight: "bold", fill: accent, tracking: 0.03em, upper(title))
  v(-0.1em)
  line(length: 100%, stroke: 0.4pt + light-line)
  v(0.3em)
}

#let sidebar-section(title) = {
  v(0.8em)
  text(font: heading-font, size: 10pt, weight: "bold", fill: accent, tracking: 0.03em, upper(title))
  v(-0.05em)
  line(length: 100%, stroke: 0.3pt + light-line)
  v(0.3em)
}

// Resumé entry: narrative description with timeline dot
#let resume-entry(title, company, location, from, to, description) = {
  block(above: 0.5em, below: 0.3em, inset: (left: 0.8em), stroke: (left: 1pt + accent), {
    place(left + top, dx: -0.95em, dy: 0.15em, circle(radius: 0.3em, fill: accent))
    text(font: heading-font, size: 10pt, weight: "bold")[#title]
    h(0.4em)
    text(size: 8pt, fill: grey)[#from – #to]
    linebreak()
    text(size: 9pt, smallcaps(company))
    h(0.3em)
    text(size: 8pt, fill: grey)[#fa-icon("location-dot", size: 7pt) #location]
    v(0.2em)
    text(size: 8.5pt, fill: luma(60))[#description]
  })
}

// Curriculum entry: compact with bullet tasks
#let curriculum-entry(title, company, from, to, tasks) = {
  block(above: 0.3em, below: 0.1em, inset: (left: 0.8em), stroke: (left: 0.5pt + light-line), {
    text(font: heading-font, size: 9pt, weight: "bold")[#title]
    h(0.3em)
    text(size: 8pt, fill: grey)[#from – #to]
    linebreak()
    text(size: 8.5pt)[#company]
    v(0.1em)
    for task in tasks {
      text(size: 8pt, fill: luma(60))[• #task]
      linebreak()
    }
  })
}

// Helper: find worksDetailed description for a work entry
#let find-detail(work) = {
  work.at("description", default: work.tasks.join(". ") + ".")
}

// =============================================================================
// HEADER (chiringuito style)
// =============================================================================

#let photo-size = 2.8cm

#grid(
  columns: (1fr, auto, 1fr),
  column-gutter: 0.8em,
  align: (left + top, center + top, right + top),

  // Left: name + title + abstract
  {
    text(font: heading-font, size: 20pt, weight: "bold", fill: accent)[#cv.name]
    linebreak()
    text(font: heading-font, size: 20pt, weight: "bold", fill: accent)[#cv.surname]
    v(0.1em)
    text(font: heading-font, size: 10pt, fill: grey)[#cv.title]
    v(0.15em)
    text(size: 8pt, style: "italic", fill: luma(100))[#cv.abstract]
  },

  // Center: photo
  box(
    width: photo-size, height: photo-size,
    radius: (top-left: 50%, top-right: 50%, bottom-right: 4pt, bottom-left: 50%),
    clip: true, stroke: 1.5pt + accent,
  )[#image(img-path, width: 100%, height: 100%, fit: "cover")],

  // Right: contacts
  {
    set text(size: 8pt)
    let icon(name) = fa-icon(name, fill: accent, size: 7pt)
    if "email" in cv [#link("mailto:" + cv.email)[#cv.email] #h(2pt) #icon("envelope") \ ]
    if "phone" in cv [#cv.phone #h(2pt) #icon("phone") \ ]
    v(0.15em)
    if "location" in cv [#cv.location #h(2pt) #icon("location-dot") \ ]
    v(0.15em)
    if "linkedin" in cv.links [#link(cv.links.linkedin)[#cv.links.linkedin.replace("https://www.linkedin.com/in/", "").trim("/")] #h(2pt) #icon("linkedin") \ ]
    v(0.15em)
    if "github" in cv.at("links", default: (:)) [#link(cv.links.github)[#cv.links.github.replace("https://github.com/", "")] #h(2pt) #icon("github")]
  },
)

#v(0.3em)
#line(length: 100%, stroke: 0.5pt + light-line)

// =============================================================================
// BODY: Sidebar + Main
// =============================================================================

#let sidebar-width = 4.8cm

#grid(
  columns: (sidebar-width, 1fr),
  column-gutter: 1em,

  // === SIDEBAR ===
  {
    // Skills
    sidebar-section(i18n.skills)
    for skill in cv.skills {
      box(inset: (x: 5pt, y: 2pt), radius: 2pt, fill: light-accent,
        text(size: 7.5pt, fill: accent.darken(20%))[#skill])
      h(2pt)
    }

    // Languages
    sidebar-section(i18n.spoken_languages)
    for lang in cv.languages {
      text(size: 8pt)[*#upper(lang.name.first())#lang.name.slice(1)* — #lang.level]
      linebreak()
    }

    // Education
    sidebar-section(i18n.titles)
    for edu in cv.educations {
      text(size: 8pt, weight: "bold")[#edu.title]
      linebreak()
      text(size: 7.5pt)[#edu.structure]
      linebreak()
      text(size: 7pt, fill: grey)[#str(edu.from) – #str(edu.to)]
      v(0.3em)
    }

    // Teaching
    if cv.at("teachings", default: none) != none {
      sidebar-section("Teaching")
      for teaching in cv.teachings {
        text(size: 8pt, weight: "bold")[#teaching.name]
        linebreak()
        text(size: 7pt, fill: luma(80))[#teaching.courses.join(" · ")]
        v(0.2em)
      }
    }

    // Projects
    if cv.at("projects", default: none) != none {
      sidebar-section(i18n.projects)
      for project in cv.projects {
        text(size: 8pt, weight: "bold")[#project.name]
        h(0.2em)
        text(size: 7pt, fill: grey)[(#project.date)]
        linebreak()
        text(size: 7pt, fill: luma(80))[#project.descriptions.join(" · ")]
        v(0.2em)
      }
    }

    // Interests / Hobbies
    {
      let items = cv.at("interests", default: cv.at("hobbies", default: none))
      if items != none {
        sidebar-section(i18n.hobbies)
        items.map(i =>
          box(inset: (x: 4pt, y: 2pt), radius: 2pt, stroke: 0.4pt + light-line,
            text(size: 7pt)[#i])
        ).join(h(2pt))
      }
    }
  },

  // === MAIN ===
  {
    // Resumé: detailed entries
    section-title(i18n.resume)
    {
      let resume-works = cv.works.filter(w => w.at("resume", default: false) == true)
      for work in resume-works {
        resume-entry(work.title, work.structure, work.location, work.from, work.to, find-detail(work))
      }
    }

    // Curriculum: compact entries
    {
      let other-works = cv.works.filter(w => w.at("resume", default: false) == false)
      for work in other-works {
        curriculum-entry(work.title, work.structure, work.from, work.to, work.tasks)
      }
    }
  },
)

// --- GDPR ---
#v(1fr)
#align(center, text(size: 5pt, fill: luma(140), style: "italic")[#i18n.gdpr])
