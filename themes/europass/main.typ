// =============================================================================
// Europass CV — faithful recreation of the EU standard format
// Usage: typst compile themes/europass/main.typ --input person=ro --root . --font-path fonts/
// =============================================================================

#import "@preview/fontawesome:0.5.0": *

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "ro")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Colors ---
#let europass-blue = rgb("#0E4194")
#let grey-label = rgb("#3E3E3E")
#let light-line = rgb("#C0C0C0")

// --- Fonts ---
#let body-font = "Roboto"

// --- Page ---
#set page(paper: "a4", margin: (top: 1.5cm, bottom: 1.2cm, left: 1.8cm, right: 1.8cm))
#set text(font: body-font, size: 9pt, fill: luma(30))
#set par(leading: 0.45em, spacing: 0.5em)
#show link: it => text(fill: europass-blue, it)

// --- Label column width ---
#let label-width = 4.2cm

// --- Components ---

#let section-title(title) = {
  v(0.8em)
  text(size: 12pt, weight: "bold", fill: europass-blue, upper(title))
  v(0.1em)
  line(length: 100%, stroke: 0.5pt + light-line)
  v(0.4em)
}

#let field-row(label, body) = {
  grid(
    columns: (label-width, 1fr),
    column-gutter: 0.8em,
    align(right, text(size: 8pt, fill: grey-label)[#label]),
    body,
  )
  v(0.2em)
}

// =============================================================================
// DOCUMENT
// =============================================================================

// --- Header: photo + name/title ---
#grid(
  columns: (label-width, 1fr),
  column-gutter: 0.8em,
  align(right)[
    #box(width: 3cm, height: 3.6cm, clip: true)[
      #image(img-path, width: 100%, height: 100%, fit: "cover")
    ]
  ],
  {
    text(size: 20pt, weight: "bold", fill: europass-blue)[#cv.name #cv.surname]
    v(0.2em)
    text(size: 11pt, fill: grey-label)[#cv.title]
  },
)

#v(0.5em)
#line(length: 100%, stroke: 0.5pt + light-line)

// --- Personal Information ---
#section-title(i18n.contacts)

#if "email" in cv { field-row("Email", link("mailto:" + cv.email)[#cv.email]) }
#if "pec" in cv { field-row("PEC", link("mailto:" + cv.pec)[#cv.pec]) }
#if "phone" in cv { field-row(fa-icon("phone", size: 7pt) + " " + i18n.contacts, text[#cv.phone]) }
#if "location" in cv { field-row(fa-icon("location-dot", size: 7pt) + " Indirizzo", text[#cv.location]) }
#if "linkedin" in cv.links { field-row("LinkedIn", link(cv.links.linkedin)[#cv.links.linkedin.replace("https://www.linkedin.com/in/", "").trim("/")]) }
#if "github" in cv.at("links", default: (:)) { field-row("GitHub", link(cv.links.github)[#cv.links.github.replace("https://github.com/", "")]) }
#if "citizenship" in cv { field-row(i18n.citizenship, text[#upper(cv.citizenship.first())#cv.citizenship.slice(1)]) }

// --- Work Experience ---
#section-title(i18n.work_experience)

#for work in cv.works.filter(w => w.at("hidden", default: false) == false) {
  grid(
    columns: (label-width, 1fr),
    column-gutter: 0.8em,
    align(right, text(size: 8pt, fill: grey-label)[#work.from – #work.to]),
    {
      text(weight: "bold")[#work.title]
      linebreak()
      text(size: 8.5pt)[#work.structure, #work.location]
      v(0.15em)
      let content = work.at("description", default: none)
      if content != none {
        text(size: 8pt, fill: luma(60))[#content]
      } else {
        for task in work.tasks {
          text(size: 8pt, fill: luma(60))[▪ #task]
          linebreak()
        }
      }
    },
  )
  v(0.5em)
}

// --- Education ---
#section-title(i18n.education)

#for edu in cv.educations {
  grid(
    columns: (label-width, 1fr),
    column-gutter: 0.8em,
    align(right, text(size: 8pt, fill: grey-label)[#str(edu.from) – #str(edu.to)]),
    {
      text(weight: "bold")[#edu.title]
      linebreak()
      text(size: 8.5pt)[#edu.structure, #edu.location]
      if edu.at("tasks", default: none) != none {
        v(0.1em)
        for task in edu.tasks {
          text(size: 8pt, fill: luma(60))[#task]
          linebreak()
        }
      }
    },
  )
  v(0.4em)
}

// --- Skills ---
#section-title(i18n.skills)

#field-row(i18n.skills, cv.skills.join(" · "))

// --- Languages ---
#section-title(i18n.spoken_languages)

#{
  let langs = cv.languages
  field-row(
    i18n.spoken_languages,
    {
      for lang in langs {
        text(weight: "bold")[#upper(lang.name.first())#lang.name.slice(1)]
        text[ — #lang.level]
        linebreak()
      }
    },
  )
}

// --- Certifications ---
#if cv.at("certifications", default: none) != none {
  section-title(i18n.certifications)
  field-row(i18n.certifications, cv.certifications.join(" · "))
}

// --- Hobbies ---
#{
  let items = cv.at("hobbies", default: cv.at("interests", default: none))
  if items != none {
    section-title(i18n.hobbies)
    field-row(i18n.hobbies, items.join(" · "))
  }
}

// --- GDPR ---
#v(1fr)
#align(center, text(size: 5.5pt, fill: luma(140), style: "italic")[#i18n.gdpr])
