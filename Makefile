SHELL := /bin/bash
FONT_PATH := fonts
BUILD_DIR := build
THEMES_DIR := themes

# Parse builds.yaml into "person@theme" pairs (@ as separator to avoid dash conflicts)
BUILDS := $(shell paste -d'@' \
  <(grep '^\s*- person:' builds.yaml | sed 's/.*: //') \
  <(grep '^\s*theme:' builds.yaml | sed 's/.*: //'))

PDFS := $(foreach b,$(BUILDS),$(BUILD_DIR)/$(subst @,-,$(b)).pdf)

.PHONY: all clean list one watch

all: $(PDFS)

# Build rule: decode person@theme from the mapping
define build_rule
$(BUILD_DIR)/$(subst @,-,$(1)).pdf: $(THEMES_DIR)/$(word 2,$(subst @, ,$(1)))/main.typ builds.yaml $(wildcard data/*.yaml) $(wildcard i18n/*.yaml)
	@mkdir -p $(BUILD_DIR)
	typst compile $(THEMES_DIR)/$(word 2,$(subst @, ,$(1)))/main.typ $$@ \
		--input person=$(word 1,$(subst @, ,$(1))) \
		--root . \
		--font-path $(FONT_PATH)
endef

$(foreach b,$(BUILDS),$(eval $(call build_rule,$(b))))

one:
	@mkdir -p $(BUILD_DIR)
	typst compile $(THEMES_DIR)/$(THEME)/main.typ $(BUILD_DIR)/$(PERSON)-$(THEME).pdf \
		--input person=$(PERSON) \
		--root . \
		--font-path $(FONT_PATH)

watch:
	@mkdir -p $(BUILD_DIR)
	typst watch $(THEMES_DIR)/$(THEME)/main.typ $(BUILD_DIR)/$(PERSON)-$(THEME).pdf \
		--input person=$(PERSON) \
		--root . \
		--font-path $(FONT_PATH)

clean:
	rm -rf $(BUILD_DIR)

list:
	@echo "Configured builds:"
	@for b in $(BUILDS); do echo "  $${b/@/ → }"; done
