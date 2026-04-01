"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, FlaskConical, Plus, Trash2, Clock } from "lucide-react";

interface MetabaseConnection {
  id: string;
  name: string;
  url: string;
  database_id: number | null;
  collection_path: string | null;
  status: "untested" | "connected" | "error";
  last_tested_at: string | null;
}

function StatusBadge({ status }: { status: MetabaseConnection["status"] }) {
  if (status === "connected") {
    return (
      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-200 bg-emerald-50">
        <CheckCircle2 className="h-3 w-3 mr-1" />Connected
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
        <AlertCircle className="h-3 w-3 mr-1" />Error
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      <Clock className="h-3 w-3 mr-1" />Untested
    </Badge>
  );
}

function AddConnectionDialog({ onAdd }: { onAdd: (conn: MetabaseConnection) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [databaseId, setDatabaseId] = useState("");
  const [collectionPath, setCollectionPath] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim() || !url.trim() || !apiKey.trim()) {
      toast.error("Name, URL, and API key are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/metabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          url: url.trim().replace(/\/$/, ""),
          api_key: apiKey.trim(),
          database_id: databaseId ? parseInt(databaseId, 10) : undefined,
          collection_path: collectionPath.trim() || undefined,
        }),
      });
      const data = await res.json() as MetabaseConnection & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Connection saved");
      onAdd(data);
      setOpen(false);
      setName(""); setUrl(""); setApiKey(""); setDatabaseId(""); setCollectionPath("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    }
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm">
          <Plus className="h-3.5 w-3.5 mr-1" />Add Connection
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Metabase Connection</DialogTitle>
          <DialogDescription>
            Connect Metabase so Ragstar can save queries as native questions in your collections.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Connection Name</Label>
            <Input placeholder="e.g. Production Metabase" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Metabase URL</Label>
            <Input
              placeholder="https://metabase.yourcompany.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label>API Key</Label>
            <Input
              type="password"
              placeholder="mb_xxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Generate an API key in Metabase under Admin → Settings → Authentication → API keys.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Default Database ID <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              type="number"
              placeholder="1"
              value={databaseId}
              onChange={(e) => setDatabaseId(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              The Metabase database ID to use when saving questions. Find it in the database URL.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Collection Path <span className="text-muted-foreground">(optional)</span></Label>
            <Input
              placeholder="Ragstar / Auto-generated"
              value={collectionPath}
              onChange={(e) => setCollectionPath(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Slash-separated path for where to save questions, e.g. &quot;Ragstar / AI Queries&quot;.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MetabaseSettingsSection({
  initialConnections,
}: {
  initialConnections: MetabaseConnection[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [testing, setTesting] = useState<string | null>(null);

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/metabase/${id}/test`, { method: "POST" });
      const data = await res.json() as { ok?: boolean; databases?: number; error?: string };
      if (res.ok) {
        toast.success(`Connected! Found ${data.databases} database${data.databases === 1 ? "" : "s"}.`);
        setConnections((prev) =>
          prev.map((c) => c.id === id ? { ...c, status: "connected", last_tested_at: new Date().toISOString() } : c)
        );
      } else {
        toast.error(`Test failed: ${data.error}`);
        setConnections((prev) =>
          prev.map((c) => c.id === id ? { ...c, status: "error" } : c)
        );
      }
    } catch {
      toast.error("Test failed — check your network.");
    }
    setTesting(null);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/metabase/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Connection removed");
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch {
      toast.error("Failed to remove connection");
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Metabase</CardTitle>
            <CardDescription>
              Connect Metabase to save AI-generated SQL queries as native questions in your collections.
            </CardDescription>
          </div>
          <AddConnectionDialog onAdd={(conn) => setConnections((prev) => [...prev, conn])} />
        </div>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Metabase connections configured.</p>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{conn.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{conn.url}</p>
                  {conn.collection_path && (
                    <p className="text-xs text-muted-foreground">Saves to: {conn.collection_path}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={conn.status} />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={testing === conn.id}
                    onClick={() => handleTest(conn.id)}
                  >
                    <FlaskConical className="h-3.5 w-3.5 mr-1" />
                    {testing === conn.id ? "Testing…" : "Test"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(conn.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
