# Plugin System Architecture

> Based on strict security requirements, PrismaX adopts the **Gateway Proxy Pattern** (similar to Lobe Chat / ChatGPT Plugins).

---

## 1. Architecture Overview

Plugins in PrismaX are **declarative API definitions**, not executable code sandboxes. This ensures maximum security and cross-platform compatibility (Web/Desktop).

```
┌─────────────┐       ┌───────────────┐       ┌───────────────┐
│  Chat UI    │ ───▶  │ Core Service  │ ───▶  │ Plugin Gateway│
└─────────────┘       │ (Tool Caller) │       │ (Proxy)       │
                      └───────┬───────┘       └───────┬───────┘
                              │                       │
                              ▼                       ▼
                      ┌───────────────┐       ┌───────────────┐
                      │ Plugin Store  │       │ External APIs │
                      │ (Manifests)   │       │ (OpenAPI)     │
                      └───────────────┘       └───────────────┘
```

## 2. Core Concepts

### 2.1 Plugin Manifest (`plugin.json`)

Follows the ChatGPT Plugin standard (OpenAPI / Swagger).

```json
{
  "schema_version": "v1",
  "name_for_human": "Weather",
  "name_for_model": "weather",
  "description_for_model": "Get current weather for a location",
  "auth": {
    "type": "service_http",
    "authorization_type": "bearer",
    "verification_tokens": {
      "openai": "..."
    }
  },
  "api": {
    "type": "openapi",
    "url": "https://api.weather.com/openapi.yaml"
  }
}
```

### 2.2 Gateway Implementation

The Gateway is responsible for proxying requests to external APIs, hiding user IP (in Web mode) and managing authentication secrets.

- **Web Version**: Implemented as Next.js API Route (`/api/plugin/gateway`).
- **Desktop Version**: Implemented as Electron Main Process Handler.

## 3. Security Model

1.  **No Local Execution**: Plugins cannot execute arbitrary JavaScript on the user's device.
2.  **Traffic Proxying**: All plugin traffic goes through the PrismaX Gateway (or Local Proxy in Desktop), preventing IP leakage.
3.  **Permission Scope**: Users must explicitly allow a plugin to run for a specific conversation.

## 4. Built-in vs External Plugins

| Type | Description | Execution Environment | Permissions |
|------|-------------|-----------------------|-------------|
| **Built-in** | Native features (File I/O, System) | Core / Main Process | High (Native) |
| **External** | Third-party APIs (Search, Weather) | Gateway Proxy | Low (HTTP only) |

## 5. Plugin Marketplace

- **Registry**: A JSON-based registry hosted on GitHub/Vercel.
- **Verification**: All plugins in the official marketplace must be verified (manifest check + API availability check).
