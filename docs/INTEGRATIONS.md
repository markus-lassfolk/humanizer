# Humanizer integrations

This page collects integration paths beyond the core CLI. For the main entry points, see:

- [CLI.md](CLI.md)
- [MCP.md](MCP.md)
- [AGENTS.md](AGENTS.md)
- [LANGUAGES.md](LANGUAGES.md)

## Choosing an integration

| Method | Best for | Notes |
|---|---|---|
| CLI | Local use, scripts, CI | Fastest setup; no daemon. |
| MCP server | Claude Desktop, VS Code/Cursor-style tools, OpenClaw MCP bridges | Lets assistants call `score`, `analyze`, `humanize`, and `stats`. |
| OpenClaw / agent skill | Always-on writing guidance | Copy `SKILL.md` with `locales/`. Pair with CLI/MCP for verification. |
| HTTP API | Custom apps and automations | Use the local API server if you want REST endpoints. |
| OpenAI Custom GPT | ChatGPT-only workflow | Use the instruction file and optional Actions schema. |

## Big Node codebase / CI-friendly scan

For monorepos, set scan defaults once and keep CI calls short.

`.humanizer.json`:

```json
{
  "scan": {
    "extensions": ["md", "txt"],
    "minWords": 30,
    "failAbove": 45,
    "ignoreDirs": ["generated", "vendor", "fixtures"],
    "ignoreCode": true
  }
}
```

CI command:

```bash
humanizer scan . --config .humanizer.json
```

Baseline mode for existing docs:

```bash
humanizer scan . --config .humanizer.json --json > .humanizer-baseline.json
humanizer scan . --config .humanizer.json --baseline .humanizer-baseline.json --fail-on-regression
```

## HTTP API server

Run locally:

```bash
cd humanizer
node api-server/server.js
```

Endpoints:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/score` | POST | Return score only |
| `/api/analyze` | POST | Return full analysis |
| `/api/humanize` | POST | Return suggestions + optional autofix |
| `/api/stats` | POST | Return stats only |
| `/api/openapi` | GET | Return OpenAPI schema |

Example:

```bash
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"text": "This draft needs tighter wording and more specifics.", "locale": "en"}'
```

## OpenAI Custom GPT

1. Go to <https://chat.openai.com/gpts/editor>.
2. Create a GPT.
3. Paste instructions from `openai-gpt/instructions.md`.
4. Name it, for example `Humanizer`.
5. Optional: add Actions using `api-server/openapi.yaml` or your deployed `/api/openapi` endpoint.

## Always-on writing mode

If you want an assistant to avoid common AI writing tells by default, put a short rule block in its system prompt/persona and keep the full skill nearby.

Minimal English prompt:

```text
Write like a human, not a generic AI. Avoid "delve", "tapestry", "crucial",
"comprehensive", "robust", "seamless", "groundbreaking", "In today's...",
"It is worth noting", "Great question", and "I hope this helps". Use plain
verbs, concrete details, varied sentence length, and specific endings.
```

For Swedish, use `locales/sv-se/skill/sv.md` and call tools with `locale: "sv"` / `--locale sv`.

## Troubleshooting

### Score looks off

Run verbose analysis and check the exact matches:

```bash
humanizer analyze -f draft.md --verbose
```

For Swedish, make sure you passed the locale:

```bash
humanizer analyze --locale sv -f draft.md --verbose
```

### MCP server is not connecting

See [MCP.md](MCP.md#troubleshooting).

### Agent skill links are broken

Keep `SKILL.md` and the `locales/` folder together. Relative links in the skill assume that layout.
