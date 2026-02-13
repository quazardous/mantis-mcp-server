# Mantis MCP Server

[![smithery badge](https://smithery.ai/badge/@kfnzero/mantis-mcp-server)](https://smithery.ai/server/@kfnzero/mantis-mcp-server)

Mantis MCP Server is a service based on the Model Context Protocol (MCP) for integrating with the Mantis Bug Tracker system. It provides a suite of tools that allow users to query and analyze data in the Mantis system through the MCP protocol.

<a href="https://glama.ai/mcp/servers/@kfnzero/mantis-mcp-server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@kfnzero/mantis-mcp-server/badge" alt="Mantis Server MCP server" />
</a>

## Features

- Issue Management
  - Get issue list (supports multiple filter conditions)
  - Query issue details by ID
- User Management
  - Query users by username
  - Get all users list
- Project Management
  - Get project list
- Statistics and Analysis
  - Issue statistics (supports multi-dimensional analysis)
  - Assignment statistics (analyze issue assignment status)
- Performance Optimization
  - Field selection (reduce returned data volume)
  - Pagination handling (control returned quantity per request)
  - Automatic data compression (auto-compress for large datasets)
- Complete error handling and logging

## Installation

### Installing via Smithery

To install Mantis Bug Tracker Integration for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@kfnzero/mantis-mcp-server):

```bash
npx -y @smithery/cli install @kfnzero/mantis-mcp-server --client claude
```

### Manual Installation
```bash
npm install mantis-mcp-server
```

## Configuration

1. Create a `.env` file in the project root directory:

```bash
# Mantis API Configuration
MANTIS_API_URL=https://your-mantis-instance.com/api/rest
MANTIS_API_KEY=your_api_key_here

# Application Configuration
NODE_ENV=development  # development, production, test
LOG_LEVEL=info       # error, warn, info, debug

# Cache Configuration
CACHE_ENABLED=true
CACHE_TTL_SECONDS=300  # 5 minutes

# Logging Configuration
LOG_DIR=logs
ENABLE_FILE_LOGGING=false
```

### How to Obtain MantisBT API Key

1. Log in to your MantisBT account
2. Click on your username in the top right corner and select "My Account"
3. Switch to the "API Tokens" tab
4. Click the "Create New Token" button
5. Enter a token name (e.g., MCP Server)
6. Copy the generated API token and paste it into the `MANTIS_API_KEY` setting in the `.env` file

## MCP Configuration

### Global Installation

First, you need to install mantis-mcp-server globally:

```bash
npm install -g mantis-mcp-server
```

### Windows Configuration

On Windows systems, edit `%USERPROFILE%\.cursor\mcp.json` (typically located at `C:\Users\YourUsername\.cursor\mcp.json`) and add the following configuration:

```json
{
  "mcpServers": {
    "mantis-mcp-server": {
      "type": "stdio",
      "command": "cmd",
      "args": [
        "/c",
        "node",
        "%APPDATA%\\npm\\node_modules\\mantis-mcp-server\\dist\\index.js"
      ],
      "env": {
        "MANTIS_API_URL": "YOUR_MANTIS_API_URL",
        "MANTIS_API_KEY": "YOUR_MANTIS_API_KEY",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

### macOS/Linux Configuration

On macOS or Linux systems, edit `~/.cursor/mcp.json` and add the following configuration:

```json
{
  "mcpServers": {
    "mantis-mcp-server": {
      "command": "npx",
      "args": [
        "-y",
        "mantis-mcp-server@latest",
      ],
      "env": {
        "MANTIS_API_URL": "YOUR_MANTIS_API_URL",
        "MANTIS_API_KEY": "YOUR_MANTIS_API_KEY",
        "NODE_ENV": "production",
        "LOG_LEVEL": "info"
      }
    }
  }
}
```

> Note: On macOS/Linux, we use npx to run the latest version of mantis-mcp-server, ensuring you always use the most recent version without needing a global installation.

### Environment Variable Descriptions

- `MANTIS_API_URL`: Your Mantis API URL
- `MANTIS_API_KEY`: Your Mantis API key
- `NODE_ENV`: Execution environment, recommended to set to "production"
- `LOG_LEVEL`: Log level, options: error, warn, info, debug

### Verifying Configuration

After configuration is complete, you can:

1. Reload Cursor MCP
2. Open the command palette (Windows: Ctrl+Shift+P, Mac: Cmd+Shift+P)

## Setting Up in Cursor

1. Add the following configuration to `.vscode/mcp.json`:

```json
{
  "servers": {
    "mantis-mcp-server": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"]
    }
  }
}
```

2. Add the following configuration to `.vscode/launch.json` for debugging:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "skipFiles": ["<node_internals>/**"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"],
      "runtimeExecutable": "npx",
      "runtimeArgs": [
        "-y",
        "@modelcontextprotocol/inspector",
        "node",
        "dist/index.js"
      ],
      "console": "integratedTerminal",
      "preLaunchTask": "npm: watch",
      "serverReadyAction": {
        "action": "openExternally",
        "pattern": "running at (https?://\\S+)",
        "uriFormat": "%s?timeout=60000"
      },
      "envFile": "${workspaceFolder}/.env"
    }
  ]
}
```

