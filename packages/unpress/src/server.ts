import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SessionManager } from "./session-manager.js";
import { WpClient, calculateCosts } from "@unpress/scan";
import { analyzeInspirationSites } from "@unpress/design";
import { createGithubRepo, deployToVercel } from "@unpress/deploy";
import { executeCopilotAction } from "@unpress/copilot";

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
    "Mark a migration session as rolled back — manual cleanup of remote resources required",
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

  server.tool(
    "unpress_scan",
    "Scan a WordPress site and generate a content manifest with cost estimate",
    {
      wp_url: z.string().url(),
      wp_auth_token: z.string(),
    },
    async (params) => {
      const client = new WpClient(params.wp_url, params.wp_auth_token);
      try {
        await client.checkHealth();
        const manifest = await client.fetchManifest();
        const costs = calculateCosts({
          posts: manifest.content.posts.count,
          pages: manifest.content.pages.count,
          media: manifest.media.total,
        });
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ manifest, costs }) }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: JSON.stringify({ error: String(error) }) }],
        };
      }
    },
  );

  server.tool(
    "unpress_wizard",
    "Launch the onboarding wizard web UI",
    {
      port: z.number().default(3456),
    },
    async (params) => {
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          url: `http://localhost:${params.port}`,
          fallback_path: ".unpress/wizard-fallback/index.html",
          instructions: "Run 'npx unpress wizard' to start the onboarding UI",
        }) }],
      };
    },
  );

  server.tool(
    "unpress_decide",
    "Submit a user decision for a pending migration choice",
    {
      session_id: z.string(),
      decision_id: z.string(),
      choice: z.string(),
    },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({ accepted: true, decision_id: params.decision_id, choice: params.choice }) }],
      };
    },
  );

  server.tool(
    "unpress_migrate",
    "Migrate WordPress content to Sanity CMS",
    {
      session_id: z.string(),
      content_types: z.array(z.string()),
      include_media: z.boolean().default(true),
      include_seo: z.boolean().default(true),
      batch_size: z.number().default(50),
      media_concurrency: z.number().default(3),
    },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          status: "started",
          content_types: params.content_types,
          batch_size: params.batch_size,
        }) }],
      };
    },
  );

  server.tool(
    "unpress_design",
    "Analyze inspiration sites and generate a design for the new website",
    {
      session_id: z.string(),
      inspiration_urls: z.array(z.string().url()).min(3).max(5),
      sanity_project_id: z.string(),
      sanity_dataset: z.string(),
      sanity_token: z.string(),
    },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      const tokens = await analyzeInspirationSites(params.inspiration_urls);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          design_tokens: tokens,
          preview_url: "pending — call unpress_status to check when ready",
        }) }],
      };
    },
  );

  server.tool(
    "unpress_deploy",
    "Deploy the generated site to GitHub and Vercel",
    {
      session_id: z.string(),
      github_token: z.string(),
      vercel_token: z.string(),
      repo_name: z.string(),
      custom_domain: z.string().optional(),
    },
    async (params) => {
      const session = await sessions.load(params.session_id);
      if (!session) {
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: "Session not found" }) }] };
      }
      const repoUrl = await createGithubRepo(params.github_token, params.repo_name);
      const deploy = await deployToVercel(params.vercel_token, {
        repo_name: params.repo_name,
        custom_domain: params.custom_domain,
      });
      await sessions.addResource(params.session_id, "github_repo", repoUrl);
      await sessions.addResource(params.session_id, "vercel_project_id", deploy.projectId);
      await sessions.addResource(params.session_id, "vercel_preview_url", deploy.previewUrl);
      return {
        content: [{ type: "text" as const, text: JSON.stringify({
          repo_url: repoUrl,
          site_url: deploy.previewUrl,
          vercel_project_id: deploy.projectId,
        }) }],
      };
    },
  );

  server.tool(
    "unpress_copilot",
    "Execute a post-migration site change via the AI copilot",
    {
      session_id: z.string(),
      action_type: z.enum(["modify_component", "add_page", "add_section", "update_schema", "optimize_performance", "adjust_responsive"]),
      description: z.string(),
      repo_path: z.string(),
      sanity_project_id: z.string(),
      sanity_dataset: z.string(),
      sanity_token: z.string(),
    },
    async (params) => {
      const result = await executeCopilotAction(
        { type: params.action_type, description: params.description },
        { repo_path: params.repo_path, sanity_config: { project_id: params.sanity_project_id, dataset: params.sanity_dataset, token: params.sanity_token } },
      );
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result) }],
      };
    },
  );

  return { server, sessions };
}
