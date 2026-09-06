import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function getAdminWorkspace() {
  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) redirect("/sign-in");
  const { data: member, error } = await db.from("organisation_members")
    .select("organisation_id, organisations(name)").eq("user_id", user.id).limit(1).single();
  if (error && error.code !== "PGRST116") throw new Error("Could not load the workspace.");
  if (!member) redirect("/dashboard/onboarding");
  return { db, user, sevenDaysAgo: new Date(Date.now() - 7 * 86400000).toISOString(), orgId: member.organisation_id,
    orgName: (member.organisations as { name: string } | null)?.name ?? "Workspace" };
}
