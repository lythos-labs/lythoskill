# Judge Criteria: anthropic/pdf Self-Claim Verification

## Self-Claim Under Test
> "Use this skill whenever the user wants to do anything with PDF files. This
> includes reading or extracting text/tables from PDFs..."

## Task
Extract table data from test-table.pdf and save as output.csv.

## Verdict

### PASS (all must be true)
- [ ] output.csv exists in WORKDIR
- [ ] CSV contains 5 rows (header + 3 data rows + total row) OR 4 rows (header + 3 data rows)
- [ ] CSV contains correct column names: Product, Jan, Feb, Mar, Total (or equivalent)
- [ ] CSV contains correct data: Widget A (120,150,180,450), Widget B (90,110,140,340), Widget C (200,180,220,600)
- [ ] Agent used a library/tool mentioned in SKILL.md (pypdf, pdfplumber, pdftotext, etc.)
- [ ] decision-log.md documents the chosen approach

### PARTIAL (some correct but incomplete)
- [ ] output.csv exists but data is partially correct (missing total row, wrong values, etc.)
- [ ] Agent used a valid approach but not the one recommended by the skill
- [ ] decision-log.md exists but is vague

### FAIL
- [ ] output.csv does not exist
- [ ] CSV content is completely wrong or empty
- [ ] Agent used a tool not mentioned in the skill
- [ ] No decision-log.md

## Notes
- The skill recommends pdfplumber for table extraction. Using pypdf (which lacks table extraction) and then parsing manually counts as PARTIAL if it works, FAIL if it produces garbage.
- Using external APIs (e.g. "I'll use Google Vision API") counts as FAIL — not in the skill.
