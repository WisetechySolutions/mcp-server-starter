import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";
import { createServer } from "./server.js";

/**
 * Streamable HTTP transport (the remote-server flavor of MCP).
 * Stateful: one transport + one McpServer per client session, kept in a map and
 * torn down when the client disconnects (DELETE /mcp) or the transport closes.
 */
export async function startHttp(): Promise<void> {
  const app = express();
  app.use(express.json());

  const sessions = new Map<string, StreamableHTTPServerTransport>();

  app.post("/mcp", async (req, res) => {
    const header = req.headers["mcp-session-id"];
    const existing = typeof header === "string" ? sessions.get(header) : undefined;

    if (existing) {
      await existing.handleRequest(req, res, req.body);
      return;
    }

    // New session: fresh transport + fresh server instance.
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
    });
    const server = createServer();

    transport.onclose = () => {
      const id = transport.sessionId;
      if (id) sessions.delete(id);
    };

    await server.connect(transport);
    // The transport takes the already-parsed body as its third argument —
    // express.json() above is what produces req.body.
    await transport.handleRequest(req, res, req.body);
    if (transport.sessionId) sessions.set(transport.sessionId, transport);
  });

  // GET (SSE stream) and DELETE (session termination) route through the same transport.
  const passThrough = async (req: express.Request, res: express.Response) => {
    const header = req.headers["mcp-session-id"];
    const transport = typeof header === "string" ? sessions.get(header) : undefined;
    if (!transport) {
      res
        .status(404)
        .json({ jsonrpc: "2.0", error: { code: -32001, message: "Session not found" }, id: null });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  };
  app.get("/mcp", passThrough);
  app.delete("/mcp", passThrough);

  const port = Number(process.env.PORT ?? 3001);
  app.listen(port, () => {
    console.error(
      `[mcp-server-starter] streamable HTTP listening on http://localhost:${port}/mcp`,
    );
  });
}