export interface Checkpoint {
  id: string;
  session_id: string;
  phase: string;
  step: string;
  timestamp: string;
  state: Record<string, unknown>;
  completed_items: string[];
  pending_items: string[];
}

export interface SessionSummary {
  session_id: string;
  started_at: string;
  completed_at?: string;
  status: "in_progress" | "completed" | "failed" | "rolled_back";
  wp_url: string;
  created_resources: {
    sanity_document_ids: string[];
    github_repo?: string;
    vercel_project_id?: string;
    vercel_preview_url?: string;
    vercel_production_url?: string;
  };
  phases_completed: string[];
  errors: ErrorLogEntry[];
}

export interface ErrorLogEntry {
  timestamp: string;
  phase: string;
  message: string;
  recoverable: boolean;
  resolved: boolean;
}
