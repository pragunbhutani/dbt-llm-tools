"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, Github, Clock, Trash2, RefreshCw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Database as DB } from "@/types/database";

type DbtProject = DB["public"]["Tables"]["dbt_projects"]["Row"];

const statusConfig = {
  pending: { label: "Pending", variant: "secondary" as const },
  syncing: { label: "Syncing", variant: "default" as const },
  synced: { label: "Synced", variant: "default" as const },
  error: { label: "Error", variant: "destructive" as const },
};

interface ProjectsListProps {
  projects: DbtProject[];
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const router = useRouter();

  async function handleSync(id: string) {
    setSyncing(id);
    const syncRes = await fetch("/api/sync-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: id }),
    });
    const syncData = await syncRes.json();
    if (!syncRes.ok) {
      toast.error(syncData.error ?? "Sync failed");
      setSyncing(null);
      return;
    }
    toast.success(`Synced ${syncData.synced} models — generating embeddings…`);

    const embedRes = await fetch("/api/embed-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: id }),
    });
    const embedData = await embedRes.json();
    if (!embedRes.ok) {
      toast.error(embedData.error ?? "Embedding failed");
    } else {
      toast.success(`Ready — ${embedData.embedded} models embedded`);
      router.refresh();
    }
    setSyncing(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this project? This cannot be undone.")) return;
    setDeleting(id);

    const res = await fetch(`/api/dbt-projects/${id}`, { method: "DELETE" });

    if (!res.ok) {
      toast.error("Failed to delete project");
    } else {
      toast.success("Project deleted");
      router.refresh();
    }
    setDeleting(null);
  }

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Database className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Click &ldquo;Add Project&rdquo; to connect your first dbt project.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map((project) => {
        const status = statusConfig[project.status] ?? statusConfig.pending;
        const isGithub = project.connection_type === "github";

        return (
          <Card key={project.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  {isGithub ? (
                    <Github className="h-5 w-5 text-muted-foreground shrink-0" />
                  ) : (
                    <Database className="h-5 w-5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{project.name}</CardTitle>
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      {isGithub
                        ? project.github_repository_url ?? "—"
                        : project.dbt_cloud_url ?? "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs"
                    onClick={() => handleSync(project.id)}
                    disabled={syncing === project.id}
                    title="Sync models from source and generate embeddings"
                  >
                    {syncing === project.id ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    Sync
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(project.id)}
                    disabled={deleting === project.id}
                  >
                    {deleting === project.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {isGithub && project.github_branch && (
                  <span>Branch: {project.github_branch}</span>
                )}
                {isGithub && project.github_project_folder && (
                  <span>Folder: {project.github_project_folder}</span>
                )}
                {project.last_synced_at && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last synced {new Date(project.last_synced_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
