import { describe, it, expect, beforeEach } from "vitest";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../src/server.js";

/**
 * Client-level smoke tests over an in-memory transport pair — the same
 * protocol a real client speaks, without touching stdio, HTTP, or the network.
 */

async function connect() {
  const server = createServer();
  const client = new Client({ name: "smoke-client", version: "0.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, server };
}

describe("mcp-server-starter", () => {
  beforeEach(() => {
    // Hermetic: every test gets its own throwaway store.
    process.env.NOTES_PATH = path.join(tmpdir(), `mcp-starter-notes-${randomUUID()}.json`);
  });

  it("lists every registered tool", async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    for (const expected of [
      "get_weather",
      "notes_add",
      "notes_list",
      "notes_get",
      "notes_delete",
    ]) {
      expect(names).toContain(expected);
    }
  });

  it("runs a notes add → list roundtrip", async () => {
    const { client } = await connect();
    await client.callTool({ name: "notes_add", arguments: { title: "Hello kit", body: "First note" } });
    const result = await client.callTool({ name: "notes_list", arguments: {} });
    const text = JSON.stringify(result.content);
    expect(text).toContain("Hello kit");
  });

  it("returns a clean error for an unknown note id", async () => {
    const { client } = await connect();
    const result = await client.callTool({ name: "notes_get", arguments: { id: "does-not-exist" } });
    expect(result.isError).toBe(true);
  });
});