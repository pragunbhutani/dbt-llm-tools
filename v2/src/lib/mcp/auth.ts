import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Validates a Bearer API key from the Authorization header.
 * Returns the org ID if valid, null otherwise.
 */
export async function validateMcpApiKey(
  authHeader: string | null
): Promise<{ orgId: string } | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;

  const apiKey = authHeader.slice(7).trim();
  if (!apiKey) return null;

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("organisation_settings")
    .select("organisation_id")
    .eq("mcp_api_key", apiKey)
    .single();

  if (!data) return null;
  return { orgId: data.organisation_id };
}
