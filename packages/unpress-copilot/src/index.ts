import type { Phase, PhaseContext, PhaseEvent, CopilotAction, SanityConfig } from "@unpress/shared";

export async function executeCopilotAction(
  action: CopilotAction,
  context: { repo_path: string; sanity_config: SanityConfig },
): Promise<{ changes: { path: string; action: "create" | "modify" | "delete" }[]; deployed: boolean }> {
  // TODO: Read codebase, modify components, commit, deploy
  return { changes: [], deployed: false };
}

export interface CopilotInput {
  action: CopilotAction;
  repo_path: string;
  sanity_config: SanityConfig;
}

export interface CopilotOutput {
  changes: { path: string; action: "create" | "modify" | "delete" }[];
  deployed: boolean;
}

export const copilotPhase: Phase<CopilotInput, CopilotOutput> = {
  name: "copilot",
  async *run(input: CopilotInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, CopilotOutput> {
    yield { type: "progress", percent: 0, message: "Analyzing request..." };
    const result = await executeCopilotAction(input.action, { repo_path: input.repo_path, sanity_config: input.sanity_config });
    yield { type: "progress", percent: 100, message: "Done" };
    return result;
  },
};
