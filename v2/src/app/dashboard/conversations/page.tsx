import Link from "next/link";
import { Hash, ArrowRight, Search } from "lucide-react";
import { getAdminWorkspace } from "@/lib/admin/workspace";
import { PageLayout } from "@/components/layout/page-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function ConversationsPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const { db, orgId } = await getAdminWorkspace();
  const params = await searchParams;
  const q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 200);
  const status = ["active", "completed", "error"].includes(params.status ?? "") ? params.status! : "all";
  const page = Math.min(10000, Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1));
  let query = db.from("conversations").select("id, initial_question, title, status, started_at, channel_id, user_external_id", { count: "exact" })
    .eq("organisation_id", orgId).eq("channel", "slack").order("started_at", { ascending: false }).order("id");
  if (q) query = query.ilike("initial_question", `%${q.replace(/[\\%_]/g, "\\$&")}%`);
  if (status === "error") query = query.in("status", ["error", "timeout"]);
  else if (status === "active" || status === "completed") query = query.eq("status", status);
  const { data: conversations, count, error } = await query.range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Could not load conversations.");
  const pageUrl = (next: number) => `/dashboard/conversations?${new URLSearchParams({ q, status, page: String(next) })}`;
  return (
    <PageLayout title="Conversations" subtitle="Inspect your team’s Slack questions and the agent’s responses." actions={<Button asChild variant="outline"><Link href="/dashboard/slack"><Hash className="h-4 w-4" />Slack setup</Link></Button>}>
      <form className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">Search questions</span><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input name="q" defaultValue={q} placeholder="Search questions…" className="pl-9" /></label>
        <label><span className="sr-only">Conversation status</span><select name="status" defaultValue={status} className="h-9 w-full rounded-md border bg-background px-3 text-sm sm:w-44"><option value="all">All statuses</option><option value="active">Active</option><option value="completed">Completed</option><option value="error">Errors and timeouts</option></select></label>
        <Button type="submit" variant="outline">Apply filters</Button>
        {(q || status !== "all") && <Button asChild variant="ghost"><Link href="/dashboard/conversations">Clear</Link></Button>}
      </form>
      {!conversations?.length ? <div className="rounded-xl border border-dashed px-6 py-16 text-center"><Hash className="mx-auto mb-4 h-8 w-8 text-muted-foreground" /><h2 className="font-medium">{q || status !== "all" || page > 1 ? "No matching conversations" : "No Slack conversations yet"}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{q || status !== "all" || page > 1 ? "Change the filters or return to the first page." : "Connect Slack and ask Ragstar a question there. The conversation will appear here for review."}</p></div> : <div className="divide-y overflow-hidden rounded-xl border">{conversations.map(c => <Link key={c.id} href={`/dashboard/conversations/${c.id}`} className="flex items-center gap-4 p-5 hover:bg-muted/30"><Hash className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{c.title ?? c.initial_question}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{new Date(c.started_at).toLocaleString()}{c.channel_id ? ` · ${c.channel_id}` : ""}</p></div><Badge variant={c.status === "error" || c.status === "timeout" ? "destructive" : "secondary"}>{c.status}</Badge><ArrowRight className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" /></Link>)}</div>}
      <div className="mt-5 flex items-center justify-between gap-4 text-sm text-muted-foreground"><p>{count ?? 0} conversations · Page {page}</p><div className="flex gap-2">{page > 1 && <Button asChild variant="outline" size="sm"><Link href={pageUrl(page - 1)}>Previous</Link></Button>}{page * 25 < (count ?? 0) && <Button asChild variant="outline" size="sm"><Link href={pageUrl(page + 1)}>Next</Link></Button>}</div></div>
    </PageLayout>
  );
}
