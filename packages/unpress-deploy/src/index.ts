import type { Phase, PhaseContext, PhaseEvent, DeployOptions } from "@unpress/shared";

export async function createGithubRepo(token: string, name: string): Promise<string> {
  // TODO: GitHub API — create repo, push code
  return `https://github.com/user/${name}`;
}

export async function deployToVercel(token: string, options: DeployOptions): Promise<{ previewUrl: string; projectId: string }> {
  // TODO: Vercel API — create project, deploy
  return { previewUrl: `https://${options.repo_name}.vercel.app`, projectId: "prj_stub" };
}

export interface DeployInput {
  github_token: string;
  vercel_token: string;
  options: DeployOptions;
  site_path: string;
}

export interface DeployOutput {
  repo_url: string;
  site_url: string;
  vercel_project_id: string;
}

export const deployPhase: Phase<DeployInput, DeployOutput> = {
  name: "deploy",
  async *run(input: DeployInput, ctx: PhaseContext): AsyncGenerator<PhaseEvent, DeployOutput> {
    yield { type: "progress", percent: 0, message: "Creating GitHub repository..." };
    const repoUrl = await createGithubRepo(input.github_token, input.options.repo_name);
    yield { type: "progress", percent: 50, message: "Deploying to Vercel..." };
    const deploy = await deployToVercel(input.vercel_token, input.options);
    yield { type: "progress", percent: 100, message: "Deployed" };
    return { repo_url: repoUrl, site_url: deploy.previewUrl, vercel_project_id: deploy.projectId };
  },
};
