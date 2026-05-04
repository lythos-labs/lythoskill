export interface Trailer {
  key: string;
  id: string;
  verb: string;
  raw: string;
}

export interface TrailerResult {
  trailers: Trailer[];
  warnings: string[];
  skip: boolean;
}

const ID_RE = /^[A-Z]+-[0-9]+$/;

function looksLikeTrailerLine(line: string): boolean {
  return /^(Task|ADR|Epic|Closes):\s*/i.test(line);
}

export function parseTrailers(msg: string): TrailerResult {
  const trailers: Trailer[] = [];
  const warnings: string[] = [];

  // Recursion guard: follow-up commits carry "Triggered by:"
  if (/^Triggered by:/m.test(msg)) {
    return { trailers: [], warnings: [], skip: true };
  }

  for (const rawLine of msg.split("\n")) {
    const line = rawLine.trimEnd();
    if (!looksLikeTrailerLine(line)) {
      continue;
    }

    const colonIdx = line.indexOf(":");
    const key = line.slice(0, colonIdx);
    const rest = line.slice(colonIdx + 1).trim();
    const raw = rawLine;

    const parts = rest.split(/\s+/);
    const id = parts[0];
    const verb = parts.slice(1).join(" ") || "";

    if (!ID_RE.test(id)) {
      warnings.push(`post-commit trailer: malformed ID in line: ${line}`);
      continue;
    }

    switch (key) {
      case "Closes": {
        let dispatchVerb: string;
        if (id.startsWith("TASK-")) {
          dispatchVerb = "complete";
        } else if (id.startsWith("ADR-")) {
          dispatchVerb = "adr accept";
        } else if (id.startsWith("EPIC-")) {
          dispatchVerb = "epic done";
        } else {
          warnings.push(`post-commit trailer: unknown ID prefix in: ${line}`);
          continue;
        }
        trailers.push({ key, id, verb: dispatchVerb, raw });
        break;
      }
      case "Task":
        if (!verb) {
          warnings.push(`post-commit trailer: Task: requires a verb in: ${line}`);
          continue;
        }
        trailers.push({ key, id, verb, raw });
        break;
      case "ADR":
        if (!verb) {
          warnings.push(`post-commit trailer: ADR: requires a verb in: ${line}`);
          continue;
        }
        trailers.push({ key, id, verb: `adr ${verb}`, raw });
        break;
      case "Epic":
        if (!verb) {
          warnings.push(`post-commit trailer: Epic: requires a verb in: ${line}`);
          continue;
        }
        trailers.push({ key, id, verb: `epic ${verb}`, raw });
        break;
    }
  }

  return { trailers, warnings, skip: false };
}

export function buildDispatchCommands(trailers: Trailer[]): string[] {
  return trailers.map((t) => `${t.verb} ${t.id}`);
}
