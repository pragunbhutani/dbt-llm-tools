"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";

type ConnectionType = "dbt_cloud" | "github";

export function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionType, setConnectionType] = useState<ConnectionType>("github");
  const [name, setName] = useState("");
  const [githubRepoUrl, setGithubRepoUrl] = useState("");
  const [githubBranch, setGithubBranch] = useState("main");
  const [githubProjectFolder, setGithubProjectFolder] = useState("");
  const [dbtCloudUrl, setDbtCloudUrl] = useState("");
  const [dbtCloudAccountId, setDbtCloudAccountId] = useState("");
  const [dbtCloudApiKey, setDbtCloudApiKey] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const body: Record<string, unknown> = { name, connection_type: connectionType };

    if (connectionType === "github") {
      body.github_repository_url = githubRepoUrl;
      body.github_branch = githubBranch || "main";
      if (githubProjectFolder) body.github_project_folder = githubProjectFolder;
    } else {
      body.dbt_cloud_url = dbtCloudUrl;
      if (dbtCloudAccountId) body.dbt_cloud_account_id = Number(dbtCloudAccountId);
      if (dbtCloudApiKey) body.dbt_cloud_api_key = dbtCloudApiKey;
    }

    const res = await fetch("/api/dbt-projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Failed to create project");
      setLoading(false);
      return;
    }

    toast.success("Project created!");
    setOpen(false);
    resetForm();
    router.refresh();
  }

  function resetForm() {
    setName("");
    setGithubRepoUrl("");
    setGithubBranch("main");
    setGithubProjectFolder("");
    setDbtCloudUrl("");
    setDbtCloudAccountId("");
    setDbtCloudApiKey("");
    setConnectionType("github");
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Add Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add dbt Project</DialogTitle>
          <DialogDescription>
            Connect a dbt project to build your knowledge base.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Project name</Label>
            <Input
              id="name"
              placeholder="My Analytics Project"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="connection-type">Connection type</Label>
            <Select
              value={connectionType}
              onValueChange={(v) => setConnectionType(v as ConnectionType)}
            >
              <SelectTrigger id="connection-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="github">GitHub Repository</SelectItem>
                <SelectItem value="dbt_cloud">dbt Cloud</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {connectionType === "github" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="repo-url">Repository URL</Label>
                <Input
                  id="repo-url"
                  placeholder="https://github.com/org/repo"
                  value={githubRepoUrl}
                  onChange={(e) => setGithubRepoUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch">Branch</Label>
                <Input
                  id="branch"
                  placeholder="main"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-folder">
                  Project folder{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="project-folder"
                  placeholder="dbt/ or leave blank for root"
                  value={githubProjectFolder}
                  onChange={(e) => setGithubProjectFolder(e.target.value)}
                />
              </div>
            </>
          )}

          {connectionType === "dbt_cloud" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cloud-url">dbt Cloud URL</Label>
                <Input
                  id="cloud-url"
                  placeholder="https://cloud.getdbt.com"
                  value={dbtCloudUrl}
                  onChange={(e) => setDbtCloudUrl(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-id">
                  Account ID{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  id="account-id"
                  type="number"
                  placeholder="12345"
                  value={dbtCloudAccountId}
                  onChange={(e) => setDbtCloudAccountId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="dbt Cloud service token"
                  value={dbtCloudApiKey}
                  onChange={(e) => setDbtCloudApiKey(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
