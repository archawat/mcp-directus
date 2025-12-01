# Optimized Directus MCP Server

A highly optimized [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) server for Directus that prioritizes token efficiency and performance.

## ✨ Key Features

- **Token-Efficient**: Reduced token usage by 97% through lazy loading and optimized responses
- **Memory-Safe**: On-demand schema loading prevents MCP buffer overflow
- **Field Management**: Safe field creation with automatic interface defaults
- **Relation Management**: Full M2O, O2M, M2M relation support with proper linking
- **Flow Automation**: Create and manage Directus flows with operations, triggers, and conditions
- **No Debug Clutter**: Clean, production-ready output

## 🚀 Quick Start

### Prerequisites

- An existing Directus project ([Directus Cloud](https://directus.cloud/register) or local instance)

### Installation

#### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "directus": {
      "command": "npx",
      "args": ["mcp-directus@latest"],
      "env": {
        "DIRECTUS_URL": "https://your-directus-url.com",
        "DIRECTUS_TOKEN": "your-directus-token"
      }
    }
  }
}
```

Or with email/password:

```json
{
  "mcpServers": {
    "directus": {
      "command": "npx", 
      "args": ["mcp-directus@latest"],
      "env": {
        "DIRECTUS_URL": "https://your-directus-url.com",
        "DIRECTUS_USER_EMAIL": "user@example.com",
        "DIRECTUS_USER_PASSWORD": "your-password"
      }
    }
  }
}
```

## 🛠 Available Tools

### Token-Efficient Discovery
- **`help`** - Usage guide and best practices (~50 tokens)
- **`list-collections`** - Collection names only (~50 tokens)
- **`count-items`** - Item counts without data (~20 tokens)
- **`get-item-summary`** - Essential fields only (~200-500 tokens)

### Targeted Schema Tools
- **`read-collection-details`** - Single collection schema (~100-500 tokens)
- **`schema`** - Full schema (use with filters - can be large!)

### Collection Management
- **`create-collection`** - Create new collections with schema configuration

### Field Management (Safe)
- **`read-fields`** - Field definitions (use sparingly)
- **`read-field`** - Single field details
- **`create-field`** - Create fields with safe interface defaults
- **`update-field`** - Modify existing fields

### Relation Management
- **`read-relations`** - Read all relations or filter by collection
- **`read-relation`** - Read specific relation details
- **`create-relation`** - Create relations between collections (M2O, O2M, M2M)
- **`update-relation`** - Update existing relations
- **`delete-relation`** - Delete relations ⚠️ *Disabled by default*

### Flow Automation
- **`read-flows`** - List all flows or filter by trigger type
- **`read-flow`** - Read specific flow by ID
- **`create-flow`** - Create automation flows (manual, schedule, webhook, event, operation triggers)
- **`update-flow`** - Update existing flows
- **`delete-flow`** - Delete flows ⚠️ *Disabled by default*
- **`trigger-flow`** - Trigger manual flows with validation

Manual trigger options include:
- `location`: "both" | "collection" | "item" - where trigger button appears
- `requireSelection`: boolean - whether items must be selected
- `requireConfirmation`: boolean - show confirmation dialog

### Operation Management (Flow Steps)
- **`read-operations`** - Read all operations or filter by flow ID
- **`read-operation`** - Read specific operation by ID
- **`create-operation`** - Create operations within flows
- **`update-operation`** - Update existing operations (preferred for chaining)
- **`delete-operation`** - Delete operations ⚠️ *Disabled by default*

⚠️ **Important**: When adding operations to existing flows, create WITHOUT resolve/reject first, then use `update-operation` to chain them. Each operation can only be the target of ONE resolve pointer.

### Core Operations
- **`users-me`** - Current user info (~50 tokens)
- **`read-items`** - Read items (default limit: 5)
- **`create-item`** - Create new items ⚠️ *System collections protected by default*
- **`update-item`** - Update existing items ⚠️ *System collections protected by default*

## 🔧 Configuration Options

### Environment Variables

```bash
# Required: Directus connection
DIRECTUS_URL=https://your-instance.com
DIRECTUS_TOKEN=your-token
# OR
DIRECTUS_USER_EMAIL=user@example.com
DIRECTUS_USER_PASSWORD=password

# Optional: Tool management (comma-separated list)
DISABLE_TOOLS=delete-item,delete-flow,delete-operation,delete-relation

# Optional: Schema filtering
SCHEMA_EXCLUDE_COLLECTIONS=logs,cache,temp_data

# Optional: System safety
ALLOW_SYSTEM_MODIFICATIONS=false
```

### Configuration Details

#### `SCHEMA_EXCLUDE_COLLECTIONS`
Comma-separated list of collection names to exclude from schema loading and tool operations. Useful for:
- **Performance**: Skip large log/cache collections that aren't needed for content management
- **Security**: Hide sensitive collections from AI access
- **Focus**: Limit scope to only relevant collections

Example:
```bash
# Exclude system logs and temporary data
SCHEMA_EXCLUDE_COLLECTIONS=activity_logs,cache,temp_uploads,debug_info

