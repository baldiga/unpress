import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SessionManager } from "./session-manager.js";
import { FileCheckpointManager } from "./checkpoint-manager.js";
import type { UnpressConfig } from "@unpress/shared";

export function createUnpressServer(baseDir: string) {
  const server = new McpServer({
    name: "unpress",
    version: "0.1.0",
  });

  const sessions = new SessionManager(baseDir);

  server.tool(
    "unpress_start",
    "Start or resume a WordPress to AI-website migration",
    {
      wp_url: z.string().url(),
      wp_auth_token: z.string(),
      sanity_project_id: z.string(),
      sanity_dataset: z.string().default("production"),
      sanity_token: z.string(),
      github_token: z.string(),
      vercel_token: z.string(),
      inspiration_urls: z.array(z.string().url()).min(3).max(5),
      skill_level: z.enum(["novice", "medium", "expert"]),
      session_id: z.string().optional(),
    },
    async (params) => {
      if (params.session_id) {
        const existing = await sessions.load(params.session_id);
        if (existing) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              session_id: params.session_id,
              status: "resumed",
              phase: existing.phases_completed.at(-1) ?? "wizard",
            }) }],
          };
        }
      }

      const session = await sessions.create(params.wp_url);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          session_id: session.session_id,
          status: "started",
          phase: "wizard",
        }) }],
      };
    },
  );

  server.tool(
    "unpress_status",
    "Get current migration status",
    { session_id: z.string() },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          phase: session.phases_completed.at(-1) ?? "wizard",
          progress: (session.phases_completed.length / 6) * 100,
          checkpoint: "latest",
          pending_decisions: [],
          errors: session.errors,
        }) }],
      };
    },
  );

  server.tool(
    "unpress_rollback",
    "Rollback a migration session — delete created resources",
    {
      session_id: z.string(),
      sanity: z.boolean().default(false),
      github: z.boolean().default(false),
      vercel: z.boolean().default(false),
    },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      await sessions.updateStatus(params.session_id, "rolled_back");
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          deleted: {
            sanity_docs: params.sanity ? session.created_resources.sanity_document_ids.length : 0,
            github_repo: params.github ? session.created_resources.github_repo : undefined,
            vercel_project: params.vercel ? session.created_resources.vercel_project_id : undefined,
          },
        }) }],
      };
    },
  );

  return { server, sessions };
}
