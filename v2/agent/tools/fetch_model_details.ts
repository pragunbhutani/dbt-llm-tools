import { defineTool } from "eve/tools";
import { z } from "zod";
import { workspaceForCaller } from "../../src/lib/agent/workspace";
import { fetchModelDetails } from "../../src/lib/dbt/knowledge";

export default defineTool({
  description: "Fetch dbt SQL, descriptions, columns, and upstream dependencies within this workspace.",
  inputSchema: z.object({ model_names: z.array(z.string().min(1)).min(1).max(10) }),
  async execute(input, ctx) {
    const workspace = await workspaceForCaller(ctx.session.auth.current);
    return fetchModelDetails(workspace.organisation_id, input.model_names);
  },
});