# Exclude sensitive collections  
SCHEMA_EXCLUDE_COLLECTIONS=user_sessions,api_keys,internal_config
```

#### `ALLOW_SYSTEM_MODIFICATIONS`
Controls whether modifications to Directus system collections are allowed. **Disabled by default** for safety.

System collections include: `directus_users`, `directus_roles`, `directus_permissions`, `directus_fields`, `directus_collections`, etc.

- `false` (default): Blocks all create/update operations on system collections
- `true`: Allows modifications to system collections (⚠️ **Use with extreme caution**)

**Use cases for enabling:**
- Advanced automation that needs to manage users/roles programmatically  
- Schema migrations via AI assistance
- Custom Directus admin workflows

**⚠️ Warning:** Enabling this can break your Directus instance if system data is modified incorrectly. Only enable in development or with careful oversight.

#### Memory Management Protocol
The server includes an intelligent memory system for optimal performance:

- **DIRECTUS_MCP.md**: The AI automatically maintains a compact knowledge file in your project root
- **Purpose**: Stores discovered schemas, successful query patterns, and error solutions in token-efficient format
- **Benefits**: Reduces redundant API calls, prevents repeat errors, improves response accuracy
- **Format**: Uses abbreviated notation and compact structures to minimize token usage
- **File Operations**: Uses Write/Read tools only (never bash commands)
- **Permission Handling**: Gracefully continues if file write is denied, stores info in session memory
- **No Interruptions**: Never repeatedly asks for file permissions - respects your access controls

This memory system allows the AI to learn your Directus structure over time, making subsequent interactions faster and more accurate.

## 🎯 Performance Optimizations

### Before vs After
- **Original**: ~40,000 tokens per session (crashed MCP)
- **Optimized**: ~1,000 tokens per session (97% reduction)

### Key Improvements
1. **Lazy Schema Loading** - Schema fetched only when needed
2. **Token-Efficient Tools** - Lightweight alternatives for discovery
3. **Safe Field Creation** - Automatic interface defaults prevent broken UI
4. **Pagination by Default** - Limits data transfer
5. **Clean Logging** - No debug noise in production

## 🛡 Field Creation Safety

The server automatically sets appropriate interface defaults:
- `m2o` relations → `select-dropdown-m2o`
- `o2m` relations → `list-o2m` 
- `string` → `input`
- `boolean` → `boolean`
- And more...

This prevents "broken interface" issues in the Directus panel when creating relation fields.

## 🚦 Usage Best Practices

1. **Start Light**: Use `list-collections` and `count-items` first
2. **Be Specific**: Use `read-collection-details` for single collections
3. **Limit Results**: Keep item queries under 10 items when possible
4. **Use Summaries**: `get-item-summary` for quick overviews

## 🔄 Flow Automation Best Practices

### Creating Flows
1. Create the flow first with `create-flow`
2. Create operations one at a time with `create-operation`
3. Use `update-operation` to chain operations together
4. Link the first operation to the flow with `update-flow`

### Operation Chaining Rules
- Each operation can only be the target of ONE `resolve` and ONE `reject`
- Create operations WITHOUT resolve/reject, then chain with `update-operation`
- Cannot set resolve/reject to null - update chain to point elsewhere instead

### Data References
- `$last.field` - Data from immediately previous operation
- `{{operation_key.field}}` - Data from any named operation
- `{{operation_key[0].field}}` - First item from item-read arrays
- `{{$trigger.body.field}}` - Data from manual trigger confirmation

### Common Patterns
- Use `exec` operation to get timestamps before `item-update`
- Use `exec` + `condition` pattern to check array results (not `_nempty`)
- Always wrap multiple filters in `_and` or `_or`
- Always use underscore prefix for operators (`_eq`, `_gte`, etc.)

## 🔄 Changes from Original

This fork includes major performance, safety, and feature improvements:

- ✅ Removed all debug logging for clean output
- ✅ Implemented lazy schema loading to prevent crashes
- ✅ Added token-efficient discovery tools
- ✅ Enhanced field creation with safe interface defaults
- ✅ Optimized MCP protocol usage
- ✅ Added comprehensive error handling
- ✅ **NEW**: Full relation management (M2O, O2M, M2M)
- ✅ **NEW**: Flow automation with triggers (manual, schedule, webhook, event, operation)
- ✅ **NEW**: Operation management with chaining best practices
- ✅ **NEW**: Collection creation tool
- ✅ **NEW**: Enhanced system prompt with flow patterns and common mistakes

## 🏗 Local Development

```bash
git clone https://github.com/archawat/mcp-directus
cd mcp-directus
pnpm install
pnpm build
pnpm dev
```

Use in Claude Desktop with local path:
```json
{
  "mcpServers": {
    "directus": {
      "command": "node",
      "args": ["/path/to/mcp-directus/dist/index.js"],
      "env": {
        "DIRECTUS_URL": "your-url",
        "DIRECTUS_TOKEN": "your-token"
      }
    }
  }
}
```

## 📊 Memory Usage Comparison

| Tool | Original | Optimized | Savings |
|------|----------|-----------|---------|
| Collections List | 29,034 tokens | ~50 tokens | 99.8% |
| Item Query | 5,000+ tokens | ~500 tokens | 90% |
| Schema Fetch | 40,000+ tokens | On-demand | 100%* |

*Schema only loaded when specifically requested

## 🤝 Contributing

This is a performance-focused fork. Please open issues for bugs or optimization suggestions.

## 📝 License

MIT

## 🙏 Acknowledgments

- Original project by [@rijkvanzanten](https://github.com/rijkvanzanten) and the Directus team
- Performance optimizations for token efficiency and MCP stability