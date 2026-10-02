import { promises as fs } from "node:fs";
import { randomUUID } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * The "state + CRUD" pattern: multiple operations over a local store,
 * with input validation and clean failure modes. Real tools often look
 * more like this than like a single stateless API call.
 */

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

/** Set NOTES_PATH to redirect the store (the tests do this). */
function storePath(): string {
  return process.env.NOTES_PATH ?? path.join(homedir(), ".mcp-starter-notes.json");
}

async function load(): Promise<Note[]> {
  try {
    return JSON.parse(await fs.readFile(storePath(), "utf8")) as Note[];
  } catch {
    return []; // missing or corrupt file => start from an empty store
  }
}

async function save(notes: Note[]): Promise<void> {
  await fs.writeFile(storePath(), JSON.stringify(notes, null, 2), "utf8");
}

function fmt(note: Note): string {
  return `### ${note.title}\nid: ${note.id} · updated: ${note.updatedAt}\n\n${note.body}`;
}

export function registerNotesTools(server: McpServer): void {
  server.registerTool(
    "notes_add",
    {
      title: "Add a note",
      description: "Create a note and return its id.",
      inputSchema: {
        title: z.string().min(1).describe("Short title for the note"),
        body: z.string().default("").describe("Note body (markdown is fine)"),
      },
    },
    async ({ title, body }) => {
      const notes = await load();
      const now = new Date().toISOString();
      const note: Note = { id: randomUUID(), title, body: body ?? "", createdAt: now, updatedAt: now };
      notes.push(note);
      await save(notes);
      return { content: [{ type: "text" as const, text: `Created note ${note.id}` }] };
    },
  );

  server.registerTool(
    "notes_list",
    {
      title: "List notes",
      description: "List saved notes, newest first. Optional substring filter on title or body.",
      inputSchema: {
        query: z.string().optional().describe("Optional substring filter"),
      },
    },
    async ({ query }) => {
      let notes = await load();
      if (query) {
        const q = query.toLowerCase();
        notes = notes.filter(
          (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q),
        );
      }
      notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      const text = notes.length === 0 ? "No notes found." : notes.map(fmt).join("\n\n");
      return { content: [{ type: "text" as const, text }] };
    },
  );

  server.registerTool(
    "notes_get",
    {
      title: "Read a note",
      description: "Read one note by id.",
      inputSchema: { id: z.string().describe("Note id from notes_add or notes_list") },
    },
    async ({ id }) => {
      const note = (await load()).find((n) => n.id === id);
      if (!note) throw new Error(`No note with id ${id}`);
      return { content: [{ type: "text" as const, text: fmt(note) }] };
    },
  );

  server.registerTool(
    "notes_delete",
    {
      title: "Delete a note",
      description: "Delete one note by id.",
      inputSchema: { id: z.string().describe("Note id to delete") },
    },
    async ({ id }) => {
      const notes = await load();
      const next = notes.filter((n) => n.id !== id);
      if (next.length === notes.length) throw new Error(`No note with id ${id}`);
      await save(next);
      return { content: [{ type: "text" as const, text: `Deleted note ${id}` }] };
    },
  );
}