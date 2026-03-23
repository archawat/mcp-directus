# Directus MCP Server

An [MCP (Model Context Protocol)](https://modelcontextprotocol.io/introduction) server that connects your AI assistant (Claude, Cursor, etc.) to a Directus instance. Ask your AI to read content, manage schema, create automation flows, and more — all through natural language.

## Features

- **Content Management** — Read, create, and update items across your Directus collections
- **Schema Management** — Create and modify collections, fields, and relations
- **Flow Automation** — Build and trigger Directus flows with operations and conditions
- **File Management** — Read, update, and import files and assets
- **User & Comments** — Read users and manage comments on collection items
- **Content Conversion** — Convert between HTML and Markdown
- **Prompt Management** — Serve LLM prompts from a Directus collection (optional)
- **Safe Defaults** — Destructive operations (delete) are disabled by default
- **Scoped Access** — Exclude sensitive collections from AI access via configuration

## Quick Start

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

## Available Tools

### Discovery

| Tool | Description |
|------|-------------|
| `directus_help` | Overview of available tools and token-efficiency guidance |
| `directus_list_collections` | List all collection names (lightweight) |
| `directus_count_items` | Count items in a collection without fetching data |
| `directus_get_item_summary` | Quick summary of items with key fields only |

### Schema

| Tool | Description |
|------|-------------|
| `directus_read_collection_schema` | Schema for a single collection (preferred) |
| `directus_read_collections` | Full schema for all collections (large response — use sparingly) |
| `directus_create_collection` | Create a new collection or folder |

### Fields

| Tool | Description |
|------|-------------|
| `directus_read_fields` | All fields for a collection |
| `directus_read_field` | A single field's details |
| `directus_create_field` | Add a field to a collection |
| `directus_update_field` | Modify an existing field |

### Relations

| Tool | Description |
|------|-------------|
| `directus_read_relations` | List relations, optionally filtered by collection |
| `directus_read_relation` | Details of a specific relation |
| `directus_create_relation` | Create a relation (M2O, O2M, M2M, M2A) |
| `directus_update_relation` | Update an existing relation |
| `directus_delete_relation` | Delete a relation *(disabled by default)* |

### Items

| Tool | Description |
|------|-------------|
| `directus_read_items` | Read items from a collection with filtering, sorting, and pagination |
| `directus_create_item` | Create a new item *(system collections protected by default)* |
| `directus_update_item` | Update an existing item *(system collections protected by default)* |
| `directus_delete_item` | Delete an item *(disabled by default)* |

### Flows

| Tool | Description |
|------|-------------|
| `directus_read_flows` | List all flows, optionally filtered by trigger type |
| `directus_read_flow` | Details of a specific flow |
| `directus_create_flow` | Create a new automation flow |
| `directus_update_flow` | Update an existing flow |
| `directus_delete_flow` | Delete a flow *(disabled by default)* |
| `directus_trigger_flow` | Manually trigger a flow |

### Operations (Flow Steps)

| Tool | Description |
|------|-------------|
| `directus_read_operations` | List operations, optionally filtered by flow |
| `directus_read_operation` | Details of a specific operation |
| `directus_create_operation` | Add an operation to a flow |
| `directus_update_operation` | Modify an existing operation |
| `directus_delete_operation` | Delete an operation *(disabled by default)* |

### Users

| Tool | Description |
|------|-------------|
| `directus_users_me` | Current authenticated user info |
| `directus_read_users` | Read user data with filtering and field selection |

### Comments

| Tool | Description |
|------|-------------|
| `directus_read_comments` | Read comments on collection items |
| `directus_upsert_comment` | Create or update a comment on an item |

### Files & Assets

| Tool | Description |
|------|-------------|
| `directus_read_files` | Read file metadata or raw file content |
| `directus_update_files` | Update file metadata (batch supported) |
| `directus_import_file` | Import a file from a URL |
| `directus_read_folders` | List file folders |

### Utilities

| Tool | Description |
|------|-------------|
| `directus_markdown` | Convert between HTML and Markdown |

### Prompts (Optional)

| Tool | Description |
|------|-------------|
| `directus_system_prompt` | Retrieve system prompt with operational guidelines *(enabled by default)* |
| `directus_get_prompts` | Retrieve LLM prompts from a Directus collection *(disabled by default)* |

## Configuration

### Environment Variables

```bash
# Required — Directus instance URL
DIRECTUS_URL=https://your-instance.com

# Authentication (use token OR email/password)
DIRECTUS_TOKEN=your-token
DIRECTUS_USER_EMAIL=user@example.com
DIRECTUS_USER_PASSWORD=password

# Disable specific tools (comma-separated, uses full tool names)
# Default: directus_delete_item
DISABLE_TOOLS=directus_delete_item,directus_delete_flow,directus_delete_operation,directus_delete_relation

# Exclude collections from AI access (comma-separated)
SCHEMA_EXCLUDE_COLLECTIONS=logs,cache,temp_data

# Allow modifying Directus system collections (disabled by default)
ALLOW_SYSTEM_MODIFICATIONS=false

# System prompt configuration
MCP_SYSTEM_PROMPT_ENABLED=true          # Enable the system prompt tool (default: true)
MCP_SYSTEM_PROMPT=                       # Custom system prompt override (optional)

# LLM Prompts collection (disabled by default)
DIRECTUS_PROMPTS_COLLECTION_ENABLED=false
DIRECTUS_PROMPTS_COLLECTION=prompts              # Collection name storing LLM prompts
DIRECTUS_PROMPTS_NAME_FIELD=name                 # Field for prompt name
DIRECTUS_PROMPTS_DESCRIPTION_FIELD=description   # Field for prompt description
DIRECTUS_PROMPTS_SYSTEM_PROMPT_FIELD=system_prompt  # Field for system prompt text
DIRECTUS_PROMPTS_MESSAGES_FIELD=messages          # Field for prompt messages
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

- `false` (default) — Blocks create/update on system collections (read is always allowed)
- `true` — Allows system collection modifications. Use with caution; incorrect changes can break your Directus instance

### `DISABLE_TOOLS`

Comma-separated list of tool names to disable. Default: `directus_delete_item`.

```bash
# Disable all destructive operations
DISABLE_TOOLS=directus_delete_item,directus_delete_flow,directus_delete_operation,directus_delete_relation
```

### `DIRECTUS_PROMPTS_COLLECTION_ENABLED`

When enabled, exposes the `directus_get_prompts` tool which reads LLM prompts from a Directus collection. Requires `DIRECTUS_PROMPTS_COLLECTION` to specify the collection name. The field mapping variables (`*_FIELD`) let you customize which fields store the prompt name, description, system prompt, and messages.

## Local Development

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

## Contributing

Please open issues for bugs or suggestions.

## License

MIT

## Acknowledgments

- Original project by [@rijkvanzanten](https://github.com/rijkvanzanten) and the Directus team
