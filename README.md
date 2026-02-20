# Directus MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/introduction) server that connects your AI assistant (Claude, Cursor, etc.) to a Directus instance. Ask your AI to read content, manage schema, create automation flows, and more — all through natural language.

## ✨ Features

- **Content Management** — Read, create, and update items across your Directus collections
- **Schema Management** — Create and modify collections, fields, and relations
- **Flow Automation** — Build and trigger Directus flows with operations and conditions
- **Safe Defaults** — Destructive operations (delete, system modifications) are disabled by default
- **Scoped Access** — Exclude sensitive collections from AI access via configuration

## 🚀 Quick Start

### Prerequisites

- A running Directus instance ([Directus Cloud](https://directus.cloud/register) or self-hosted)
- A Directus API token or user credentials

### Installation

#### Using npx (Recommended)

No installation needed. Add to your MCP client configuration (Claude Desktop / Claude Code / Cursor):

```json
{
  "mcpServers": {
    "directus": {
      "command": "npx",
      "args": ["-y", "@archawat/mcp-directus"],
      "env": {
        "DIRECTUS_URL": "https://your-instance.com",
        "DIRECTUS_TOKEN": "your-token"
      }
    }
  }
}
```

#### Global Install

```bash
npm install -g @archawat/mcp-directus
```

Then configure your MCP client:

```json
{
  "mcpServers": {
    "directus": {
      "command": "mcp-directus",
      "env": {
        "DIRECTUS_URL": "https://your-instance.com",
        "DIRECTUS_TOKEN": "your-token"
      }
    }
  }
}
```

## 🛠 Available Tools

### Discovery
- **`help`** - Overview of available tools and usage guidance
- **`list-collections`** - List all collection names
- **`count-items`** - Count items in a collection
- **`get-item-summary`** - Quick summary of items with key fields only

### Schema
- **`schema`** - Full schema for all collections
- **`read-collection-details`** - Schema for a single collection
- **`create-collection`** - Create a new collection

### Fields
- **`read-fields`** - All fields for a collection
- **`read-field`** - A single field's details
- **`create-field`** - Add a field to a collection
- **`update-field`** - Modify an existing field

### Relations
- **`read-relations`** - List relations, optionally filtered by collection
- **`read-relation`** - Details of a specific relation
- **`create-relation`** - Create a relation (M2O, O2M, M2M)
- **`update-relation`** - Update an existing relation
- **`delete-relation`** - Delete a relation ⚠️ *Disabled by default*

### Flows
- **`read-flows`** - List all flows, optionally filtered by trigger type
- **`read-flow`** - Details of a specific flow
- **`create-flow`** - Create a new automation flow
- **`update-flow`** - Update an existing flow
- **`delete-flow`** - Delete a flow ⚠️ *Disabled by default*
- **`trigger-flow`** - Manually trigger a flow

### Operations (Flow Steps)
- **`read-operations`** - List operations, optionally filtered by flow
- **`read-operation`** - Details of a specific operation
- **`create-operation`** - Add an operation to a flow
- **`update-operation`** - Modify an existing operation
- **`delete-operation`** - Delete an operation ⚠️ *Disabled by default*

### Items
- **`users-me`** - Current authenticated user info
- **`read-items`** - Read items from a collection
- **`create-item`** - Create a new item ⚠️ *System collections protected by default*
- **`update-item`** - Update an existing item ⚠️ *System collections protected by default*

## 🔧 Configuration

### Environment Variables

```bash
# Required
DIRECTUS_URL=https://your-instance.com
DIRECTUS_TOKEN=your-token
# OR use email/password instead of token
DIRECTUS_USER_EMAIL=user@example.com
DIRECTUS_USER_PASSWORD=password

# Disable specific tools (comma-separated)
DISABLE_TOOLS=delete-item,delete-flow,delete-operation,delete-relation

# Exclude collections from AI access (comma-separated)
SCHEMA_EXCLUDE_COLLECTIONS=logs,cache,temp_data

# Allow modifying Directus system collections (disabled by default)
ALLOW_SYSTEM_MODIFICATIONS=false
```

### `SCHEMA_EXCLUDE_COLLECTIONS`

Excludes specific collections from schema loading and all tool operations. Useful for:

- **Performance** — Skip large log or cache collections
- **Security** — Prevent AI access to sensitive data
- **Focus** — Limit the AI to only relevant collections

```bash
SCHEMA_EXCLUDE_COLLECTIONS=activity_logs,cache,temp_uploads,user_sessions
```

### `ALLOW_SYSTEM_MODIFICATIONS`

Controls whether the AI can modify Directus system collections (`directus_users`, `directus_roles`, `directus_permissions`, etc.). **Disabled by default.**

- `false` (default) — Blocks create/update on system collections
- `true` — Allows system collection modifications ⚠️ Use with caution; incorrect changes can break your Directus instance

### `DISABLE_TOOLS`

Comma-separated list of tool names to disable. Defaults to `delete-item` being disabled.

```bash
# Disable all destructive operations
DISABLE_TOOLS=delete-item,delete-flow,delete-operation,delete-relation
```

## 🏗 Local Development

```bash
git clone https://github.com/archawat/mcp-directus
cd mcp-directus
pnpm install
pnpm build
pnpm dev
```

For local MCP client testing, use the local path:

```json
{
  "mcpServers": {
    "directus": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-directus/dist/index.js"],
      "env": {
        "DIRECTUS_URL": "https://your-instance.com",
        "DIRECTUS_TOKEN": "your-token"
      }
    }
  }
}
```

## 🤝 Contributing

Please open issues for bugs or suggestions.

## 📝 License

MIT

## 🙏 Acknowledgments

- Original project by [@rijkvanzanten](https://github.com/rijkvanzanten) and the Directus team
