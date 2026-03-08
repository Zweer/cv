// =============================================================================
// New Hipster CV — Typst version
// Usage: typst compile themes/new-hipster/main.typ --input person=nic
// =============================================================================

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Color Variants ---
#let variants = (
  pastel-red: (
    header: rgb("#75233E"),
    header-text: white,
    sidebar: rgb("#75233E").lighten(80%),
    text: rgb("#646464"),
    university: rgb("#2EB6E1"),
    location: rgb("#E1592E"),
  ),
  pastel-green: (
    header: rgb("#3B9E80").lighten(70%),
    header-text: rgb("#646464"),
    sidebar: rgb("#3B9E80").lighten(90%),
    text: rgb("#646464"),
    university: rgb("#2EB6E1"),
    location: rgb("#E1592E"),
  ),
  light-metal: (
    header: rgb("#404040"),
    header-text: white,
    sidebar: rgb("#E6E6E6"),
    text: black,
    university: rgb("#2EB6E1"),
    location: rgb("#E1592E"),
  ),
  dark-metal: (
    header: rgb("#1A1A1A"),
    header-text: white,
    sidebar: rgb("#404040"),
    text: white,
    university: rgb("#2EB6E1"),
    location: rgb("#E1592E"),
  ),
  all-black: (
    header: rgb("#1A1A1A"),
    header-text: white,
    sidebar: white,
    text: black,
    university: rgb("#2EB6E1"),
    location: rgb("#E1592E"),
  ),
  grey: (
    header: rgb("#808080"),
    header-text: white,
    sidebar: white,
    text: black,
    university: rgb("#2EB6E1"),
    location: rgb("#E1592E"),
  ),
)
#let theme = variants.at(cv.variant)

// --- Sidebar text color: use theme.text unless dark background ---
#let sidebar-text = if cv.variant == "dark-metal" { white } else { theme.text }

// --- Page Setup ---
#set page(paper: "a4", margin: 0pt)
#set text(font: "Raleway", size: 10pt, fill: theme.text)
#set par(leading: 0.5em)

// --- Dimensions ---
#let header-height = 3cm
#let sidebar-width = 7.8cm
#let body-height = 297mm - header-height

// --- Section Heading ---
#let side-section(title) = {
  v(0.8em)
  text(size: 12pt, tracking: 0.05em, upper(title))
  v(-0.3em)
  line(length: 100%, stroke: 0.5pt + sidebar-text)
  v(0.3em)
}

#let main-section(title) = {
  v(0.6em)
  text(size: 13pt, fill: theme.text, tracking: 0.05em, upper(title))
  v(-0.3em)
  line(length: 100%, stroke: 0.5pt + theme.text)
  v(0.3em)
}

// --- CV Event (work experience) ---
#let cv-event(from, to, title, company, location, content, is-description: false) = {
  grid(
    columns: (2.8cm, 1fr),
    column-gutter: 0.6em,
    align(right, text(size: 8pt)[#from -- #to]),
    [
      *#title* \
      #text(size: 8pt, smallcaps(company))
      #h(0.3em)
      #text(size: 8pt, fill: theme.location)[📍 #location] \
      #if is-description {
        text(size: 8pt, fill: luma(80))[#content]
      } else {
        text(size: 8pt, fill: luma(80))[#content.join([ · ])]
      }
    ],
  )
  v(0.6em)
}

// --- CV Degree (education) ---
#let cv-degree(year, title, location, structure) = {
  grid(
    columns: (2.8cm, 1fr),
    column-gutter: 0.6em,
    align(right, text(size: 8pt)[#year]),
    [
      *#title* \
      #text(size: 8pt)[#structure]
      #h(0.3em)
      #text(size: 8pt, fill: theme.university)[🎓 #location]
    ],
  )
}

// =============================================================================
// DOCUMENT
// =============================================================================

// --- Header ---
#stack(dir: ttb, spacing: 0pt,
block(width: 100%, height: header-height, fill: theme.header, inset: (x: 1.5em))[
  #align(center + horizon)[
    #text(fill: theme.header-text, size: 24pt, tracking: 0.05em)[
      #cv.name #strong(cv.surname)
    ]
    #linebreak()
    #text(fill: theme.header-text, size: 11pt)[#cv.title]
  ]
],

// --- Body: Sidebar + Main ---
grid(
  columns: (sidebar-width, 1fr),
  // === LEFT SIDEBAR ===
  block(width: 100%, height: body-height, fill: theme.sidebar, inset: (x: 1em, top: 0.3em, bottom: 1em))[
    #set text(fill: sidebar-text)

    // Photo
    #align(center)[
      #box(width: 3.4cm, height: 3.4cm, radius: 50%, clip: true)[
        #image(img-path, width: 100%, height: 100%, fit: "cover")
      ]
    ]

    // Who am I
    #side-section(i18n.who_am_i)
    #text(size: 9pt)[#cv.abstract]

    // Contacts
    #side-section(i18n.contacts)
    #set text(size: 8pt)
    #link("mailto:" + cv.email)[✉ #cv.email] \
    ☎ #cv.phone \
    📍 #cv.location \
    #link(cv.links.linkedin)[🔗 #cv.links.linkedin.replace("https://www.", "")]

    // Personal Info
    #side-section(i18n.personal_info)
    #set text(size: 9pt)
    #i18n.citizenship: *#upper(cv.citizenship.first())#cv.citizenship.slice(1)* \
    #i18n.spoken_languages:
    #for lang in cv.languages [
      - #upper(lang.name.first())#lang.name.slice(1) (#lang.level)
    ]

    // Skills
    #side-section(i18n.skills)
    #set text(size: 8pt)
    #for skill in cv.skills [
      - #skill
    ]

    // Certifications
    #if cv.at("certifications", default: none) != none [
      #side-section(i18n.certifications)
      #set text(size: 8pt)
      #for cert in cv.certifications [
        - #cert
      ]
    ]

    // Hobbies
    #if cv.at("hobbies", default: none) != none [
      #side-section(i18n.hobbies)
      #set text(size: 8pt)
      #for hobby in cv.hobbies [
        - #hobby
      ]
    ]

    // Projects
    #if cv.at("projects", default: none) != none [
      #side-section(i18n.projects)
      #for project in cv.projects [
        #text(size: 9pt)[*#project.name* (#project.date)]
        #set text(size: 8pt)
        #for desc in project.descriptions [
          - #desc
        ]
      ]
    ]
  ],

  // === RIGHT MAIN COLUMN ===
  block(width: 100%, height: body-height, inset: (x: 1.2em, top: 1em, bottom: 0.8em))[
    // Resumé (selected works)
    #main-section(i18n.resume)
    #{
      let resume = cv.works.filter(w => w.at("resume", default: false) == true)
      for work in resume {
        let has-desc = work.at("description", default: none) != none
        if has-desc {
          cv-event(work.from, work.to, work.title, work.structure, work.location, work.description, is-description: true)
        } else {
          cv-event(work.from, work.to, work.title, work.structure, work.location, work.tasks)
        }
      }
    }

    // Education
    #main-section(i18n.titles)
    #{
      for edu in cv.educations {
        cv-degree(str(edu.to), edu.title, edu.location, edu.structure)
      }
    }

    // Curriculum (other works)
    #main-section(i18n.curriculum)
    #{
      let curriculum = cv.works.filter(w => w.at("resume", default: false) == false)
      for work in curriculum {
        cv-event(work.from, work.to, work.title, work.structure, work.location, work.tasks)
      }
    }

    #v(1fr)
    #align(center)[
      #text(size: 6pt)[#i18n.gdpr.]
    ]
  ],
),
)
