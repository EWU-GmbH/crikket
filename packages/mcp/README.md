# Crikket MCP

Stdio MCP server that lets Cursor read and update private Crikket bug reports using an organization API token.

## Setup

1. In Crikket, open **Settings → API Tokens** and create a token (admin/owner).
2. Copy the secret once (prefix `crk_api_…`).
3. This repo already ships project MCP config at `.cursor/mcp.json`, which runs `scripts/crikket-mcp.sh`.
4. Set the token in the environment Cursor uses for MCP (Cloud Agent secret name `crikket`, or `CRIKKET_API_TOKEN`).

Manual / user-level config (`~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "crikket": {
      "command": "${workspaceFolder}/scripts/crikket-mcp.sh",
      "env": {
        "CRIKKET_API_TOKEN": "crk_api_…",
        "CRIKKET_SERVER_URL": "https://api.crikket.io"
      }
    }
  }
}
```

For self-hosted Crikket, set `CRIKKET_SERVER_URL` to your API origin (the same host that serves `/rpc`).
## Tools

| Tool | Description |
| --- | --- |
| `list_bug_reports` | Search/filter reports in the token's organization |
| `get_bug_report` | Full report details (title, description, device, status) |
| `get_bug_report_context` | Compressed logs, actions, and network requests |
| `update_bug_report` | Update status/priority/title/tags (needs `bug-reports:write`) |

## Example prompt

> Use Crikket MCP to load report `br_…`, summarize the failing network calls, and fix the bug in this repo.
