"use client";

import React, { useState, useTransition, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BookOpen,
  MoreHorizontal,
  RefreshCw,
  PlusCircle,
  MinusCircle,
  Settings2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  DatabaseZap,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import type { Database } from "@/types/database";

type DbtModel = Pick<
  Database["public"]["Tables"]["dbt_models"]["Row"],
  | "id"
  | "name"
  | "path"
  | "schema_name"
  | "database_name"
  | "materialization"
  | "tags"
  | "dbt_project_id"
  | "yml_description"
  | "yml_columns"
  | "interpreted_description"
  | "interpreted_columns"
  | "updated_at"
>;

type Project = { id: string; name: string };
type EmbeddingInfo = { enabled: boolean; embeddedAt: string };

interface ModelsTableProps {
  models: DbtModel[];
  projects: Project[];
  embeddingStatus: Record<string, EmbeddingInfo>;
}

type AnsweringStatus = "enabled" | "disabled" | "training" | "not_embedded";
type InterpretStatus = "idle" | "interpreting" | "done" | "error";

type TableRow = DbtModel & {
  answeringStatus: AnsweringStatus;
  embeddedAt: string | null;
};

const STATUS_SORT_ORDER: Record<AnsweringStatus, number> = {
  enabled: 0,
  training: 1,
  disabled: 2,
  not_embedded: 3,
};

export function ModelsTable({ models, projects, embeddingStatus }: ModelsTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [localStatus, setLocalStatus] = useState<Record<string, AnsweringStatus>>({});
  const [interpretStatus, setInterpretStatus] = useState<Record<string, InterpretStatus>>({});
  const [sorting, setSorting] = useState<SortingState>([{ id: "answeringStatus", desc: false }]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    path: false,
    tags: false,
    embeddedAt: false,
  });
  const [rowSelection, setRowSelection] = useState({});

  const getStatus = useCallback(
    (modelId: string): AnsweringStatus => {
      if (localStatus[modelId]) return localStatus[modelId];
      const info = embeddingStatus[modelId];
      if (!info) return "not_embedded";
      return info.enabled ? "enabled" : "disabled";
    },
    [localStatus, embeddingStatus]
  );

  const data = useMemo<TableRow[]>(
    () =>
      models
        .filter((m) => projectFilter === "all" || m.dbt_project_id === projectFilter)
        .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase()))
        .map((m) => ({
          ...m,
          answeringStatus: getStatus(m.id),
          embeddedAt: embeddingStatus[m.id]?.embeddedAt ?? null,
        })),
    [models, projectFilter, search, getStatus, embeddingStatus]
  );

  const setSingleStatus = useCallback(
    async (modelId: string, next: AnsweringStatus) => {
      const prev = getStatus(modelId);
      setLocalStatus((s) => ({ ...s, [modelId]: next }));
      try {
        if (next === "training" || next === "enabled") {
          const res = await fetch(`/api/models/${modelId}/embedding`, { method: "POST" });
          if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
          // 202: embedding started as a background job — keep "training" status
          toast.success("Embedding started — the model will appear in your knowledge base shortly.");
        } else {
          const res = await fetch(`/api/models/${modelId}/embedding`, { method: "DELETE" });
          if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
          setLocalStatus((s) => ({ ...s, [modelId]: "disabled" }));
          toast.success("Removed from knowledge base");
          router.refresh();
        }
      } catch (err) {
        setLocalStatus((s) => ({ ...s, [modelId]: prev }));
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [getStatus, router]
  );

  const handleBulkAction = useCallback(
    (action: "embed" | "enable" | "disable", rows: TableRow[]) => {
      const ids = rows.map((r) => r.id);
      if (!ids.length) { toast.error("No rows selected"); return; }

      const nextStatus: AnsweringStatus =
        action === "disable" ? "disabled" : action === "enable" ? "enabled" : "training";

      setLocalStatus((s) => {
        const next = { ...s };
        ids.forEach((id) => { next[id] = nextStatus; });
        return next;
      });

      startTransition(async () => {
        try {
          const res = await fetch("/api/models/bulk-embedding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_ids: ids, action }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
          const result = await res.json();
          if (action === "embed") {
            // 202: background job started, keep "training" status
            toast.success(`Embedding ${ids.length} model(s) in the background — refresh to see updated status.`);
          } else {
            setLocalStatus((s) => {
              const next = { ...s };
              ids.forEach((id) => { next[id] = nextStatus; });
              return next;
            });
            toast.success(`Updated ${result.updated} model(s)`);
            router.refresh();
          }
          setRowSelection({});
        } catch (err) {
          setLocalStatus((s) => {
            const next = { ...s };
            ids.forEach((id) => { delete next[id]; });
            return next;
          });
          toast.error(err instanceof Error ? err.message : "Bulk action failed");
        }
      });
    },
    [router, startTransition]
  );

  const handleInterpret = useCallback(
    async (modelId: string) => {
      setInterpretStatus((s) => ({ ...s, [modelId]: "interpreting" }));
      try {
        const res = await fetch(`/api/models/${modelId}/interpret`, { method: "POST" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
        // 202: job started, clear local status
        setInterpretStatus((s) => ({ ...s, [modelId]: "idle" }));
        toast.success("Interpretation started — refresh shortly to see the updated description.");
      } catch (err) {
        setInterpretStatus((s) => ({ ...s, [modelId]: "error" }));
        toast.error(err instanceof Error ? err.message : "Interpretation failed");
      }
    },
    []
  );

  const handleBulkInterpret = useCallback(
    (rows: TableRow[]) => {
      const ids = rows.map((r) => r.id);
      if (!ids.length) { toast.error("No rows selected"); return; }

      setInterpretStatus((s) => {
        const next = { ...s };
        ids.forEach((id) => { next[id] = "interpreting"; });
        return next;
      });

      startTransition(async () => {
        try {
          const res = await fetch("/api/models/bulk-interpret", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model_ids: ids }),
          });
          if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
          // 202: background job started
          setInterpretStatus((s) => {
            const next = { ...s };
            ids.forEach((id) => { next[id] = "idle"; });
            return next;
          });
          toast.success(`Interpreting ${ids.length} model(s) in the background — refresh shortly to see results.`);
          setRowSelection({});
        } catch (err) {
          setInterpretStatus((s) => {
            const next = { ...s };
            ids.forEach((id) => { next[id] = "error"; });
            return next;
          });
          toast.error(err instanceof Error ? err.message : "Bulk interpretation failed");
        }
      });
    },
    [router, startTransition]
  );

  const columns = useMemo<ColumnDef<TableRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Select row"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: "Model",
        cell: ({ row }) => {
          const desc = row.original.interpreted_description ?? row.original.yml_description;
          return (
            <div className="min-w-[180px]">
              <Link
                href={`/dashboard/knowledge-base/models/${row.original.id}`}
                className="font-mono font-medium hover:underline"
              >
                {row.getValue("name")}
              </Link>
              {desc && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{desc}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "path",
        header: "Path",
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground font-mono truncate max-w-[200px] block">
            {(row.getValue("path") as string | null) ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "schema_name",
        header: "Schema",
        cell: ({ row }) => (
          <span className="text-muted-foreground">{(row.getValue("schema_name") as string | null) ?? "—"}</span>
        ),
      },
      {
        accessorKey: "materialization",
        header: "Type",
        cell: ({ row }) => {
          const v = row.getValue("materialization") as string | null;
          return v ? <Badge variant="secondary" className="text-xs">{v}</Badge> : <span className="text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: "tags",
        header: "Tags",
        cell: ({ row }) => {
          const tags = (row.getValue("tags") as string[] | null) ?? [];
          if (!tags.length) return <span className="text-muted-foreground">—</span>;
          return (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 2).map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
              {tags.length > 2 && <Badge variant="outline" className="text-xs">+{tags.length - 2}</Badge>}
            </div>
          );
        },
      },
      {
        id: "docs",
        header: "Docs",
        cell: ({ row }) => {
          const m = row.original;
          const hasYml = !!(m.yml_description || (m.yml_columns && typeof m.yml_columns === "object" && !Array.isArray(m.yml_columns) && Object.keys(m.yml_columns).length > 0));
          const hasAi = !!(m.interpreted_description || (m.interpreted_columns && typeof m.interpreted_columns === "object" && !Array.isArray(m.interpreted_columns) && Object.keys(m.interpreted_columns).length > 0));
          if (!hasYml && !hasAi) return <span className="text-muted-foreground text-xs">—</span>;
          return (
            <div className="flex gap-1">
              {hasYml && <Badge variant="outline" className="text-xs px-1.5 py-0 font-normal">YML</Badge>}
              {hasAi && <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-100">AI</Badge>}
            </div>
          );
        },
      },
      {
        accessorKey: "answeringStatus",
        header: "In KB",
        sortingFn: (a, b) =>
          STATUS_SORT_ORDER[a.getValue("answeringStatus") as AnsweringStatus] -
          STATUS_SORT_ORDER[b.getValue("answeringStatus") as AnsweringStatus],
        cell: ({ row }) => {
          const status = row.getValue("answeringStatus") as AnsweringStatus;
          if (status === "enabled")
            return <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">Enabled</Badge>;
          if (status === "training")
            return <Badge variant="secondary" className="text-xs">Training…</Badge>;
          if (status === "disabled")
            return <Badge variant="outline" className="text-xs text-muted-foreground">Disabled</Badge>;
          return <Badge variant="outline" className="text-xs text-muted-foreground">Not embedded</Badge>;
        },
      },
      {
        accessorKey: "embeddedAt",
        header: "Last embedded",
        cell: ({ row }) => {
          const v = row.getValue("embeddedAt") as string | null;
          if (!v) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm text-muted-foreground">
              {new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          );
        },
      },
      {
        accessorKey: "updated_at",
        header: "Last synced",
        cell: ({ row }) => {
          const v = row.getValue("updated_at") as string | null;
          if (!v) return <span className="text-muted-foreground">—</span>;
          return (
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </span>
          );
        },
      },
      {
        id: "actions",
        enableHiding: false,
        cell: ({ row }) => {
          const model = row.original;
          const status = model.answeringStatus;
          const isTraining = status === "training";
          const isInterpreting = interpretStatus[model.id] === "interpreting";
          const busy = isTraining || isInterpreting;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={busy}>
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/knowledge-base/models/${model.id}`}>View details</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleInterpret(model.id)} disabled={isInterpreting}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  {isInterpreting ? "Interpreting…" : "Interpret with AI"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {status === "enabled" && (
                  <>
                    <DropdownMenuItem onClick={() => setSingleStatus(model.id, "training")}>
                      <RefreshCw className="h-4 w-4 mr-2" />Re-embed
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setSingleStatus(model.id, "disabled")}
                      className="text-destructive focus:text-destructive"
                    >
                      <MinusCircle className="h-4 w-4 mr-2" />Disable
                    </DropdownMenuItem>
                  </>
                )}
                {status === "disabled" && (
                  <>
                    <DropdownMenuItem onClick={() => setSingleStatus(model.id, "enabled")}>
                      <PlusCircle className="h-4 w-4 mr-2" />Enable
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSingleStatus(model.id, "training")}>
                      <RefreshCw className="h-4 w-4 mr-2" />Re-embed
                    </DropdownMenuItem>
                  </>
                )}
                {(status === "not_embedded") && (
                  <DropdownMenuItem onClick={() => setSingleStatus(model.id, "training")}>
                    <PlusCircle className="h-4 w-4 mr-2" />Add to knowledge base
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [setSingleStatus, handleInterpret, interpretStatus]
  );

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnVisibility, rowSelection },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: { pagination: { pageSize: 25 } },
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original);
  const numSelected = selectedRows.length;
  const anyInterpreting = selectedRows.some((r) => interpretStatus[r.id] === "interpreting");
  const anyTraining = selectedRows.some((r) => localStatus[r.id] === "training");

  if (!models.length) {
    return (
      <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 text-center space-y-3">
        <BookOpen className="h-10 w-10 text-muted-foreground" />
        <div>
          <p className="font-medium">No models yet</p>
          <p className="text-sm text-muted-foreground">Sync a dbt project to populate your knowledge base.</p>
        </div>
        <Button asChild variant="outline"><Link href="/dashboard/projects">Go to Projects</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="h-4 w-4 mr-2" />Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {table.getAllColumns().filter((c) => c.getCanHide()).map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id === "embeddedAt" ? "Last embedded"
                    : col.id === "updated_at" ? "Last synced"
                    : col.id === "answeringStatus" ? "In KB"
                    : col.id === "schema_name" ? "Schema"
                    : col.id === "docs" ? "Docs"
                    : col.id}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {projects.length > 1 && (
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}

          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-56"
          />
        </div>

        <div className="flex items-center gap-2">
          {numSelected > 0 && (
            <span className="text-sm text-muted-foreground">{numSelected} selected</span>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={numSelected === 0 || anyInterpreting}
            onClick={() => handleBulkInterpret(selectedRows)}
          >
            <Sparkles className={`h-4 w-4 mr-1.5 ${anyInterpreting ? "animate-pulse" : ""}`} />
            {anyInterpreting ? `Interpreting…` : "Interpret"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9"
            disabled={numSelected === 0 || anyTraining}
            onClick={() => handleBulkAction("embed", selectedRows)}
          >
            <DatabaseZap className={`h-4 w-4 mr-1.5 ${anyTraining ? "animate-pulse" : ""}`} />
            {anyTraining ? "Embedding…" : "Embed"}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9" disabled={numSelected === 0}>
                Status <ChevronDown className="h-4 w-4 ml-1.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleBulkAction("enable", selectedRows)}>
                <PlusCircle className="h-4 w-4 mr-2" />Enable selected
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulkAction("disable", selectedRows)}>
                <MinusCircle className="h-4 w-4 mr-2" />Disable selected
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-background overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} colSpan={header.colSpan}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground transition-colors"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? " ↕"}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No models match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-muted-foreground">
          {numSelected > 0
            ? `${numSelected} of ${table.getFilteredRowModel().rows.length} row(s) selected`
            : `${table.getFilteredRowModel().rows.length} model(s)`}
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Rows per page</span>
            <Select
              value={String(table.getState().pagination.pageSize)}
              onValueChange={(v) => table.setPageSize(Number(v))}
            >
              <SelectTrigger className="h-8 w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50, 100].map((n) => (
                  <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
