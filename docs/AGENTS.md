# OpenClaw and agent integration

Humanizer can help agent systems in two different ways:

1. **Tool mode** — the agent calls the CLI or MCP tools to score/analyze/humanize text.
2. **Always-on writing mode** — the agent loads `SKILL.md` plus a locale skill file and avoids AI writing patterns by default.

Use both when possible: MCP/CLI gives measurable checks, while the skill files improve first drafts.

## OpenClaw skill install

Keep `SKILL.md` and `locales/` together so relative links inside the skill work.

Example manual install:

```bash
mkdir -p ~/.openclaw/skills/humanizer
cp SKILL.md ~/.openclaw/skills/humanizer/SKILL.md
cp -R locales ~/.openclaw/skills/humanizer/
```

If your OpenClaw setup uses a different skills directory, copy the same structure there.

Expected layout:

```text
~/.openclaw/skills/humanizer/
├── SKILL.md
└── locales/
    ├── en-en/skill/en.md
    ├── en-us/skill/en.md
    ├── generic/references/patterns.md
    └── sv-se/skill/sv.md
```

## Choosing the right locale file

| Input language | Runtime locale | Skill file |
|---|---:|---|
| English | `en` | `locales/en-en/skill/en.md` or `locales/en-us/skill/en.md` |
| Swedish | `sv` | `locales/sv-se/skill/sv.md` |

For Swedish, be explicit. Use `--locale sv` in CLI calls or `locale: "sv"` in MCP calls.

## OpenClaw usage patterns

### On-demand editing

Ask the agent to use Humanizer when reviewing a draft:

```text
Use the humanizer skill on this text. It is Swedish, so use the sv-se guidance and CLI locale sv. Keep the meaning but remove AI writing tells.
```

### Always-on writing rules

Add a short version to the agent's persona/system file if you want every response to avoid obvious AI patterns:

```markdown
## Writing like a human

Avoid common AI tells: "delve", "tapestry", "crucial", "comprehensive",
"seamless", "groundbreaking", "In today's...", "It is worth noting",
"Great question", and "I hope this helps". Prefer concrete nouns, plain verbs,
specific evidence, and varied sentence length. Use "is" and "has" instead of
"serves as" and "boasts". End with specifics, not generic optimism.
```

For Swedish agents, merge in `locales/sv-se/skill/sv.md` or keep that file available to the skill loader.

### Tool-backed verification

For generated docs or release notes:

```bash
humanizer analyze --ignore-code -f README.md
humanizer scan docs --ext md --ignore-code --fail-above 45
```

For Swedish:

```bash
humanizer analyze --locale sv -f svensk-draft.md
```

## MCP in agent systems

If your agent platform supports MCP stdio servers, configure:

```text
node /absolute/path/to/humanizer/mcp-server/index.js
```

Then instruct the agent to call the `score`, `analyze`, `humanize`, or `stats` tools instead of guessing.

See [MCP.md](MCP.md).

## Other assistant frameworks

For systems without OpenClaw skills or MCP:

- use the CLI from shell-capable agents;
- paste `SKILL.md` plus the relevant locale file into the system/developer prompt;
- run `humanizer scan` as a CI step for generated documentation;
- require `--locale sv` for Swedish jobs rather than relying on auto-detection.

## CI bot pattern

A useful pull-request check:

```bash
humanizer scan . --ext md --ignore-code --fail-above 55
```

For mature repositories with existing AI-ish docs, use a baseline instead:

```bash
humanizer scan . --config .humanizer.json --json > .humanizer-baseline.json
humanizer scan . --config .humanizer.json --baseline .humanizer-baseline.json --fail-on-regression
```