## API Tools Documentation

### 1. Get Issues List (get_issues)

Get a list of Mantis issues with support for filtering by multiple conditions.

**Parameters:**
- `projectId` (optional): Project ID
- `statusId` (optional): Status ID
- `handlerId` (optional): Handler ID
- `reporterId` (optional): Reporter ID
- `search` (optional): Search keyword
- `pageSize` (optional, default 20): Page size
- `page` (optional, default 0): Page number, starting from 1
- `select` (optional): Select fields to return, e.g., ['id', 'summary', 'description']. Can be used to reduce returned data volume

### 2. Get Issue Details (get_issue_by_id)

Get Mantis issue details by ID.

**Parameters:**
- `issueId`: Issue ID

### 3. Query User (get_user)

Query Mantis users by username.

**Parameters:**
- `username`: Username

### 4. Get Projects List (get_projects)

Get a list of Mantis projects.

**Parameters:** None

### 5. Get Issue Statistics (get_issue_statistics)

Get Mantis issue statistics, analyzed by different dimensions.

**Parameters:**
- `projectId` (optional): Project ID
- `groupBy`: Group by field, options: 'status', 'priority', 'severity', 'handler', 'reporter'
- `period` (default 'all'): Time range, options: 'all', 'today', 'week', 'month'

### 6. Get Assignment Statistics (get_assignment_statistics)

Get Mantis issue assignment statistics, analyzing issue distribution across users.

**Parameters:**
- `projectId` (optional): Project ID
- `includeUnassigned` (default true): Whether to include unassigned issues
- `statusFilter` (optional): Status filter, only count issues with specific statuses

### 7. Get All Users (get_users)

Get all users list using a brute force method.

**Parameters:** None

## Code Structure

### Higher-Order Functions
The service uses the `withMantisConfigured` higher-order function to handle common validation logic, ensuring:
- Mantis API configuration validation
- Unified error handling
- Standardized response format
- Automatic logging

### Error Handling
Comprehensive error handling mechanism includes:
- Mantis API error handling (including HTTP status codes)
- General error handling
- Structured error responses
- Detailed error logging

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch for changes)
npm run watch

# Run
npm start
```

## Logging

If file logging is enabled (`ENABLE_FILE_LOGGING=true`), log files will be saved to:

- `logs/mantis-mcp-server-combined.log`: Logs of all levels
- `logs/mantis-mcp-server-error.log`: Error level logs only

Log files have a maximum size of 5MB and keep up to 5 historical files.

## License

MIT

## References

@https://documenter.getpostman.com/view/29959/7Lt6zkP#c0c24256-341e-4649-95cb-ad7bdc179399 


# Publishing
npm login --registry=https://registry.npmjs.org/
npm run build
npm publish --access public --registry=https://registry.npmjs.org/

# Update version number
npm version patch  # Patch version 0.0.x
npm version minor  # Minor version 0.x.0
npm version major  # Major version x.0.0

# Republish
npm publish
