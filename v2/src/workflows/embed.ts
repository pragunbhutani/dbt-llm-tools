import {
  fetchOpenAiKey,
  fetchModelsForEmbed,
  fetchProjectModelsForEmbed,
  embedAndUpsertBatch,
  markProjectSynced,
} from "./embed-steps";

const BATCH_SIZE = 100;

export async function embedModelsWorkflow(
  orgId: string,
  target: { modelIds: string[] } | { projectId: string }
): Promise<{ embedded: number; total: number }> {
  "use workflow";

  const openaiApiKey = await fetchOpenAiKey(orgId);
  if (!openaiApiKey) throw new Error("OpenAI API key not configured — required for embeddings.");

  const models = await ("modelIds" in target
    ? fetchModelsForEmbed(target.modelIds, orgId)
    : fetchProjectModelsForEmbed(target.projectId, orgId));

  if (!models.length) return { embedded: 0, total: 0 };

  let embedded = 0;
  for (let i = 0; i < models.length; i += BATCH_SIZE) {
    const batch = models.slice(i, i + BATCH_SIZE);
    embedded += await embedAndUpsertBatch(batch, orgId, openaiApiKey);
  }

  if ("projectId" in target) {
    await markProjectSynced(target.projectId, orgId);
  }

  return { embedded, total: models.length };
}
