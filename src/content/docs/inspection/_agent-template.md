---
title: "Set up <agent>"
description: "One line: what this agent sends and where its runs show."
checkedWith: "<agent> <version>"
checkedOn: "<yyyy-mm-dd>"
---

Every agent page has exactly these H2 headings, in this order; agent-specific
material goes in ### subsections under them (for example under "Set up"). The
build check (`pnpm check:inspection`) fails when a page lacks one, reorders them
or adds another H2, and when this template stops matching the list in the script.
A page also shows its checked line with `<CheckedWith>`. `checkedWith` and
`checkedOn` in the frontmatter hold the line "Checked with <agent> <version> on
<date>"; a recorded run that no longer matches the agent's release marks the page
out of date.

## What it emits

## Set up

## Tag the item

## Content and privacy

## Check it works

One command, and where the run should appear.

## Known gaps
