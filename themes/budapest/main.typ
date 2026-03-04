// =============================================================================
// Budapest CV — faithful recreation of the old HTML "budapest" layout
// Usage: typst compile themes/budapest/main.typ --input person=ro --root . --font-path fonts/
// =============================================================================

#import "@preview/fontawesome:0.5.0": *

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "ro")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Theme Colors (from the original CSS) ---
#let green = rgb("#3B9E80")
#let light-green = rgb("#F0FAF7")
#let dark-text = rgb("#646464")
#let light-grey = rgb("#BBBBBB")

// --- Fonts: Montserrat ≈ Oswald (titles), Roboto ≈ Lato (body) ---
#let title-font = "Montserrat"
#let body-font = "Roboto"

// --- Page Setup ---
#set page(paper: "a4", margin: 0pt)
#set text(font: body-font, size: 9pt, fill: dark-text)
#set par(leading: 0.45em, spacing: 0.5em)
#show link: it => text(fill: dark-text, it)

// --- Dimensions ---
#let sidebar-width = 6.2cm
#let page-height = 297mm

// --- Components ---

#let sidebar-heading(title) = {
  v(0.9em)
  text(font: title-font, size: 11pt, weight: "bold", upper(title))
  v(0.2em)
}

#let main-heading(title) = {
  v(0.8em)
  block(
    width: 100%,
    above: 0.6em,
    below: 0.4em,
    {
      text(font: title-font, size: 13pt, weight: "bold", upper(title))
      v(-0.2em)
      line(length: 100%, stroke: 0.5pt + dark-text)
    },
  )
}

