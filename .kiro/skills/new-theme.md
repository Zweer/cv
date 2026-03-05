# Create New Typst Theme

## 1. Create theme directory

```bash
mkdir -p themes/<theme-name>
```

## 2. Create main.typ

Every theme MUST follow this data-loading pattern:

```typst
#let person = sys.inputs.at("person", default: "nic")
#let cv = yaml("/data/" + person + ".yaml")
#let i18n = yaml("/i18n/" + cv.language + ".yaml")
#let img-path = "/images/" + cv.image.split("/").last()
```

## 3. Required sections

The template should render (when data is available):
- Header: name, surname, title, photo
- Contacts: email, phone, location, linkedin, github
- Abstract / "Who am I"
- Work experience (respect `resume` flag if theme distinguishes short/full)
- Education
- Skills, Languages, Certifications, Hobbies/Interests (from sidebar or inline)
- GDPR footer: `i18n.gdpr`

## 4. Use i18n keys for all labels

Never hardcode section titles. Use: `i18n.who_am_i`, `i18n.contacts`, `i18n.skills`, `i18n.spoken_languages`, `i18n.certifications`, `i18n.hobbies`, `i18n.projects`, `i18n.resume`, `i18n.titles`, `i18n.curriculum`, `i18n.gdpr`.

## 5. Test compilation

```bash
typst compile themes/<theme-name>/main.typ --input person=nic --root . --font-path fonts/
typst compile themes/<theme-name>/main.typ --input person=ro --root . --font-path fonts/
```

## 6. Optional: color variants

Support variants via `cv.variant` field, with a dictionary of color schemes (see `new-hipster/main.typ` for reference).
