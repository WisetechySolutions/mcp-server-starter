# mcp-server-starter

A production-grade starting point for a
[Model Context Protocol](https://modelcontextprotocol.io) server —
**stdio and Streamable HTTP from one codebase**, zod-validated tools,
real error handling, hermetic client-level tests, and an MCPB manifest
for one-click install in Claude Desktop.

Two worked example tools, each teaching a real pattern:

- `get_weather` — wrap an external API, shape the result, fail usefully
  (runs with zero API keys)
- `notes_add / notes_list / notes_get / notes_delete` — own state, CRUD,
  input validation, safe destructive naming

## Quick start

```bash
npm install
npm run smoke        # build + hermetic client-level tests (3/3 as shipped)
npm start            # stdio — Claude Desktop, Cursor, ...
npm start -- --http  # Streamable HTTP on http://localhost:3001/mcp
```

The Streamable HTTP path is wire-verified (initialize → tools/list →
DELETE round trip against the current SDK).

## What this repo doesn't include

This starter ships free from the full kit, which adds:

- the **Python twin** starter (same patterns, one file)
- the **tool-design guide** — naming, schemas, failure modes, and why LLM
  clients misuse badly-designed tools
- the **July 2026 spec-transition map** — the stateless core explained,
  what breaks (nothing yet), and the two independent migrations everyone
  confuses
- a **spec-driven generator** — describe tools in JSON, get a working,
  test-verified server out
- **packaging + deploy configs** — `.mcpb` one-click packaging, Dockerfile,
  systemd unit, Procfile
- a **service-intake template** if you want to sell builds yourself

→ The full kit: **https://wisetechysolutions.github.io/mcp-server-starter/**

## License

MIT for this repository. The full kit is a separate product under its own
license.