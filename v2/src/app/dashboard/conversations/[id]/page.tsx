import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { ArrowLeft, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const channelLabel: Record<string, string> = {
  web: "Web",
  slack: "Slack",
  mcp: "MCP",
  api: "API",
};

export default async function ConversationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const { data: conversation } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", membership.organisation_id)
    .single();

  if (!conversation) notFound();

  const { data: parts } = await supabase
    .from("conversation_parts")
    .select("id, sequence_number, actor, message_type, content, created_at")
    .eq("conversation_id", id)
    .eq("message_type", "message")
    .order("sequence_number", { ascending: true });

  const context = conversation.conversation_context as { thread_ts?: string } | null;
  const slackLink = conversation.channel === "slack" && conversation.channel_id && /^[CDG][A-Z0-9]+$/.test(conversation.channel_id) && context?.thread_ts && /^\d+\.\d+$/.test(context.thread_ts)
    ? `https://slack.com/archives/${conversation.channel_id}/p${context.thread_ts.replace(".", "")}` : null;
  const title = conversation.title ?? conversation.initial_question;

  const subtitle = new Date(conversation.started_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <PageLayout
      title={title ?? "Conversation"}
      subtitle={subtitle}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {slackLink && <Button variant="outline" size="sm" asChild><a href={slackLink} target="_blank" rel="noreferrer">Open in Slack</a></Button>}
          <Badge variant="outline" className="text-xs">
            {channelLabel[conversation.channel] ?? conversation.channel}
          </Badge>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/conversations">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Always show the initial question as the first user message if no parts yet */}
        {(!parts || parts.length === 0) && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-1">Slack participant</p>
              <p className="text-sm">{conversation.initial_question}</p>
            </div>
          </div>
        )}

        {parts?.map((part) => {
          const isUser = part.actor === "user";
          return (
            <div key={part.id} className="flex gap-3">
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                {isUser ? (
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <Bot className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium mb-1">{isUser ? (conversation.user_external_id ? `Slack user ${conversation.user_external_id}` : "Participant") : "Ragstar"}</p>
                <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {part.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}

        {conversation.total_tokens_used > 0 && (
          <p className="text-xs text-muted-foreground text-right border-t pt-3">
            {conversation.total_tokens_used.toLocaleString()} tokens used
          </p>
        )}
      </div>
    </PageLayout>
  );
}
