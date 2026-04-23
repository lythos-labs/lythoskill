/**
 * Core types for lythoskill-project-cortex
 * SSOT for config, commands, and templates.
 */

export interface WorkflowConfig {
  tasksDir: string;
  epicsDir: string;
  adrDir: string;
  wikiDir: string;

  taskSubdirs: {
    backlog: string;
    inProgress: string;
    review: string;
    completed: string;
    suspended: string;
    terminated: string;
    archived: string;
  };

  epicSubdirs: {
    active: string;
    archived: string;
  };

  adrSubdirs: {
    proposed: string;
    accepted: string;
    rejected: string;
    superseded: string;
  };

  wikiSubdirs: {
    patterns: string;
    faq: string;
    lessons: string;
  };
}

export interface FileScanResult {
  files: string[];
}

/** Timestamp ID format: PREFIX-yyyyMMddHHmmssSSS (17 digits) */
export type TimestampId = string;

export type ItemPrefix = 'TASK' | 'EPIC' | 'ADR';
