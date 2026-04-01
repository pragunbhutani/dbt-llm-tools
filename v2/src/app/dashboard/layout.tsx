import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  const { data: membership } = await supabase
    .from("organisation_members")
    .select("organisation_id, organisations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (!membership) {
    return <>{children}</>;
  }

  const orgName =
    (membership.organisations as { name: string } | null)?.name ?? "My Organisation";

  const cookieStore = await cookies();
  const sidebarDefaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <AppShell user={{ email: user.email }} orgName={orgName} sidebarDefaultOpen={sidebarDefaultOpen}>
      {children}
    </AppShell>
  );
}
