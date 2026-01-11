# Plugin System Design

> This document describes the PrismaX plugin system architecture design

---

## Overview

The plugin system allows third-party developers to extend PrismaX functionality, including:

- Custom tools
- Custom model providers
- Custom UI components
- Custom data processors

---

## Plugin Architecture

```
+-------------------------------------------------------------------------+
|                           PrismaX Plugin System                          |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------+     +-------------------+     +-------------------+
|  |  Plugin Registry  |     |  Plugin Loader    |     |  Plugin Sandbox   |
|  |                   |     |                   |     |                   |
|  +-------------------+     +-------------------+     +-------------------+
|           |                        |                        |           |
|           v                        v                        v           |
|  +-------------------------------------------------------------------+  |
|  |                         Plugin API Layer                          |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  |  | Tool API    |  | Model API   |  | UI API      |  | Data API    | |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Plugin Definition

### Plugin Manifest (manifest.json)

```json
{
  "name": "web-search",
  "version": "1.0.0",
  "displayName": "Web Search",
  "description": "Search the web using various search engines",
  "author": "PrismaX Team",
  "homepage": "https://github.com/prismax/plugin-web-search",
  "license": "Apache-2.0",
  "main": "dist/index.js",
  "prismax": {
    "minVersion": "1.0.0",
    "permissions": [
      "network",
      "storage"
    ],
    "provides": {
      "tools": ["web_search", "url_fetch"],
      "settings": true
    }
  }
}
```

### Plugin Entry

```typescript
// index.ts
import { Plugin, PluginContext } from '@prismax/plugin-sdk';

export default class WebSearchPlugin implements Plugin {
  name = 'web-search';
  version = '1.0.0';

  private context: PluginContext;

  async onLoad(context: PluginContext): Promise<void> {
    this.context = context;

    // Register tool
    context.registerTool({
      name: 'web_search',
      description: 'Search the web for information',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
          engine: {
            type: 'string',
            enum: ['google', 'bing', 'duckduckgo'],
            default: 'google',
          },
        },
        required: ['query'],
      },
      execute: this.executeSearch.bind(this),
    });

    // Register settings page
    context.registerSettings({
      component: () => import('./SettingsPage'),
    });
  }

  async onUnload(): Promise<void> {
    // Cleanup resources
  }

  private async executeSearch(params: {
    query: string;
    engine?: string;
  }): Promise<string> {
    const { query, engine = 'google' } = params;
    // Execute search logic
    const results = await this.search(query, engine);
    return JSON.stringify(results);
  }

  private async search(query: string, engine: string) {
    // Search implementation
  }
}
```

---

## Plugin API

### Tool API

```typescript
interface ToolDefinition {
  // Tool name (unique identifier)
  name: string;

  // Tool description (for AI understanding)
  description: string;

  // Parameter definition (JSON Schema)
  parameters: JSONSchema;

  // Execute function
  execute: (params: unknown) => Promise<string>;

  // Optional: requires user confirmation
  requireConfirmation?: boolean;

  // Optional: timeout in milliseconds
  timeout?: number;
}

// Register tool
context.registerTool(tool: ToolDefinition): void;

// Unregister tool
context.unregisterTool(name: string): void;
```

### Model API

```typescript
interface ModelProviderDefinition {
  // Provider ID
  id: string;

  // Display name
  displayName: string;

  // Icon
  icon?: string;

  // Supported capabilities
  capabilities: {
    chat: boolean;
    streaming: boolean;
    embedding: boolean;
    vision: boolean;
  };

  // Create client
  createClient: (config: ProviderConfig) => AIProvider;

  // Configuration form
  configSchema: JSONSchema;
}

// Register model provider
context.registerModelProvider(provider: ModelProviderDefinition): void;
```

### UI API

```typescript
interface UIExtension {
  // Extension slot
  slot: 'sidebar' | 'toolbar' | 'settings' | 'message-actions';

  // Component
  component: () => Promise<{ default: React.ComponentType }>;

  // Priority
  priority?: number;
}

// Register UI extension
context.registerUIExtension(extension: UIExtension): void;

// Show notification
context.showNotification(options: NotificationOptions): void;

// Show dialog
context.showDialog(options: DialogOptions): Promise<unknown>;
```

### Storage API

```typescript
// Plugin-specific storage
interface PluginStorage {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

// Get storage instance
const storage = context.getStorage();
```

### Network API

```typescript
// Network requests (sandbox restricted)
interface NetworkAPI {
  fetch(url: string, options?: RequestInit): Promise<Response>;
}

// Get network API
const network = context.getNetwork();
```

---

## Plugin Loader

### Loading Flow

```
1. Scan plugin directory
2. Read manifest.json
3. Verify plugin signature (optional)
4. Check permissions
5. Create sandbox environment
6. Load plugin code
7. Call onLoad
8. Register to plugin registry
```

### Implementation

```typescript
// plugins/loader.ts
class PluginLoader {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private registry: PluginRegistry;

  async loadPlugin(pluginPath: string): Promise<void> {
    // 1. Read manifest
    const manifest = await this.readManifest(pluginPath);

    // 2. Validate
    await this.validatePlugin(manifest);

    // 3. Check permissions
    const permissions = await this.checkPermissions(manifest);
    if (!permissions.granted) {
      throw new Error(`Plugin ${manifest.name} requires permissions: ${permissions.required}`);
    }

    // 4. Create context
    const context = this.createContext(manifest);

    // 5. Load code
    const PluginClass = await this.loadCode(pluginPath, manifest);

    // 6. Instantiate
    const plugin = new PluginClass();

    // 7. Call onLoad
    await plugin.onLoad(context);

    // 8. Register
    this.plugins.set(manifest.name, {
      manifest,
      instance: plugin,
      context,
    });

    this.registry.register(manifest.name, plugin);
  }

