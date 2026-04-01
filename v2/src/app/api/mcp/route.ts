import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { validateMcpApiKey } from "@/lib/mcp/auth";
import { createMcpServer } from "@/lib/mcp/server";
import { NextRequest } from "next/server";

export const maxDuration = 60;

async function handleMcpRequest(request: NextRequest): Promise<Response> {
  const auth = await validateMcpApiKey(request.headers.get("authorization"));

  if (!auth) {
    return new Response(
      JSON.stringify({ error: "Unauthorized: provide a valid Bearer API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless — no session management needed
  });

  const server = createMcpServer(auth.orgId);
  await server.connect(transport);

  const response = await transport.handleRequest(request);
  await server.close();
  return response;
}

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
