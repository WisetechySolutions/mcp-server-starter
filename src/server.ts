import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerNotesTools } from "./tools/notes.js";
import { registerWeatherTool } from "./tools/weather.js";

export const SERVER_NAME = "mcp-server-starter";
export const SERVER_VERSION = "0.1.0";

/**
 * Server factory. Everything transport-related lives in index.ts/http.ts —
 * this file is only about capabilities. Register new tools here.
 */
export function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  // Two deliberate example patterns:
  //  - weather: call an external API, shape the result, handle failure
  //  - notes: local state, multiple operations (CRUD), input validation
  registerWeatherTool(server);
  registerNotesTools(server);

  // Error philosophy: handlers throw actionable messages (see guides/tool-design.md);
  // fatal transport errors surface through main().catch in index.ts.
  return server;
}