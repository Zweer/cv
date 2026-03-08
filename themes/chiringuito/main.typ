// =============================================================================
// Chiringuito CV — Typst port of the original Jekyll/Bootstrap "professional" layout
// Usage: typst compile themes/chiringuito/main.typ --input person=nic --root . --font-path fonts/
// =============================================================================

#import "@preview/fontawesome:0.5.0": *

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Theme colors (from professional.scss) ---
#let accent = rgb("#7D203F")
#let grey-text = rgb("#666666")
#let grey-bar = rgb("#b2b2b2")

// --- Dimensions ---
#let bar-width = 8pt
#let bar-gap = 8pt
#let left-indent = bar-width + bar-gap
#let photo-size = 2.5cm

// --- Page Setup (A4, Bootstrap-like margins) ---
#set page(paper: "a4", margin: (left: 1.8cm, right: 1.5cm, top: 1.5cm, bottom: 0.8cm))
#set text(font: "Ubuntu", size: 8.5pt, fill: luma(30))
#set par(leading: 0.4em, spacing: 0.35em)
#show link: it => text(fill: luma(30), it)

// --- Components ---

// Accent bar placed to the left of content
#let with-bar(color: grey-bar, height: 12pt, dy: 2pt, body) = {
  block(inset: (left: left-indent), {
    place(left + top, dx: -left-indent, dy: dy,
      rect(width: bar-width, height: height, fill: color),
    )
    body
  })
}

// Section heading: bold uppercase + thin line
#let section-heading(title) = {
  v(0.5em)
  text(size: 10pt, weight: "bold", tracking: 0.02em, upper(title))
  v(-0.05em)
  line(length: 100%, stroke: 0.3pt + grey-bar)
  v(0.2em)
}

// Work entry
#let work-entry(position, company, from, to, content, is-description: false) = {
  with-bar(height: 12pt, dy: 1pt)[
    #text(size: 9.5pt, weight: "bold")[#position]
  ]
  text(size: 8.5pt)[#company]
  linebreak()
  text(size: 8pt, style: "italic", fill: grey-text)[#from - #to]
  v(0.05em)
  if is-description {
    pad(left: 4pt, text(size: 8pt, fill: luma(60))[#content])
  } else {
    pad(left: 4pt,
      for task in content [
        #text(size: 8pt, fill: luma(60))[• #task] \
      ]
    )
  }
  v(0.35em)
}

// Badge
#let skill-badge(body) = {
  box(
    inset: (x: 6pt, y: 3pt),
    radius: 3pt,
    fill: grey-bar,
    text(size: 8.5pt, fill: white, body),
  )
}

#let interest-badge(body) = {
  box(
    inset: (x: 6pt, y: 3pt),
    radius: 3pt,
    stroke: 1pt + grey-bar,
    text(size: 8.5pt, body),
  )
}

// =============================================================================
// HEADER
// =============================================================================

#grid(
  columns: (1fr, auto, 1fr),
  column-gutter: 0.6em,
  align: (left + top, center + top, right + top),

  // Left: Name (with accent bar) + title + abstract
  pad(left: left-indent, {
    place(left + top, dx: -left-indent, dy: 3pt,
      rect(width: bar-width, height: 42pt, fill: accent),
    )
    text(size: 22pt, weight: "bold", fill: accent)[#cv.name]
    linebreak()
    text(size: 22pt, weight: "bold", fill: accent)[#cv.surname]
    v(0.15em)
    text(size: 13pt, fill: grey-text)[#cv.title]
    v(0.2em)
    text(size: 10pt, fill: luma(60))[#cv.abstract]
  }),

  // Center: Photo
  box(
    width: photo-size, height: photo-size,
    radius: (top-left: 50%, top-right: 50%, bottom-right: 5pt, bottom-left: 50%),
    clip: true,
    stroke: 2pt + grey-bar,
  )[
    #image(img-path, width: 100%, height: 100%, fit: "cover")
  ],

  // Right: Contacts (icon after text)
  {
    set text(size: 8.5pt)
    let icon-gap = 3pt
    if "email" in cv [
      #link("mailto:" + cv.email)[#cv.email] #h(icon-gap) #fa-icon("envelope", fill: accent, size: 8pt) \
    ]
    if "phone" in cv [
      #cv.phone #h(icon-gap) #fa-icon("mobile-screen-button", fill: accent, size: 8pt) \
    ]
    v(0.1em)
    if "location" in cv [
      #cv.location #h(icon-gap) #fa-icon("location-dot", fill: accent, size: 8pt) \
    ]
    v(0.1em)
    if "linkedin" in cv.links [
      #link(cv.links.linkedin)[linkedin.com/in/#cv.links.linkedin.replace("https://www.linkedin.com/in/", "").trim("/")/] #h(icon-gap) #fa-icon("linkedin", fill: accent, size: 8pt) \
    ]
    v(0.1em)
    if "github" in cv.at("links", default: (:)) [
      #link(cv.links.github)[github.com/#cv.links.github.replace("https://github.com/", "")] #h(icon-gap) #fa-icon("github", fill: accent, size: 8pt)
    ]
  },
)

#v(0.5em)
#line(length: 100%, stroke: 1pt + grey-bar)
#v(0.3em)

// =============================================================================
// BODY: Two columns (8/12 + 4/12 ≈ 67% + 33%)
// =============================================================================

#grid(
  columns: (2fr, 0.85fr),
  column-gutter: 1.2em,

  // === LEFT: Work Experience ===
  {
    section-heading("Work Experience")
    for work in cv.works {
      let has-desc = work.at("description", default: none) != none
      if has-desc {
        work-entry(work.title, work.structure, work.from, work.to, work.description, is-description: true)
      } else {
        work-entry(work.title, work.structure, work.from, work.to, work.tasks)
      }
    }
  },

  // === RIGHT: Skills, Projects, Education, Teaching, Interests ===
  {
    // Skills
    section-heading("Skills")
    cv.skills.map(s => skill-badge(s)).join(h(3pt))

    // Projects
    if "projects" in cv {
      section-heading("Projects")
      for project in cv.projects {
        text(size: 8.5pt, weight: "bold")[#project.name ]
        text(size: 8.5pt, fill: grey-text)[(#project.date)]
        linebreak()
        pad(left: 4pt, {
          // First description with 🎉
          text(size: 7.5pt, fill: luma(60))[🎉 #project.descriptions.first()]
          linebreak()
          for desc in project.descriptions.slice(1) [
            #text(size: 7.5pt, fill: luma(60))[• #desc] \
          ]
        })
        v(0.2em)
      }
    }

    // Education
    section-heading("Education")
    for edu in cv.educations {
      text(size: 9pt, weight: "bold")[#edu.title]
      linebreak()
      text(size: 8pt)[#edu.structure]
      linebreak()
      text(size: 8pt, style: "italic", fill: grey-text)[#str(edu.to)]
      v(0.2em)
    }

    // Teaching
    if "teachings" in cv {
      section-heading("Teaching Experience")
      for teaching in cv.teachings {
        text(size: 8.5pt, weight: "bold")[#teaching.name]
        linebreak()
        pad(left: 4pt,
          for course in teaching.courses [
            #text(size: 7.5pt, fill: luma(60))[• #course] \
          ]
        )
        v(0.15em)
      }
    }

    // Interests
    if "interests" in cv {
      section-heading("Interests")
      cv.interests.map(i => interest-badge(i)).join(h(3pt))
    }
  },
)

// --- GDPR ---
#v(1fr)
#align(center, text(size: 5pt, fill: grey-text, style: "italic")[#i18n.gdpr])
