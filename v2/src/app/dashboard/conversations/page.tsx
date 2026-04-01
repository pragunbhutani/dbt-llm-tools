import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { MessageSquare, Plus } from "lucide-react";

const channelLabel: Record<string, string> = {
  web: "Web",
  slack: "Slack",
  mcp: "MCP",
  api: "API",
};

const statusVariant: Record<string, "default" | "secondary" | "destructive"> = {
  active: "default",
  completed: "secondary",
  error: "destructive",
  timeout: "destructive",
};

export default async function ConversationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();
  if (!membership) redirect("/dashboard/onboarding");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("id, channel, title, initial_question, status, total_parts, started_at")
    .eq("organisation_id", membership.organisation_id)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <PageLayout
      title="Conversations"
      subtitle="Your chat history."
      actions={
        <Button asChild>
          <Link href="/dashboard/chat">
            <Plus className="h-4 w-4" />
            New chat
          </Link>
        </Button>
      }
    >
      {!conversations?.length ? (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No conversations yet</p>
            <p className="text-sm text-muted-foreground">
              Start a chat to ask questions about your data.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/chat">Start a conversation</Link>
          </Button>
        </div>
      ) : (
        <div className="divide-y border rounded-xl overflow-hidden">
          {conversations.map((conv) => {
            const title = conv.title ?? conv.initial_question;
            return (
              <Link
                key={conv.id}
                href={`/dashboard/conversations/${conv.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(conv.started_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">
                    {channelLabel[conv.channel] ?? conv.channel}
                  </Badge>
                  <Badge variant={statusVariant[conv.status] ?? "secondary"} className="text-xs">
                    {conv.status}
                  </Badge>
                  {conv.total_parts > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {conv.total_parts} {conv.total_parts === 1 ? "msg" : "msgs"}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </PageLayout>
  );
}
