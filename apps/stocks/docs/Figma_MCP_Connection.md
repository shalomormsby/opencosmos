# Figma MCP Connection Guide

## Overview

The Figma MCP (Model Context Protocol) server brings Figma design context directly into AI-powered coding workflows. It allows LLMs and AI coding assistants to access design information, generate code from Figma frames, extract design variables, and leverage component data—all without leaving your development environment.

**Official Documentation:** [Figma MCP Server Developer Docs](https://developers.figma.com/docs/figma-mcp-server/)

## Two Connection Options

Figma offers two ways to connect via MCP:

### 1. Desktop MCP Server (Local)
- Runs locally at `http://127.0.0.1:3845/mcp`
- Requires Figma desktop app
- Best for: Working with local files, offline access, lower latency
- Selection-based workflow (select frames in Figma)

### 2. Remote MCP Server (Cloud)
- Connects to `https://mcp.figma.com/mcp`
- No desktop app required
- Best for: Remote work, browser-based workflows, sharing access
- Link-based workflow (paste Figma URLs)

## Can Multiple LLMs Connect Simultaneously?

**Yes, multiple LLMs can connect to the same Figma MCP server at the same time.**

### How It Works

The Model Context Protocol uses a client-server architecture where each client (LLM/code editor) maintains its own independent connection to the MCP server. There's no inherent limitation preventing multiple clients from connecting concurrently.

**For Desktop Server (`http://127.0.0.1:3845/mcp`):**
- Multiple applications on the **same machine** can connect simultaneously
- For example: Claude Code, Cursor, and VS Code can all connect to the desktop server running on your computer at the same time
- Each maintains its own session and can request design context independently

**For Remote Server (`https://mcp.figma.com/mcp`):**
- Multiple clients across different machines/browsers can connect
- Each client authenticates with their own Figma account credentials
- Rate limits apply per user/seat, not per connection
- Standard Figma API rate limits apply (same as Tier 1 REST API)

### Why Gemini/Antigravity Might Fail to Connect

If Google Gemini (Antigravity) failed to connect, the most likely causes are:

1. **Different Configuration Format:** Antigravity uses a JSON-based configuration file (`mcp_config.json`) rather than command-line setup
2. **Missing Authentication:** The remote server wasn't properly authenticated through Antigravity's UI
3. **Desktop Server Not Running:** For desktop server, Figma app must be open with MCP server enabled
4. **Incorrect Configuration Syntax:** The JSON configuration might have syntax errors or wrong structure

See the [platform-specific setup sections](#platform-specific-setup-guides) below for detailed instructions for each LLM platform.

---

## Platform-Specific Setup Guides

The following sections provide tailored, step-by-step instructions for connecting Figma MCP to different LLM platforms. Each platform has its own configuration method and requirements.

### Quick Navigation
- [Claude Code Setup](#1-claude-code-setup) - Command-line based configuration
- [Google Antigravity (Gemini) Setup](#2-google-antigravity-gemini-setup) - JSON configuration with UI
- [Cursor Setup](#3-cursor-setup) - Settings-based JSON configuration

---

## 1. Claude Code Setup

**Configuration Method:** Command-line interface
**Difficulty:** Easy (2 commands)
**Best For:** Developers comfortable with terminal commands

### Desktop Server Setup

#### Prerequisites
1. Figma desktop app installed and updated
2. Claude Code installed (`npm install -g @anthropic-ai/claude-code` or via installer)
3. Figma Design file open in Dev Mode with MCP server enabled

#### Step-by-Step Instructions

1. **Enable Figma Desktop MCP Server:**
   - Open Figma desktop app
   - Open any Design file
   - Press `Shift + D` to enter Dev Mode
   - In the right panel (Inspect Panel), find "MCP server" section
   - Click **"Enable desktop MCP server"**
   - Wait for confirmation message

2. **Add Server to Claude Code:**
   ```bash
   claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
   ```

3. **Verify Installation:**
   ```bash
   claude mcp list
   ```
   You should see `figma-desktop` in the list.

4. **Test Connection:**
   - Open Claude Code
   - Type `/mcp` in a chat
   - You should see `figma-desktop` listed with a green status indicator

#### Common Issues & Fixes

**Issue:** "Connection refused" error
**Fix:** Ensure Figma desktop app is running and MCP server is enabled in Dev Mode

**Issue:** Server not appearing in `/mcp` list
**Fix:** Restart Claude Code after adding the server

### Remote Server Setup

1. **Add Remote Server:**
   ```bash
   claude mcp add --transport http figma https://mcp.figma.com/mcp
   ```

2. **Authenticate:**
   - Type `/mcp` in Claude Code
   - Select `figma` from the server list
   - Click **"Authenticate"**
   - Browser window will open
   - Log into Figma and click **"Allow Access"**
   - Return to Claude Code and confirm "Authentication successful"

3. **Test Connection:**
   - Copy a Figma frame link
   - In Claude Code, ask: "What's in this Figma design: [paste link]"
   - Claude should be able to access the design context

---

## 2. Google Antigravity (Gemini) Setup

**Configuration Method:** Native UI Integration (One-Click)
**Difficulty:** Very Easy
**Best For:** Gemini 3.0 users in Google's Antigravity IDE

### Simplified Setup (Recommended)

Antigravity now includes a direct integration for Figma Dev Mode.

1.  **Open Agent Menu:**
    - Click the **`...`** (more_horiz menu) button in the **Agent pane** (top right of the chat window).

2.  **Connect to Figma:**
    - Select **"Figma Dev Mode MCP"** from the menu.
    - Click **"Connect"**.
    - Follow the authentication prompt if requested.

3.  **Verify Connection:**
    - You should see a confirmation that the server is connected.
    - You can now immediately start using Figma commands like "Read this design node".

### Manual JSON Configuration (Legacy/Advanced)

*Note: Only use this if the automatic integration above fails or if you need custom arguments.*

1.  **Open MCP Configuration:**
    - Click **`...`** in the Agent pane → **"MCP Servers"**.
    - Click **"Manage MCP Servers"** → **"View raw config"**.

2.  **Add Server Entry:**
    Add the `figma-desktop` or `figma-remote` configuration to your `mcp_config.json` as shown in the [JSON examples below](#example-working-configuration).

---

## 3. Cursor Setup

**Configuration Method:** Settings-based JSON configuration
**Difficulty:** Easy (UI-based with JSON)
**Best For:** Cursor IDE users

### Desktop Server Setup

#### Prerequisites
1. [Cursor IDE](https://cursor.sh/) installed (latest version)
2. Figma desktop app with MCP server enabled

#### Step-by-Step Instructions

1. **Enable Figma Desktop MCP Server:**
   - Open Figma desktop app
   - Open a Design file and press `Shift + D` for Dev Mode
   - Enable "Desktop MCP server" in the inspect panel

2. **Open Cursor MCP Settings:**
   - Open Cursor IDE
   - Navigate to **Cursor → Settings → Cursor Settings**
   - Click on the **MCP** tab in the left sidebar

3. **Add Figma Server:**
   - Click **"Add new global MCP server"**
   - A JSON editor will appear
   - Add this configuration:

   ```json
   {
     "mcpServers": {
       "figma-desktop": {
         "url": "http://127.0.0.1:3845/mcp"
       }
     }
   }
   ```

4. **Save and Restart:**
   - Save the configuration
   - Restart Cursor completely (quit and relaunch)

5. **Verify Connection:**
   - Open a file in Cursor
   - Start a chat with Cursor's AI
   - The Figma MCP tools should now be available
   - Test by asking: "List available MCP tools"

### Remote Server Setup

1. **Quick Setup (Recommended):**
   - Visit the [Figma MCP deep link](https://cursor.directory/mcp/figma)
   - Click **"Install"** when prompted
   - Cursor will automatically configure the server

2. **Manual Setup:**
   - Go to **Cursor → Settings → Cursor Settings → MCP**
   - Add this configuration:

   ```json
   {
     "mcpServers": {
       "figma-remote": {
         "url": "https://mcp.figma.com/mcp"
       }
     }
   }
   ```

3. **Authenticate:**
   - In Cursor's MCP settings, find the Figma server
   - Click **"Connect"** next to Figma
   - Browser window opens
   - Select **"Open"** in the authentication dialog
   - Grant access permissions to your Figma account
   - Return to Cursor - connection should show as active

4. **Test Connection:**
   - Copy a Figma frame link
   - In Cursor chat, ask: "Generate TypeScript types for this Figma design: [paste link]"

### Common Issues & Fixes

**Issue:** Server not appearing after configuration
**Fix:**
- Ensure you completely quit and relaunched Cursor (not just closed windows)
- Check JSON syntax for errors (commas, brackets, quotes)
- Try removing and re-adding the server configuration

**Issue:** "Connection timeout" to desktop server
**Fix:**
- Verify Figma desktop app is running
- Confirm MCP server is enabled in Dev Mode
- Check firewall isn't blocking port 3845
- Try restarting Figma desktop app

**Issue:** Authentication not working for remote server
**Fix:**
- Clear browser cache and try authenticating again
- Ensure you're logged into Figma in your default browser
- Try using the deep link installation method instead of manual config

### Complete Configuration Example

Here's a complete Cursor MCP configuration with both Figma servers and other common servers:

```json
{
  "mcpServers": {
    "figma-desktop": {
      "url": "http://127.0.0.1:3845/mcp"
    },
    "figma-remote": {
      "url": "https://mcp.figma.com/mcp"
    }
  }
}
```

---

## Desktop MCP Server Setup

### Prerequisites
- **Figma Desktop App** (latest version) - [Download here](https://www.figma.com/downloads/)
- **MCP-compatible code editor**: VS Code, Cursor, Windsurf, or Claude Code
- An open Figma Design file

### Step 1: Enable the Desktop MCP Server in Figma

1. Launch the Figma desktop application
2. Open or create a **Design file** (not FigJam)
3. Toggle to **Dev Mode** using `Shift + D` or via the toolbar
4. In the **Inspect Panel** (right sidebar), find the **MCP server** section
5. Click **"Enable desktop MCP server"**
6. Look for the success message confirming activation

The local server will now run at: `http://127.0.0.1:3845/mcp`

### Step 2: Configure Your MCP Client

Choose your code editor/client:

#### For VS Code

1. Press `⌘ Shift P` (Mac) or `Ctrl Shift P` (Windows/Linux)
2. Search for and select **"MCP: Add Server"**
3. Choose **HTTP transport**
4. Enter server URL: `http://127.0.0.1:3845/mcp`
5. Assign Server ID: `figma-desktop`
6. Verify the configuration appears in your `mcp.json` file
7. Switch chat to **Agent mode** (`⌥⌘B` or `⌃⌘I`)
8. Test with the `#get_design_context` command

**Note:** Requires GitHub Copilot to be enabled in VS Code.

#### For Cursor

1. Navigate to **Cursor → Settings → Cursor Settings**
2. Open the **MCP** tab
3. Click **"Add new global MCP server"**
4. Add this configuration:

```json
{
  "mcpServers": {
    "figma-desktop": {
      "url": "http://127.0.0.1:3845/mcp"
    }
  }
}
```

5. Save and restart Cursor

#### For Claude Code

1. Open your terminal
2. Run this command:

```bash
claude mcp add --transport http figma-desktop http://127.0.0.1:3845/mcp
```

3. Restart Claude Code to apply changes
4. Verify installation by typing `/mcp` in a chat

**Useful Claude Code MCP commands:**
- `claude mcp list` — View all configured MCP servers
- `claude mcp get figma-desktop` — Get details for the Figma server
- `claude mcp remove figma-desktop` — Remove the server

### Step 3: Configure MCP Settings (Optional)

Access advanced settings in Figma:
1. Go to **Figma → Preferences**
2. Find **"Desktop MCP server settings"**

**Image handling options:**
- **Local server mode** — Provides localhost image links
- **Download assets** — Writes images directly to your project folder
- **Placeholders** (deprecated) — Requires manual image replacement

**Code Connect:**
- Enable to include component mappings that reference your actual codebase components
- Helps maintain consistency between design and code

### Step 4: Using the Desktop Server

**Selection-based workflow:**
1. Select a frame or component in Figma (while in Dev Mode)
2. In your code editor, ask the AI to implement the selected design
3. The MCP server automatically provides the design context

**Link-based workflow:**
1. Right-click a frame or layer in Figma
2. Select **"Copy link"**
3. Paste the link in your prompt to the AI
4. The tool extracts the `node-id` automatically from the URL

---

## Remote MCP Server Setup

### Prerequisites
- MCP-compatible code editor (VS Code, Cursor, or Claude Code)
- A Figma account with access to the files you want to reference
- Internet connection

### Step 1: Configure Your MCP Client

Choose your code editor/client:

#### For VS Code

1. Press `⌘ Shift P` (Mac) or `Ctrl Shift P` (Windows/Linux)
2. Select **"MCP: Open User Configuration"** (global) or **"MCP: Open Workspace Folder MCP Configuration"** (workspace-specific)
3. Add this configuration to your `mcp.json`:

```json
{
  "inputs": [],
  "servers": {
    "figma": {
      "url": "https://mcp.figma.com/mcp",
      "type": "http"
    }
  }
}
```

4. Click **Start** above the MCP server name
5. Select **"Allow Access"** when prompted for authentication
6. Begin using the Figma tools

#### For Cursor

1. Use the [Figma MCP deep link](https://cursor.directory/mcp/figma) to open configuration
2. Choose **"Install"** when prompted
3. Click **"Connect"** next to Figma to authenticate
4. Select **"Open"** in the authentication dialog
5. Grant access permissions
6. Start prompting with Figma links

#### For Claude Code

1. Open your terminal and run:

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

2. Type `/mcp` in Claude to manage MCP servers
3. Select **Figma** from the list
4. Choose **"Authenticate"**
5. Click **"Allow Access"** in the browser window that opens
6. Confirm you see **"Authentication successful"**
7. Verify the connection by running `/mcp` again

### Step 2: Using the Remote Server

**Link-based workflow:**
1. Open any Figma file in your browser or desktop app
2. Right-click a frame, component, or layer
3. Select **"Copy link"**
4. Paste the link in your prompt to the AI coding assistant

Example Figma URL format:
```
https://figma.com/design/[fileKey]/[fileName]?node-id=1-2
```

The MCP server automatically extracts the `node-id` (e.g., `1:2`) and fetches the design context.

---

## Available Figma MCP Tools

Once connected, the following tools are available to LLMs:

### Core Tools

1. **`get_design_context`**
   - Generates UI code for a selected node
   - Accepts `nodeId` parameter (e.g., `"1:2"`)
   - Returns design specs, styles, and generated code
   - If no `nodeId` provided, uses currently selected node (desktop only)

2. **`get_screenshot`**
   - Generates a screenshot/image of a Figma node
   - Useful for visual reference alongside code
   - Accepts `nodeId` parameter

3. **`get_variable_defs`**
   - Retrieves design variable definitions (colors, spacing, typography)
   - Returns data like `{'icon/default/secondary': '#949494'}`
   - Essential for maintaining design system consistency

4. **`get_metadata`**
   - Returns XML structure overview of a node or page
   - Includes layer types, names, positions, and sizes
   - Useful for understanding component hierarchy
   - Always prefer `get_design_context` unless you only need structure

5. **`get_figjam`**
   - Generates content from FigJam boards
   - Incorporates early-stage ideas, flows, or architecture maps
   - **Important:** Only works with FigJam files, not Design files

6. **`create_design_system_rules`**
   - Generates design system rules for the repository
   - Helps maintain consistency across implementations

---

## Use Cases

### 1. Generate Code from Design
Select a frame in Figma, then prompt:
> "Implement this login form using React and Tailwind CSS"

### 2. Extract Design Tokens
> "What are the color variables used in this design?"

### 3. Build Component Library
> "Generate a reusable Button component based on this Figma component"

### 4. Sync Design System
> "List all typography styles from the current file"

### 5. FigJam to Code
> "Convert this user flow diagram from FigJam into a Next.js routing structure"

---

## Troubleshooting

### Desktop Server Not Connecting

**Problem:** Cannot connect to `http://127.0.0.1:3845/mcp`

**Solutions:**
- Ensure Figma desktop app is running and updated to the latest version
- Confirm you're in **Dev Mode** (`Shift + D`)
- Verify "Enable desktop MCP server" is turned ON in the inspect panel
- Check if another application is using port 3845
- Restart Figma desktop app
- Restart your code editor

### Remote Server Authentication Failed

**Problem:** "Authentication failed" or "Not authorized"

**Solutions:**
- Ensure you're logged into Figma in your browser
- Try re-authenticating: Type `/mcp` → Select Figma → Choose "Authenticate"
- Clear browser cache and try again
- Verify you have access to the Figma file you're trying to reference
- Check that the file is not private/restricted

### "Node not found" Error

**Problem:** MCP server cannot find the specified node ID

**Solutions:**
- Ensure the Figma link is valid and not expired
- Verify you have access to the file
- Try copying the link again from Figma
- For desktop server: Ensure the file is open in Figma
- Check that the node ID format is correct (e.g., `"1:2"` not `"1-2"`)

### Tools Not Appearing in AI Assistant

**Problem:** Figma tools don't show up in VS Code/Cursor/Claude

**Solutions:**
- Verify MCP server is running: Type `/mcp` or check MCP settings
- Restart your code editor completely
- Check `mcp.json` configuration is correct
- For VS Code: Ensure GitHub Copilot is enabled
- Run `claude mcp list` to confirm server is registered (Claude Code)

---

## Best Practices

1. **Always work in Dev Mode** when using the desktop server
2. **Use specific frame links** rather than entire pages for better context
3. **Specify your tech stack** in prompts (e.g., "using React and TypeScript")
4. **Reference design variables** to maintain design system consistency
5. **Keep Figma files organized** with clear layer names for better code generation
6. **Update regularly** - Both Figma desktop app and your code editor should be on latest versions

---

## Resources

### Official Documentation
- [Figma MCP Server Introduction](https://developers.figma.com/docs/figma-mcp-server/)
- [Desktop Server Installation](https://developers.figma.com/docs/figma-mcp-server/local-server-installation/)
- [Remote Server Installation](https://developers.figma.com/docs/figma-mcp-server/remote-server-installation/)
- [Guide to the Figma MCP Server](https://help.figma.com/hc/en-us/articles/32132100833559-Guide-to-the-Figma-MCP-server)

### Tutorials & Guides
- [Figma Blog: Introducing MCP Server](https://www.figma.com/blog/introducing-figma-mcp-server/)
- [What is Model Context Protocol (MCP)?](https://www.figma.com/resource-library/what-is-mcp/)
- [Builder.io: Claude Code + Figma MCP Server](https://www.builder.io/blog/claude-code-figma-mcp-server)

### Platform-Specific Resources

**Google Antigravity:**
- [Google Antigravity Official Site](https://antigravity.google/)
- [Google Antigravity MCP Documentation](https://antigravity.google/docs/mcp)
- [Firebase MCP Server Documentation](https://firebase.google.com/docs/ai-assistance/mcp-server)
- [Tutorial: Getting Started with Google Antigravity](https://medium.com/google-cloud/tutorial-getting-started-with-google-antigravity-b5cc74c103c2)
- [Google Antigravity — Custom MCP Server Integration](https://medium.com/@jaintarun7/google-antigravity-custom-mcp-server-integration-to-improve-vibe-coding-f92ddbc1c22d)

**MCP Protocol & Multiple Connections:**
- [How to Connect Multiple MCP Servers to the Same LLM](https://milvus.io/ai-quick-reference/how-can-i-connect-multiple-model-context-protocol-mcp-servers-to-the-same-llm)
- [Connect Any LLM to Any MCP Server](https://blog.dailydoseofds.com/p/connect-any-llm-to-any-mcp-server)
- [Model Context Protocol Introduction](https://modelcontextprotocol.io/introduction)

### Community Resources
- [Figma MCP Server Guide (GitHub)](https://github.com/figma/mcp-server-guide)
- [Cursor Directory - Figma MCP](https://cursor.directory/mcp/figma)

---

## Version Information

- **Document Last Updated:** November 2025
- **Figma MCP Server:** Beta (officially launched 2025)
- **Supported Clients:** VS Code, Cursor, Windsurf, Claude Code
- **Protocol:** Model Context Protocol (MCP)

---

## Summary

The Figma MCP server bridges the gap between design and development by providing LLMs with direct access to Figma design context. Whether you choose the desktop server for local workflows or the remote server for cloud-based access, the setup process is straightforward and enables powerful design-to-code capabilities in your AI-powered development environment.

**Key Takeaways:**
- ✅ Multiple LLMs can connect to the same Figma MCP server simultaneously
- ✅ Each platform (Claude Code, Antigravity, Cursor) has its own configuration method
- ✅ Desktop server requires Figma app running with MCP enabled in Dev Mode
- ✅ Remote server requires authentication but works without the desktop app
- ✅ Configuration format varies: command-line (Claude Code) vs JSON (Antigravity, Cursor)

**Quick Setup Recommendations:**
- **Claude Code users:** Use the command-line method - fastest and simplest
- **Antigravity (Gemini) users:** Edit `mcp_config.json` through the UI, ensure you're in an Agent session
- **Cursor users:** Use Settings → MCP tab, or try the deep link for one-click setup

For the most up-to-date information, always refer to the [official Figma developer documentation](https://developers.figma.com/docs/figma-mcp-server/).
