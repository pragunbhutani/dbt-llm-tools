"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type WarehouseType = "snowflake" | "postgres" | "redshift";

interface WarehouseConnection {
  id: string;
  name: string;
  type: WarehouseType;
  status: "untested" | "connected" | "error";
  last_tested_at: string | null;
}

function StatusBadge({ status }: { status: WarehouseConnection["status"] }) {
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

function SnowflakeFields({
  fields,
  onChange,
}: {
  fields: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <>
      {[
        { key: "account", label: "Account Identifier", placeholder: "orgname-accountname" },
        { key: "user", label: "Username", placeholder: "your_username" },
        { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
        { key: "warehouse", label: "Warehouse", placeholder: "COMPUTE_WH" },
        { key: "database", label: "Database", placeholder: "ANALYTICS" },
        { key: "schema", label: "Schema", placeholder: "PUBLIC" },
        { key: "role", label: "Role (optional)", placeholder: "ANALYST" },
      ].map(({ key, label, placeholder, type }) => (
        <div key={key} className="space-y-1.5">
          <Label>{label}</Label>
          <Input
            type={type ?? "text"}
            placeholder={placeholder}
            value={fields[key] ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      ))}
    </>
  );
}

function PostgresFields({
  fields,
  onChange,
}: {
  fields: Record<string, string>;
  onChange: (k: string, v: string) => void;
}) {
  return (
    <>
      {[
        { key: "host", label: "Host", placeholder: "localhost or db.example.com" },
        { key: "port", label: "Port", placeholder: "5432" },
        { key: "database", label: "Database", placeholder: "analytics" },
        { key: "user", label: "Username", placeholder: "your_username" },
        { key: "password", label: "Password", placeholder: "••••••••", type: "password" },
      ].map(({ key, label, placeholder, type }) => (
        <div key={key} className="space-y-1.5">
          <Label>{label}</Label>
          <Input
            type={type ?? "text"}
            placeholder={placeholder}
            value={fields[key] ?? ""}
            onChange={(e) => onChange(key, e.target.value)}
            className="font-mono text-sm"
          />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          id="ssl"
          type="checkbox"
          checked={fields.ssl === "true"}
          onChange={(e) => onChange("ssl", e.target.checked ? "true" : "false")}
          className="h-4 w-4"
        />
        <Label htmlFor="ssl" className="font-normal">Use SSL</Label>
      </div>
    </>
  );
}

function AddConnectionDialog({ onAdd }: { onAdd: (conn: WarehouseConnection) => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<WarehouseType>("snowflake");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function setField(k: string, v: string) {
    setFields((prev) => ({ ...prev, [k]: v }));
  }

  async function handleSave() {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const credentials: Record<string, unknown> = { ...fields };
      if (type === "postgres" || type === "redshift") {
        credentials.port = parseInt(fields.port ?? "5432", 10);
        credentials.ssl = fields.ssl === "true";
      }

      const res = await fetch("/api/warehouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), type, credentials }),
      });
      const data = await res.json() as WarehouseConnection & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to save");
      toast.success("Connection saved");
      onAdd(data);
      setOpen(false);
      setName("");
      setFields({});
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
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Warehouse Connection</DialogTitle>
          <DialogDescription>
            Connect your data warehouse so Ragstar can execute queries directly.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Connection Name</Label>
            <Input
              placeholder="e.g. Production Snowflake"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={(v) => { setType(v as WarehouseType); setFields({}); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="snowflake">Snowflake</SelectItem>
                <SelectItem value="postgres">PostgreSQL</SelectItem>
                <SelectItem value="redshift">Amazon Redshift</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "snowflake" ? (
            <SnowflakeFields fields={fields} onChange={setField} />
          ) : (
            <PostgresFields fields={fields} onChange={setField} />
          )}
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

export function WarehouseSettingsSection({
  initialConnections,
}: {
  initialConnections: WarehouseConnection[];
}) {
  const [connections, setConnections] = useState(initialConnections);
  const [testing, setTesting] = useState<string | null>(null);

  async function handleTest(id: string) {
    setTesting(id);
    try {
      const res = await fetch(`/api/warehouse/${id}/test`, { method: "POST" });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (res.ok) {
        toast.success("Connection successful!");
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
      const res = await fetch(`/api/warehouse/${id}`, { method: "DELETE" });
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
            <CardTitle>Data Warehouse</CardTitle>
            <CardDescription>
              Connect your warehouse to let Ragstar execute SQL queries and show live results.
            </CardDescription>
          </div>
          <AddConnectionDialog onAdd={(conn) => setConnections((prev) => [...prev, conn])} />
        </div>
      </CardHeader>
      <CardContent>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">No warehouse connections configured.</p>
        ) : (
          <div className="space-y-3">
            {connections.map((conn) => (
              <div key={conn.id} className="flex items-center justify-between rounded-lg border px-4 py-3">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">{conn.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{conn.type}</p>
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