// Timeline entry: left (structure/location/dates) + right (title/tasks) with dot+border
#let timeline-entry(structure, location, from, to, title, tasks, part-time: false, skills: none) = {
  block(breakable: false, above: 0.6em, below: 0.2em,
    grid(
      columns: (3.2cm, 1fr),
      column-gutter: 1em,
      // Left: metadata
      {
        text(font: title-font, size: 9pt, weight: "bold")[#structure]
        if part-time [ \ #text(size: 7.5pt, style: "italic")[Part time]]
        linebreak()
        text(size: 8pt, fill: dark-text)[#location]
        linebreak()
        text(size: 8pt, style: "italic", fill: luma(120))[#from – #to]
      },
      // Right: content with timeline dot + left border
      {
        // Dot
        place(left + top, dx: -0.65em, dy: 0.15em,
          circle(radius: 0.35em, fill: green),
        )
        // Left border
        block(inset: (left: 0.8em), stroke: (left: 1pt + green),
          {
            text(font: title-font, size: 10pt, weight: "bold")[#title]
            if tasks != none {
              v(0.15em)
              for task in tasks {
                text(size: 8pt)[• #task]
                linebreak()
              }
            }
            if skills != none {
              v(0.15em)
              skills.map(s =>
                box(
                  inset: (x: 4pt, y: 2pt),
                  radius: 2pt,
                  fill: luma(220),
                  text(size: 7pt)[#s],
                )
              ).join(h(3pt))
            }
          },
        )
      },
    ),
  )
}

// =============================================================================
// DOCUMENT
// =============================================================================

#grid(
  columns: (sidebar-width, 1fr),

  // === LEFT SIDEBAR ===
  block(width: 100%, height: page-height, fill: light-green, inset: (x: 0.8em, top: 1.5em, bottom: 1em))[
    // Photo
    #align(center)[
      #box(
        width: 4cm, height: 4cm, radius: 50%, clip: true,
        stroke: 2pt + green,
      )[
        #image(img-path, width: 100%, height: 100%, fit: "cover")
      ]
    ]

    // About me
    #sidebar-heading(i18n.who_am_i)
    #text(size: 8pt)[#cv.abstract]

    // Skills
    #sidebar-heading(i18n.skills)
    #for skill in cv.skills {
      box(
        inset: (x: 5pt, y: 2.5pt),
        radius: 2pt,
        fill: luma(180),
        text(size: 7.5pt, fill: white)[#skill],
      )
      h(3pt)
    }

    // Certifications
    #if cv.at("certifications", default: none) != none [
      #sidebar-heading(i18n.certifications)
      #for cert in cv.certifications [
        #text(size: 8pt)[• #cert] \
      ]
    ]

    // Languages
    #if cv.at("languages", default: none) != none [
      #sidebar-heading(i18n.spoken_languages)
      #for lang in cv.languages [
        #text(size: 8pt)[*#upper(lang.name.first())#lang.name.slice(1)* — #lang.level] \
      ]
    ]

    // Hobbies / Interests
    #{
      let hobbies = cv.at("hobbies", default: cv.at("interests", default: none))
      if hobbies != none {
        sidebar-heading(i18n.hobbies)
        for hobby in hobbies {
          box(
            inset: (x: 5pt, y: 2.5pt),
            radius: 2pt,
            stroke: 0.5pt + luma(180),
            text(size: 7.5pt)[#hobby],
          )
          h(3pt)
        }
      }
    }

    // Projects (if present, e.g. nic)
    #if cv.at("projects", default: none) != none [
      #sidebar-heading(i18n.projects)
      #for project in cv.projects [
        #text(size: 8pt, weight: "bold")[#project.name] #text(size: 7pt, fill: luma(120))[(#project.date)] \
        #text(size: 7.5pt, fill: luma(100))[#project.descriptions.join(" · ")] \
        #v(0.2em)
      ]
    ]
  ],

  // === RIGHT MAIN AREA ===
  block(width: 100%, height: page-height, inset: (x: 1.2em, top: 1.5em, bottom: 0.8em))[
    // Header: Name + Contacts
    #grid(
      columns: (1fr, auto),
      column-gutter: 1em,
      {
        text(font: title-font, size: 22pt, weight: "bold")[#cv.name \ #cv.surname]
        v(-0.1em)
        text(font: title-font, size: 10pt, weight: "bold", upper(cv.title))
      },
      {
        set text(size: 7.5pt)
        let items = ()
        if "email" in cv { items.push([#fa-icon("envelope", fill: green, size: 7pt) #link("mailto:" + cv.email)[#cv.email]]) }
        if "pec" in cv { items.push([#fa-icon("envelope", fill: green, size: 7pt) #link("mailto:" + cv.pec)[#cv.pec]]) }
        if "phone" in cv { items.push([#fa-icon("phone", fill: green, size: 7pt) #cv.phone]) }
        if "location" in cv { items.push([#fa-icon("location-dot", fill: green, size: 7pt) #cv.location]) }
        if "linkedin" in cv.links { items.push([#fa-icon("linkedin", fill: green, size: 7pt) #link(cv.links.linkedin)[#cv.links.linkedin.replace("https://www.linkedin.com/in/", "").trim("/")]]) }
        if "github" in cv.at("links", default: (:)) { items.push([#fa-icon("github", fill: green, size: 7pt) #link(cv.links.github)[#cv.links.github.replace("https://github.com/", "")]]) }
        items.join(linebreak())
      },
    )

    #v(0.3em)
    #line(length: 100%, stroke: 0.5pt + light-grey)

    // Work experience
    #main-heading(i18n.curriculum)
    #for work in cv.works {
      timeline-entry(
        work.structure,
        work.location,
        work.from,
        work.to,
        work.title,
        work.tasks,
        part-time: work.at("part-time", default: false),
        skills: work.at("skills", default: none),
      )
    }

    // Education
    #main-heading(i18n.titles)
    #for edu in cv.educations {
      timeline-entry(
        edu.structure,
        edu.location,
        edu.from,
        edu.to,
        edu.title,
        edu.at("tasks", default: none),
      )
    }

    // Teaching (if present, e.g. nic)
    #if cv.at("teachings", default: none) != none [
      #main-heading("Teaching")
      #for teaching in cv.teachings [
        #text(size: 9pt, weight: "bold")[#teaching.name] \
        #text(size: 8pt, fill: luma(100))[#teaching.courses.join(" · ")]
        #v(0.3em)
      ]
    ]

    // GDPR footer
    #v(1fr)
    #align(center, text(size: 5.5pt, fill: luma(140))[_#i18n.gdpr._])
  ],
)
