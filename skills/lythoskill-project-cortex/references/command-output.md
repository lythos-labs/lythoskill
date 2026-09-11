# Command Output Examples

Agents should expect the following output patterns when invoking CLI commands.

### Creating a document
```bash
bunx @lythos/project-cortex@0.19.3 adr "Choose database"
```
Output:
```
✅ Created: cortex/adr/01-proposed/ADR-20260502110308316-Choose-database.md
🏛️  ADR ID: ADR-20260502110308316
```

```bash
bunx @lythos/project-cortex@0.19.3 task "Fix login bug"
```
Output:
```
✅ Created: cortex/tasks/01-backlog/TASK-20260502110308316-Fix-login-bug.md
📝 Task ID: TASK-20260502110308316
```

```bash
bunx @lythos/project-cortex@0.19.3 epic "User auth system"
```
Output:
```
✅ Created: cortex/epics/01-active/EPIC-20260502110308316-User-auth-system.md
🎯 Epic ID: EPIC-20260502110308316
```

### Project statistics
```bash
bunx @lythos/project-cortex@0.19.3 stats
```
Output:
```
📊 Project Statistics:

Tasks:
  Backlog        : 3
  In Progress    : 1
  Review         : 0
  Completed      : 5
  Suspended      : 0
  Terminated     : 0
  Archived       : 2

Epics:
  Active         : 1
  Archived       : 0

ADRs:
  Proposed       : 2
  Accepted       : 1
  Rejected       : 0
  Superseded     : 0

Wiki:
  Patterns       : 4
  Faq            : 1
  Research       : 0
  Lessons        : 0
  Ssot           : 0
  Archived       : 0
```

### Consistency probe (read-only)
```bash
bunx @lythos/project-cortex@0.19.3 probe
```
Output when consistent:
```
🔍 Probing status consistency...
Rule: Directory location is the source of truth.
Status History inside files should reflect the latest move.

📄 Tasks:
  ✅ file1
  ✅ file2

🛤️  Epic lanes (active):
     main:      0
     emergency: 0

──────────────────────────────────────────────────
✅ All documents consistent.
📊 42 documents checked, 0 issue(s) found.
```
Output when mismatches found:
```
🔍 Probing status consistency...
Rule: Directory location is the source of truth.
Status History inside files should reflect the latest move.

📄 Tasks:
  ❌ cortex/tasks/01-backlog/TASK-20260502110308316-Fix-login-bug.md
     → Status History last entry says "in-progress" but directory says "backlog"...

  ⚠️  1 issue(s) requiring human confirmation

🛤️  Epic lanes (active):
     main:      0
     emergency: 0

──────────────────────────────────────────────────
⚠️  Found 1 status issue(s) requiring human confirmation.
   Please review the items above and decide:
   - Move file to correct directory, OR
   - Update Status History inside the file.
📊 42 documents checked, 1 issue(s) found.
```
