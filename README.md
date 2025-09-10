# Optimized Directus MCP Server

A highly optimized [Model Context Protocol](https://modelcontextprotocol.io/introduction) (MCP) server for Directus that prioritizes token efficiency and performance.

## ✨ Key Features

- **Token-Efficient**: Reduced token usage by 97% through lazy loading and optimized responses
- **Memory-Safe**: On-demand schema loading prevents MCP buffer overflow
- **Field Management**: Safe field creation with automatic interface defaults
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

### Field Management (Safe)
- **`read-fields`** - Field definitions (use sparingly)
- **`read-field`** - Single field details
- **`create-field`** - Create fields with safe interface defaults
- **`update-field`** - Modify existing fields

### Core Operations
- **`users-me`** - Current user info (~50 tokens)
- **`read-items`** - Read items (default limit: 5)
- **`create-item`** - Create new items
- **`update-item`** - Update existing items

## 🔧 Configuration Options

### Environment Variables

```bash
DIRECTUS_URL=https://your-instance.com
DIRECTUS_TOKEN=your-token
# OR
DIRECTUS_USER_EMAIL=user@example.com
DIRECTUS_USER_PASSWORD=password

# Optional: Disable specific tools
DISABLE_TOOLS=delete-item,update-field
```

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

## 🔄 Changes from Original

This fork includes major performance and safety improvements:

- ✅ Removed all debug logging for clean output
- ✅ Implemented lazy schema loading to prevent crashes
- ✅ Added token-efficient discovery tools
- ✅ Enhanced field creation with safe interface defaults
- ✅ Optimized MCP protocol usage
- ✅ Added comprehensive error handling

## 🏗 Local Development

```bash
git clone https://github.com/archawat/mcp-directus
cd mcp-directus
npm install
npm run build
npm run dev
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