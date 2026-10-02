import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { startHttp } from "./http.js";

/**
 * Entry point. Two flavors from one codebase:
 *  - stdio (default): local servers — Claude Desktop, Claude Code,Cursor, etc.
 *  - streamable HTTP: remote servers — pass --http or set MCP_TRANSPORT=http
 */
async function main(): Promise<void> {
  const useHttp = process.argv.includes("--http") || process.env.MCP_TRANSPORT === "http";

  if (useHttp) {
    await startHttp(); // long-lived; resolves never
    return;
  }

  const server = createServer();
  await server.connect(new StdioServerTransport());
  // console.error, not console.log: stdout is the protocol channel in stdio mode.
  console.error("[mcp-server-starter] running on stdio");
}

main().catch((error) => {
  console.error("[mcp-server-starter] fatal:", error);
  process.exit(1);
});