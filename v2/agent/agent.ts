import { defineAgent, defineDynamic } from "eve";
import { workspaceForCaller } from "../src/lib/agent/workspace";
import { getLLMModel } from "../src/lib/ai/providers";

export default defineAgent({
  model: defineDynamic({
    events: {
      "step.started": async (_event, ctx) => {
        const settings = await workspaceForCaller(ctx.session.auth.current);
        return getLLMModel(settings.llm_chat_provider, settings.llm_chat_model, {
          openai: settings.llm_openai_api_key_path,
          anthropic: settings.llm_anthropic_api_key_path,
          google: settings.llm_google_api_key_path,
        });
      },
    },
  }),
});
