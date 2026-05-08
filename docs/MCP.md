# MCP server

Humanizer ships a stdio MCP server for Claude Desktop, VS Code/Cursor-style clients, OpenClaw MCP bridges, and other Model Context Protocol clients.

The server exposes Humanizer as tools so an assistant can score or revise text without shelling out manually.

## Install

From a checkout:

```bash
git clone https://github.com/markus-lassfolk/humanizer.git
cd humanizer
npm install
cd mcp-server
npm install
```

Run manually:

```bash
node index.js
```

The process should stay running and print a short startup message on stderr. MCP clients normally start it for you.

## Claude Desktop

Add an entry like this to your Claude Desktop config.

macOS path:

```text
~/Library/Application Support/Claude/claude_desktop_config.json
```

Example:

```json
{
  "mcpServers": {
    "humanizer": {
      "command": "node",
      "args": ["/absolute/path/to/humanizer/mcp-server/index.js"]
    }
  }
}
```

Restart Claude Desktop after editing the file.

## VS Code / Cursor-style config

Exact MCP settings vary by extension/client. The common shape is:

```json
{
  "mcp.servers": {
    "humanizer": {
      "command": "node",
      "args": ["/absolute/path/to/humanizer/mcp-server/index.js"]
    }
  }
}
```

If your client supports workspace-relative paths, use its documented variable syntax. Otherwise prefer an absolute path.

## OpenClaw and similar agent systems

If your agent platform can launch MCP stdio servers, point it at:

```text
node /absolute/path/to/humanizer/mcp-server/index.js
```

Pair this with `SKILL.md` if you want both:

- tool access through MCP; and
- writing-style instructions through the agent prompt/skill system.

See [AGENTS.md](AGENTS.md) for the skill/prompt side.

## Tools

### `score`

Quick 0-100 score. Higher means more AI-like.

Input:

```json
{
  "text": "This serves as a testament to innovation.",
  "locale": "en"
}
```

### `analyze`

Full analysis with pattern matches, category scores, and statistics.

Input:

```json
{
  "text": "I dagens snabbt föränderliga digitala landskap...",
  "locale": "sv",
  "verbose": true
}
```

### `humanize`

Suggestions and optional safe autofix.

Input:

```json
{
  "text": "Great question! This comprehensive solution plays a crucial role...",
  "locale": "en",
  "autofix": true
}
```

### `stats`

Statistical text analysis only.

Input:

```json
{
  "text": "Text to analyze...",
  "locale": "en"
}
```

## Locales

All tools accept:

```json
{
  "locale": "en"
}
```

or:

```json
{
  "locale": "sv"
}
```

Use `sv` for Swedish text. The server does not silently auto-detect language.

## Troubleshooting

### Server does not appear in the client

- Use an absolute path to `mcp-server/index.js`.
- Confirm Node.js is version 18 or newer.
- Run `node /absolute/path/to/humanizer/mcp-server/index.js` manually and check for errors.
- Restart the MCP client after changing config.

### Tool calls fail with locale errors

Only `en` and `sv` are supported runtime locales today. Use `sv-se` for the skill folder name, but `sv` for MCP calls.

### Results look wrong for Swedish

Make sure the call includes `locale: "sv"`. English is the default.
