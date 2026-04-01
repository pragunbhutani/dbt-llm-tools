import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageLayout } from "@/components/layout/page-layout";
import { ModelDetailActions } from "@/components/knowledge-base/model-detail-actions";
import { ArrowLeft, Database } from "lucide-react";
import type { Json } from "@/types/database";

interface Column {
  name: string;
  description?: string;
  data_type?: string;
}

function renderYmlColumns(columns: Json | null) {
  if (!columns || typeof columns !== "object" || Array.isArray(columns)) return null;
  const cols = Object.values(columns) as unknown as Column[];
  if (cols.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-6 font-medium w-48">Column</th>
            <th className="pb-2 pr-6 font-medium w-32">Type</th>
            <th className="pb-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {cols.map((col) => (
            <tr key={col.name} className="border-b last:border-0">
              <td className="py-2 pr-6 font-mono text-xs align-top">{col.name}</td>
              <td className="py-2 pr-6 text-muted-foreground align-top">{col.data_type ?? "—"}</td>
              <td className="py-2 text-muted-foreground align-top">{col.description ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderInterpretedColumns(columns: Json | null) {
  if (!columns || typeof columns !== "object" || Array.isArray(columns)) return null;
  const entries = Object.entries(columns as Record<string, unknown>);
  if (entries.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-6 font-medium w-48">Column</th>
            <th className="pb-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, desc]) => (
            <tr key={name} className="border-b last:border-0">
              <td className="py-2 pr-6 font-mono text-xs align-top">{name}</td>
              <td className="py-2 text-muted-foreground align-top">{String(desc ?? "—")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function ModelDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const orgId = membership.organisation_id;

  const [{ data: model }, { data: embedding }] = await Promise.all([
    supabase
      .from("dbt_models")
      .select("*, dbt_projects(name)")
      .eq("id", id)
      .eq("organisation_id", orgId)
      .single(),
    supabase
      .from("model_embeddings")
      .select("can_be_used_for_answers")
      .eq("model_id", id)
      .eq("organisation_id", orgId)
      .maybeSingle(),
  ]);

  if (!model) notFound();

  const projectName = (model.dbt_projects as { name: string } | null)?.name;
  const isEmbedded = !!(embedding?.can_be_used_for_answers);

  return (
    <PageLayout
      title={model.name}
      subtitle={projectName ?? undefined}
      actions={
        <div className="flex items-center gap-2">
          <ModelDetailActions modelId={id} isEmbedded={isEmbedded} />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard/knowledge-base">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {model.materialization && (
            <Badge variant="secondary">{model.materialization}</Badge>
          )}
          {model.schema_name && (
            <Badge variant="outline">
              <Database className="h-3 w-3 mr-1" />
              {model.database_name ? `${model.database_name}.` : ""}{model.schema_name}
            </Badge>
          )}
          {isEmbedded && (
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
              In Knowledge Base
            </Badge>
          )}
          {model.tags?.map((tag) => (
            <Badge key={tag} variant="outline">{tag}</Badge>
          ))}
        </div>

        {(model.interpreted_description || model.yml_description) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Description
                {model.interpreted_description && (
                  <Badge variant="secondary" className="text-xs font-normal">AI-generated</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {model.interpreted_description ?? model.yml_description}
              </p>
            </CardContent>
          </Card>
        )}

        {model.interpreted_columns && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                Columns
                <Badge variant="secondary" className="text-xs font-normal">AI-generated</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderInterpretedColumns(model.interpreted_columns)}
            </CardContent>
          </Card>
        )}

        {!model.interpreted_columns && model.yml_columns && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Columns</CardTitle>
            </CardHeader>
            <CardContent>
              {renderYmlColumns(model.yml_columns)}
            </CardContent>
          </Card>
        )}

        {model.depends_on && model.depends_on.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dependencies</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {model.depends_on.map((dep) => (
                  <Badge key={dep} variant="outline" className="font-mono text-xs">
                    {dep}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {model.path && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">File Path</CardTitle>
            </CardHeader>
            <CardContent>
              <code className="text-xs text-muted-foreground">{model.path}</code>
            </CardContent>
          </Card>
        )}

        {(model.compiled_sql || model.raw_sql) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {model.compiled_sql ? "Compiled SQL" : "SQL"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted rounded-md p-4 text-xs overflow-x-auto whitespace-pre-wrap">
                <code>{model.compiled_sql ?? model.raw_sql}</code>
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  );
}
