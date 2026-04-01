import {
  fetchOrgSettings,
  fetchModel,
  fetchModelsByIds,
  fetchModelsByProject,
  fetchUpstreamModels,
  interpretModelWithLLM,
  saveInterpretation,
} from "./interpret-steps";

export async function interpretModelWorkflow(modelId: string, orgId: string): Promise<{ interpreted: boolean; skipped?: boolean }> {
  "use workflow";

  const [settings, model] = await Promise.all([
    fetchOrgSettings(orgId),
    fetchModel(modelId, orgId),
  ]);

  if (!model || !(model.compiled_sql ?? model.raw_sql)) {
    return { interpreted: false, skipped: true };
  }

  const upstreamNames = (model.depends_on ?? []) as string[];
  const upstreamModels = await fetchUpstreamModels(upstreamNames, orgId);

  const result = await interpretModelWithLLM(model, upstreamModels, settings);
  await saveInterpretation(modelId, orgId, result.description, result.columns);

  return { interpreted: true };
}

export async function bulkInterpretWorkflow(
  orgId: string,
  target: { modelIds: string[] } | { projectId: string }
): Promise<{ interpreted: number; skipped: number; total: number }> {
  "use workflow";

  const [settings, models] = await Promise.all([
    fetchOrgSettings(orgId),
    "modelIds" in target
      ? fetchModelsByIds(target.modelIds, orgId)
      : fetchModelsByProject(target.projectId, orgId),
  ]);

  // Pre-fetch all upstream models in one query
  const allUpstreamNames = [...new Set(models.flatMap((m) => (m.depends_on ?? []) as string[]))];
  const upstreamList = await fetchUpstreamModels(allUpstreamNames, orgId);
  const upstreamByName = Object.fromEntries(upstreamList.map((u) => [u.name, u]));

  let interpreted = 0;
  let skipped = 0;

  for (const model of models) {
    const sql = model.compiled_sql ?? model.raw_sql;
    if (!sql) { skipped++; continue; }

    const upstreamModels = (model.depends_on ?? [])
      .map((n) => upstreamByName[n as string])
      .filter(Boolean);

    const result = await interpretModelWithLLM(model, upstreamModels, settings);
    await saveInterpretation(model.id, orgId, result.description, result.columns);

    // Update in-memory upstream cache so later models see this model's interpretation
    upstreamByName[model.name] = { ...upstreamByName[model.name], interpreted_description: result.description, name: model.name, path: model.path, raw_sql: model.raw_sql, yml_description: null };

    interpreted++;
  }

  return { interpreted, skipped, total: models.length };
}
