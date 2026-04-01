import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateProjectDialog } from "@/components/projects/create-project-dialog";
import { ProjectsList } from "@/components/projects/projects-list";
import { PageLayout } from "@/components/layout/page-layout";

export default async function ProjectsPage() {
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

  const { data: projects } = await supabase
    .from("dbt_projects")
    .select("*")
    .eq("organisation_id", membership.organisation_id)
    .order("created_at", { ascending: false });

  return (
    <PageLayout
      title="dbt Projects"
      subtitle="Connect your dbt projects to build your knowledge base."
      actions={<CreateProjectDialog />}
    >
      <ProjectsList projects={projects ?? []} />
    </PageLayout>
  );
}
