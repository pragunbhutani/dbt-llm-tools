import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatInterface } from "@/components/chat/chat-interface";
import { PageLayout } from "@/components/layout/page-layout";

export default async function ChatPage() {
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

  return (
    <PageLayout title="New Chat" fill>
      <div className="flex-1 min-h-0 flex flex-col border rounded-xl overflow-hidden bg-background">
        <ChatInterface />
      </div>
    </PageLayout>
  );
}
