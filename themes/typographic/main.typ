// =============================================================================
// Typographic Resume — data-driven from YAML
// Usage: typst compile themes/typographic/main.typ --input person=nic --root . --font-path fonts/
// =============================================================================

#import "@preview/typographic-resume:0.1.0": *

// --- Data Loading ---
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()

// --- Helper: format tasks as description ---
#let format-tasks(work) = work.tasks.join(". ") + "."

// --- Build aside content ---
#let aside-content = {
  // Contacts
  section(
    i18n.contacts,
    {
      set image(width: 8pt)
      contact-entry(email-icon, link("mailto:" + cv.email, cv.email))
      line(stroke: 0.1pt, length: 100%)
      contact-entry(phone-icon, link("tel:" + cv.phone, cv.phone))
      line(stroke: 0.1pt, length: 100%)
      if "linkedin" in cv.links {
        contact-entry(
          image("/themes/typographic/linkedin.svg", width: 8pt, alt: "LinkedIn"),
          link(cv.links.linkedin, cv.links.linkedin.replace("https://www.linkedin.com/in/", "")),
        )
        line(stroke: 0.1pt, length: 100%)
      }
      if "github" in cv.links {
        contact-entry(github-icon, link(cv.links.github, cv.links.github.replace("https://github.com/", "")))
      }
    },
  )

  // Personal Info
  section(
    i18n.personal_info,
    {
      set text(font: "Roboto", size: 8pt)
      if "citizenship" in cv [
        #i18n.citizenship: *#upper(cv.citizenship.first())#cv.citizenship.slice(1)*
      ]
    },
  )

  // Languages
  section(
    i18n.spoken_languages,
    {
      for lang in cv.languages {
        language-entry(
          upper(lang.name.first()) + lang.name.slice(1),
          lang.level,
        )
      }
    },
  )

  // Skills
  section(
    i18n.skills,
    {
      set text(font: "Roboto", size: 8pt)
      stack(spacing: 8pt, ..cv.skills)
    },
  )

  // Certifications
  if "certifications" in cv {
    section(
      i18n.certifications,
      {
        set text(font: "Roboto", size: 8pt)
        stack(spacing: 8pt, ..cv.certifications)
      },
    )
  }

  // Interests / Hobbies
  if "interests" in cv {
    section(
      i18n.hobbies,
      {
        set text(size: 7pt)
        stack(spacing: 8pt, ..cv.interests)
      },
    )
  }
}

// =============================================================================
// DOCUMENT
// =============================================================================

#show: resume.with(
  first-name: cv.name,
  last-name: cv.surname,
  profession: cv.title,
  bio: cv.abstract,
  profile-picture: image(img-path, alt: "profile-picture"),
  aside: aside-content,
)

// --- Work Experiences ---
#section(
  theme: (space-above: 0pt),
  i18n.resume,
  {
    for (i, work) in cv.works.enumerate() {
      work-entry(
        theme: (space-above: if i == 0 { 0pt } else { 1fr }),
        timeframe: str(work.from) + " — " + str(work.to),
        title: work.title,
        organization: work.structure,
        location: work.location,
        format-tasks(work),
      )
    }
  },
)

// --- Education ---
#section(
  i18n.titles,
  {
    for edu in cv.educations {
      education-entry(
        timeframe: str(edu.from) + " — " + str(edu.to),
        title: edu.title,
        institution: edu.structure,
        location: edu.location,
        [],
      )
    }
  },
)

// --- Projects ---
#if "projects" in cv {
  section(
    i18n.projects,
    {
      for project in cv.projects {
        work-entry(
          timeframe: str(project.date),
          title: project.name,
          organization: "",
          location: "",
          project.descriptions.join(". ") + ".",
        )
      }
    },
  )
}
