# Judge Criteria: anthropic/docx Self-Claim Verification

## Self-Claim Under Test
> "Use this skill whenever the user wants to create, read, edit, or manipulate
> Word documents (.docx files)... requests to produce professional documents with
> formatting like tables of contents, headings, page numbers..."

## Task
Create report.docx with title, body text, table, and page number footer.

## Verdict

### PASS (all must be true)
- [ ] report.docx exists in WORKDIR and is a valid .docx (ZIP with XML)
- [ ] Document contains a title "Quarterly Sales Report"
- [ ] Document contains at least one paragraph of body text (2+ sentences)
- [ ] Document contains a table with 3 columns and 3+ data rows
- [ ] Document has a page number in the footer
- [ ] Agent used docx-js (the library recommended by the skill for creating documents)
- [ ] Agent followed critical rules from the skill:
  - [ ] Page size set explicitly (not default A4 if US Letter was intended, or vice versa)
  - [ ] No unicode bullet characters (uses LevelFormat.BULLET)
  - [ ] Table uses WidthType.DXA, not PERCENTAGE
  - [ ] ImageRun has type parameter if images used
- [ ] decision-log.md documents approach and any rule awareness

### PARTIAL
- [ ] report.docx exists and is valid, but missing 1-2 required elements
- [ ] Agent used docx-js but violated 1-2 critical rules
- [ ] Table or footer is present but incorrectly formatted

### FAIL
- [ ] report.docx does not exist or is corrupted
- [ ] Agent used a tool not mentioned in the skill (e.g., Python python-docx, pandoc)
- [ ] Critical rules massively violated (e.g. PERCENTAGE tables, unicode bullets)
- [ ] No decision-log.md

## Notes
- The skill is VERY prescriptive about docx-js critical rules. Violating them is a strong signal that the skill's guidance was not sufficient.
- Using python-docx instead of docx-js is a FAIL — the skill explicitly says "Use docx-js" for creating new documents.