  async unloadPlugin(name: string): Promise<void> {
    const loaded = this.plugins.get(name);
    if (!loaded) return;

    // Call onUnload
    await loaded.instance.onUnload?.();

    // Cleanup registered content
    loaded.context.cleanup();

    // Remove from registry
    this.registry.unregister(name);

    this.plugins.delete(name);
  }

  private createContext(manifest: PluginManifest): PluginContext {
    return new PluginContextImpl(manifest, this.registry);
  }
}
```

---

## Plugin Sandbox

### Security Restrictions

| Restriction | Description |
|-------------|-------------|
| Filesystem | Can only access plugin directory and user-authorized directories |
| Network | Can only access whitelisted domains |
| System API | Prohibited from accessing sensitive system APIs |
| Memory | Memory usage limited |
| CPU | Execution time limited |

### Implementation

```typescript
// plugins/sandbox.ts
class PluginSandbox {
  private vm: VM;

  constructor(manifest: PluginManifest) {
    this.vm = new VM({
      timeout: 30000, // 30 second timeout
      sandbox: this.createSandbox(manifest),
    });
  }

  private createSandbox(manifest: PluginManifest) {
    const sandbox: Record<string, unknown> = {
      // Basic APIs
      console: this.createSafeConsole(),
      setTimeout: this.createSafeTimeout(),
      setInterval: this.createSafeInterval(),

      // Restricted fetch
      fetch: this.createSafeFetch(manifest.prismax.permissions),

      // Prohibited APIs
      process: undefined,
      require: undefined,
      __dirname: undefined,
      __filename: undefined,
    };

    return sandbox;
  }

  private createSafeFetch(permissions: string[]) {
    if (!permissions.includes('network')) {
      return undefined;
    }

    return async (url: string, options?: RequestInit) => {
      // Check URL whitelist
      if (!this.isAllowedUrl(url)) {
        throw new Error(`Network access to ${url} is not allowed`);
      }

      return fetch(url, options);
    };
  }

  private isAllowedUrl(url: string): boolean {
    // Check if URL is in whitelist
    const allowedDomains = [
      'api.openai.com',
      'api.anthropic.com',
      // ...
    ];

    const urlObj = new URL(url);
    return allowedDomains.some((domain) => urlObj.hostname.endsWith(domain));
  }
}
```

---

## Plugin Registry

```typescript
// plugins/registry.ts
class PluginRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private modelProviders: Map<string, ModelProviderDefinition> = new Map();
  private uiExtensions: Map<string, UIExtension[]> = new Map();

  // Tool registration
  registerTool(pluginName: string, tool: ToolDefinition): void {
    const key = `${pluginName}:${tool.name}`;
    this.tools.set(key, tool);
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  // Model provider registration
  registerModelProvider(
    pluginName: string,
    provider: ModelProviderDefinition
  ): void {
    this.modelProviders.set(provider.id, provider);
  }

  getModelProvider(id: string): ModelProviderDefinition | undefined {
    return this.modelProviders.get(id);
  }

  // UI extension registration
  registerUIExtension(pluginName: string, extension: UIExtension): void {
    const extensions = this.uiExtensions.get(extension.slot) || [];
    extensions.push(extension);
    extensions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    this.uiExtensions.set(extension.slot, extensions);
  }

  getUIExtensions(slot: string): UIExtension[] {
    return this.uiExtensions.get(slot) || [];
  }
}
```

---

## Built-in Plugins

### Web Search Plugin

```typescript
// Provides web_search tool
{
  name: 'web_search',
  description: 'Search the web for current information',
  parameters: {
    query: { type: 'string', description: 'Search query' },
    maxResults: { type: 'number', default: 5 }
  }
}
```

### URL Fetch Plugin

```typescript
// Provides url_fetch tool
{
  name: 'url_fetch',
  description: 'Fetch and parse content from a URL',
  parameters: {
    url: { type: 'string', description: 'URL to fetch' }
  }
}
```

### Code Interpreter Plugin

```typescript
// Provides code_interpreter tool
{
  name: 'code_interpreter',
  description: 'Execute Python code in a sandboxed environment',
  parameters: {
    code: { type: 'string', description: 'Python code to execute' }
  }
}
```

---

## Plugin Development Guide

### Create Plugin Project

```bash
# Use scaffolding to create
npx create-prismax-plugin my-plugin

# Project structure
my-plugin/
├── src/
│   ├── index.ts        # Plugin entry
│   └── SettingsPage.tsx # Settings page (optional)
├── manifest.json       # Plugin manifest
├── package.json
└── tsconfig.json
```

### Development & Debugging

```bash
# Start development mode
pnpm dev

# Load development plugin in PrismaX
# Settings -> Plugins -> Load Local Plugin -> Select plugin directory
```

### Publish Plugin

```bash
# Build
pnpm build

# Package
pnpm pack

# Publish to plugin marketplace (future feature)
pnpm publish
```

---

## Plugin Marketplace (Planned)

### Features

- Browse and search plugins
- One-click install/uninstall
- Auto updates
- Ratings and reviews
- Developer verification

### Security Review

- Code review
- Permission audit
- Malicious behavior detection
- Signature verification
