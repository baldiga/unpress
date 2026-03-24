import type { Checkpoint } from "./checkpoint.js";

export type SkillLevel = "novice" | "medium" | "expert";

export type PhaseName = "wizard" | "scan" | "migrate" | "design" | "deploy" | "copilot";

export interface Phase<TInput, TOutput> {
  name: PhaseName;
  run(input: TInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, TOutput>;
}

export interface PhaseContext {
  session_id: string;
  skill_level: SkillLevel;
  checkpoint: CheckpointManager;
  wizard: WizardBridge;
  logger: Logger;
}

export interface CheckpointManager {
  save(phase: string, step: string, state: Record<string, unknown>): Promise<void>;
  load(phase: string): Promise<Checkpoint | null>;
  getCompletedItems(phase: string): Promise<string[]>;
}

export interface WizardBridge {
  sendProgress(percent: number, message: string): void;
  requestDecision(id: string, question: string, options: string[]): Promise<string>;
  sendError(error: Error, recoverable: boolean): void;
}

export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error): void;
}

export type PhaseEvent =
  | { type: "progress"; percent: number; message: string }
  | { type: "decision"; id: string; question: string; options: string[] }
  | { type: "error"; error: Error; recoverable: boolean }
  | { type: "checkpoint"; data: Checkpoint };
