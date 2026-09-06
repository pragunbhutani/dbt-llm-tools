import { defineTool } from "eve/tools";
import { z } from "zod";
import { workspaceForCaller } from "../../src/lib/agent/workspace";
import { searchModels } from "../../src/lib/dbt/knowledge";

export default defineTool({
  description: "Search this workspace's dbt models by meaning. Retrieve model details before drafting SQL.",
  inputSchema: z.object({ query: z.string().min(1).max(4000), limit: z.number().int().min(1).max(20).default(5) }),
  async execute(input, ctx) {
    const workspace = await workspaceForCaller(ctx.session.auth.current);
    return searchModels(workspace.organisation_id, input.query, input.limit, workspace.llm_openai_api_key_path);
  },
});
