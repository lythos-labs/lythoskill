# Skill Combination Patterns
When reading REGISTRY.json, you can identify these synergy patterns
through LLM reasoning over skill metadata:

## Recognized Patterns
| Pattern | Signature | Example |
|---------|-----------|---------|
| **Pipeline** | Skill A's output = Skill B's input | project-cortex → repomix-handoff → skill-arena |
| **Modality Stack** | Complementary I/O planes | LLM + VLM + TTS + ASR |
| **Orchestrator-Engine** | One routes, others render | report-generation-combo + docx/pptx/xlsx |
| **Temporal Sequence** | CI/CD stage alignment | red-green-release → playwright → screenshot-handoff |
| **Triangulation** | Multiple angles on same concern | directory-scanner + checkpoint-guardian + project-scribe |

## How to Detect
These patterns cannot be hardcoded as rules — they emerge from understanding
what each skill produces, consumes, and when it runs.

Useful signals in the index:
- `managedDirs` overlap → likely collaboration or conflict
- `niches` proximity → same domain, check for complementarity vs competition
- `triggerPhrases` overlap → possible redundancy
- `cooperative_skills` field → explicit declared synergy
- `bodyPreview` mentions another skill by name → implicit dependency

## Emergent Combos
During arena test play, the judge may discover that skills together produce
1+1+1>3 effects not visible from individual metadata. These discoveries
should be recorded as ADRs or wiki patterns for future deck building.
