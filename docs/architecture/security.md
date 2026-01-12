# Security Design

> This document describes the PrismaX security architecture design

---

## Overview

Security is one of PrismaX's core concerns, involving user data protection, API key management, network communication security, plugin sandboxing, and more.

---

## Security Architecture

```
+-------------------------------------------------------------------------+
|                           PrismaX Security Architecture                  |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------+     +-------------------+     +-------------------+
|  |  Auth Layer       |     |  Encryption Layer |     |  Access Control   |
|  |                   |     |                   |     |  Layer (ACL)      |
|  +-------------------+     +-------------------+     +-------------------+
|           |                        |                        |           |
|           v                        v                        v           |
|  +-------------------------------------------------------------------+  |
|  |                      Security Middleware Layer                    |  |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  |  | Input       |  | Rate        |  | Audit       |  | Anomaly     | |
|  |  | Validation  |  | Limiting    |  | Logging     |  | Detection   | |
|  |  +-------------+  +-------------+  +-------------+  +-------------+ |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Authentication & Authorization

### Web Version Authentication

```typescript
// auth/jwt.ts
interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

class JWTService {
  private readonly secret: string;
  private readonly accessTokenExpiry = "15m";
  private readonly refreshTokenExpiry = "7d";

  generateTokens(user: User): TokenPair {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
      exp: 0, // Set by jwt.sign
    };

    const accessToken = jwt.sign(payload, this.secret, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = jwt.sign({ userId: user.id, type: "refresh" }, this.secret, {
      expiresIn: this.refreshTokenExpiry,
    });

    return { accessToken, refreshToken };
  }

  verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, this.secret) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError("Invalid token");
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const payload = this.verifyToken(refreshToken);

    // Check if blacklisted
    if (await this.isTokenBlacklisted(refreshToken)) {
      throw new AuthenticationError("Token has been revoked");
    }

    const user = await userService.findById(payload.userId);
    if (!user) {
      throw new AuthenticationError("User not found");
    }

    return this.generateTokens(user).accessToken;
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    const hash = crypto.createHash("sha256").update(token).digest("hex");
    return await redis.exists(`blacklist:${hash}`);
  }
}
```

### Password Security

```typescript
// auth/password.ts
import argon2 from "argon2";

class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  };

  async hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  validateStrength(password: string): ValidationResult {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("Password must be at least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("Password must contain uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("Password must contain lowercase letter");
    }
    if (!/[0-9]/.test(password)) {
      errors.push("Password must contain number");
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      errors.push("Password must contain special character");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
```

### Desktop Version Authentication

Desktop version is single-user mode, using local key protection:

```typescript
// desktop/auth.ts
class DesktopAuth {
  private keytar = require("keytar");
  private readonly serviceName = "PrismaX";

  async setMasterPassword(password: string): Promise<void> {
    const salt = crypto.randomBytes(32);
    const hash = await this.hashPassword(password, salt);

    await this.keytar.setPassword(
      this.serviceName,
      "master-password",
      JSON.stringify({ hash, salt: salt.toString("hex") }),
    );
  }

  async verifyMasterPassword(password: string): Promise<boolean> {
    const stored = await this.keytar.getPassword(this.serviceName, "master-password");

    if (!stored) return false;

    const { hash, salt } = JSON.parse(stored);
    const inputHash = await this.hashPassword(password, Buffer.from(salt, "hex"));

    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(inputHash));
  }

  private async hashPassword(password: string, salt: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(password, salt, 100000, 64, "sha512", (err, key) => {
        if (err) reject(err);
        else resolve(key.toString("hex"));
      });
    });
  }
}
```

---

## API Key Management

### Encrypted Key Storage

```typescript
// security/key-manager.ts
class APIKeyManager {
  private readonly algorithm = "aes-256-gcm";
  private masterKey: Buffer;

  constructor(masterKey: Buffer) {
    this.masterKey = masterKey;
  }

  encrypt(apiKey: string): EncryptedKey {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv);

    let encrypted = cipher.update(apiKey, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString("hex"),
      authTag: authTag.toString("hex"),
    };
  }

  decrypt(encryptedKey: EncryptedKey): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.masterKey,
      Buffer.from(encryptedKey.iv, "hex"),
    );

    decipher.setAuthTag(Buffer.from(encryptedKey.authTag, "hex"));

    let decrypted = decipher.update(encryptedKey.encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  }
}
```

### Key Rotation

```typescript
// security/key-rotation.ts
class KeyRotationService {
  async rotateKeys(): Promise<void> {
    // 1. Generate new master key
    const newMasterKey = crypto.randomBytes(32);

    // 2. Get all encrypted API keys
    const encryptedKeys = await db.select().from(apiKeys);

    // 3. Decrypt with old key, re-encrypt with new key
    const oldManager = new APIKeyManager(this.currentMasterKey);
    const newManager = new APIKeyManager(newMasterKey);

    for (const key of encryptedKeys) {
      const decrypted = oldManager.decrypt(key);
      const reEncrypted = newManager.encrypt(decrypted);

      await db
        .update(apiKeys)
        .set({
          encrypted: reEncrypted.encrypted,
          iv: reEncrypted.iv,
          authTag: reEncrypted.authTag,
        })
        .where(eq(apiKeys.id, key.id));
    }

    // 4. Update master key
    await this.updateMasterKey(newMasterKey);
  }
}
```

---

## Data Encryption

### Transport Encryption

All network communication uses TLS 1.3:

```typescript
// server/https.ts
const httpsOptions = {
  key: fs.readFileSync("private-key.pem"),
  cert: fs.readFileSync("certificate.pem"),
  minVersion: "TLSv1.3",
  ciphers: [
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
    "TLS_AES_128_GCM_SHA256",
  ].join(":"),
};
```

### Data at Rest Encryption

```typescript
// security/data-encryption.ts
class DataEncryption {
  // Sensitive field encryption
  encryptField(value: string, fieldKey: Buffer): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", fieldKey, iv);

    let encrypted = cipher.update(value, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString("base64");
  }

  decryptField(encrypted: string, fieldKey: Buffer): string {
    const data = Buffer.from(encrypted, "base64");

    const iv = data.subarray(0, 12);
    const authTag = data.subarray(12, 28);
    const ciphertext = data.subarray(28);

    const decipher = crypto.createDecipheriv("aes-256-gcm", fieldKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString("utf8");
  }
}
```

### Database Field Encryption

```typescript
// database/encrypted-column.ts
import { customType } from "drizzle-orm/pg-core";

const encryptedText = customType<{
  data: string;
  driverData: string;
}>({
  dataType() {
    return "text";
  },
  toDriver(value: string): string {
    return dataEncryption.encryptField(value, fieldKey);
  },
  fromDriver(value: string): string {
    return dataEncryption.decryptField(value, fieldKey);
  },
});

// Usage
export const apiKeys = pgTable("api_keys", {
  id: uuid("id").primaryKey(),
  provider: varchar("provider", { length: 50 }).notNull(),
  apiKey: encryptedText("api_key").notNull(), // Auto-encrypted
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Input Validation

### Schema Validation

```typescript
// validation/schemas.ts
import { z } from "zod";

// Message input validation
export const messageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(100000, "Message too long")
    .refine((val) => !containsMaliciousContent(val), "Message contains prohibited content"),
  conversationId: z.string().uuid(),
  model: z.string().optional(),
});

// File upload validation
export const fileUploadSchema = z.object({
  filename: z
    .string()
    .max(255)
    .refine((val) => !val.includes("..") && !val.includes("/"), "Invalid filename"),
  mimeType: z.enum([
    "application/pdf",
    "text/plain",
    "text/markdown",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ]),
  size: z.number().max(50 * 1024 * 1024), // 50MB
});

// URL validation
export const urlSchema = z
  .string()
  .url()
  .refine((url) => {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  }, "Only HTTP(S) URLs are allowed");
```

### XSS Protection

```typescript
// security/xss.ts
import DOMPurify from "isomorphic-dompurify";

class XSSProtection {
  sanitizeHTML(html: string): string {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "s",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "ul",
        "ol",
        "li",
        "blockquote",
        "code",
        "pre",
        "a",
        "img",
        "table",
        "thead",
        "tbody",
        "tr",
        "th",
        "td",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class"],
      ALLOW_DATA_ATTR: false,
    });
  }

  escapeForDisplay(text: string): string {
    const escapeMap: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#x27;",
    };

    return text.replace(/[&<>"']/g, (char) => escapeMap[char]);
  }
}
```

### SQL Injection Protection

Using parameterized queries (Drizzle ORM handles automatically):

```typescript
// Safe query method
const messages = await db
  .select()
  .from(messagesTable)
  .where(eq(messagesTable.conversationId, conversationId));

// Prohibited method (raw SQL concatenation)
// const messages = await db.execute(
//   `SELECT * FROM messages WHERE conversation_id = '${conversationId}'`
// );
```

---

## Rate Limiting

### Implementation

```typescript
// middleware/rate-limit.ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 per minute
  analytics: true,
});

// Different limits for different endpoints
const rateLimits = {
  "message.send": { requests: 20, window: "1 m" },
  "knowledge.upload": { requests: 10, window: "1 h" },
  "auth.login": { requests: 5, window: "15 m" },
  default: { requests: 100, window: "1 m" },
};

async function rateLimitMiddleware(req: Request, endpoint: string): Promise<void> {
  const ip = getClientIP(req);
  const userId = req.user?.id;
  const identifier = userId || ip;

  const limit = rateLimits[endpoint] || rateLimits.default;
  const limiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(limit.requests, limit.window),
  });

  const { success, remaining, reset } = await limiter.limit(`${endpoint}:${identifier}`);

  if (!success) {
    throw new RateLimitError({
      retryAfter: reset,
      remaining: 0,
    });
  }
}
```

---

## Plugin Security

### Sandbox Isolation

```typescript
// plugins/sandbox.ts
import { VM } from "vm2";

class PluginSandbox {
  private vm: VM;

  constructor(permissions: PluginPermissions) {
    this.vm = new VM({
      timeout: 30000,
      sandbox: this.createSandbox(permissions),
      eval: false,
      wasm: false,
    });
  }

  private createSandbox(permissions: PluginPermissions) {
    return {
      // Safe console
      console: {
        log: (...args: unknown[]) => this.safeLog("log", args),
        warn: (...args: unknown[]) => this.safeLog("warn", args),
        error: (...args: unknown[]) => this.safeLog("error", args),
      },

      // Restricted fetch
      fetch: permissions.network ? this.createSafeFetch(permissions.allowedDomains) : undefined,

      // Restricted storage
      storage: permissions.storage ? this.createSafeStorage(permissions.storageQuota) : undefined,

      // Prohibited global objects
      process: undefined,
      require: undefined,
      module: undefined,
      exports: undefined,
      __dirname: undefined,
      __filename: undefined,
      Buffer: undefined,
      setImmediate: undefined,
    };
  }

  private createSafeFetch(allowedDomains: string[]) {
    return async (url: string, options?: RequestInit) => {
      const parsed = new URL(url);

      // Check domain whitelist
      if (!allowedDomains.some((d) => parsed.hostname.endsWith(d))) {
        throw new Error(`Domain ${parsed.hostname} is not allowed`);
      }

      // Prohibit private network access
      if (this.isPrivateIP(parsed.hostname)) {
        throw new Error("Access to private networks is not allowed");
      }

      return fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          "User-Agent": "PrismaX-Plugin/1.0",
        },
      });
    };
  }

  private isPrivateIP(hostname: string): boolean {
    const privateRanges = [
      /^localhost$/,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^::1$/,
      /^fe80:/,
    ];

    return privateRanges.some((range) => range.test(hostname));
  }
}
```

### Permission System

```typescript
// plugins/permissions.ts
interface PluginPermissions {
  // Network permissions
  network: boolean;
  allowedDomains: string[];

  // Storage permissions
  storage: boolean;
  storageQuota: number; // bytes

  // Filesystem permissions
  filesystem: boolean;
  allowedPaths: string[];

  // System permissions
  clipboard: boolean;
  notifications: boolean;
}

class PermissionManager {
  async requestPermission(pluginId: string, permission: keyof PluginPermissions): Promise<boolean> {
    // Check if already granted
    const granted = await this.getGrantedPermissions(pluginId);
    if (granted.includes(permission)) {
      return true;
    }

    // Request user authorization
    const approved = await this.showPermissionDialog(pluginId, permission);
    if (approved) {
      await this.grantPermission(pluginId, permission);
    }

    return approved;
  }

  async revokePermission(pluginId: string, permission: keyof PluginPermissions): Promise<void> {
    await db
      .delete(pluginPermissions)
      .where(
        and(eq(pluginPermissions.pluginId, pluginId), eq(pluginPermissions.permission, permission)),
      );
  }
}
```

---

## Audit Logging

### Log Recording

```typescript
// audit/logger.ts
interface AuditLog {
  id: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip: string;
  userAgent: string;
  success: boolean;
  errorMessage?: string;
}

class AuditLogger {
  async log(event: Omit<AuditLog, "id" | "timestamp">): Promise<void> {
    const log: AuditLog = {
      id: generateId(),
      timestamp: new Date(),
      ...event,
    };

    // Write to database
    await db.insert(auditLogs).values(log);

    // Send alert for sensitive operations
    if (this.isSensitiveAction(event.action)) {
      await this.sendAlert(log);
    }
  }

  private isSensitiveAction(action: string): boolean {
    const sensitiveActions = [
      "user.delete",
      "apiKey.create",
      "apiKey.delete",
      "settings.update",
      "plugin.install",
      "data.export",
    ];

    return sensitiveActions.includes(action);
  }

  async query(filters: AuditLogFilters): Promise<AuditLog[]> {
    let query = db.select().from(auditLogs);

    if (filters.userId) {
      query = query.where(eq(auditLogs.userId, filters.userId));
    }
    if (filters.action) {
      query = query.where(eq(auditLogs.action, filters.action));
    }
    if (filters.startDate) {
      query = query.where(gte(auditLogs.timestamp, filters.startDate));
    }
    if (filters.endDate) {
      query = query.where(lte(auditLogs.timestamp, filters.endDate));
    }

    return query.orderBy(desc(auditLogs.timestamp)).limit(filters.limit || 100);
  }
}
```

### Audit Events

| Event Type            | Description                    |
| --------------------- | ------------------------------ |
| `auth.login`          | User login                     |
| `auth.logout`         | User logout                    |
| `auth.passwordChange` | Password change                |
| `apiKey.create`       | Create API key                 |
| `apiKey.delete`       | Delete API key                 |
| `conversation.delete` | Delete conversation            |
| `knowledge.upload`    | Upload knowledge base document |
| `plugin.install`      | Install plugin                 |
| `settings.update`     | Update settings                |
| `data.export`         | Export data                    |

---

## Security Configuration

### Environment Variables

```bash
# .env.example

# Encryption keys (must be kept secret)
ENCRYPTION_KEY=your-32-byte-encryption-key-here
JWT_SECRET=your-jwt-secret-key-here

# Database (use SSL)
DATABASE_URL=postgresql://user:pass@host:5432/db?sslmode=require

# Redis (use TLS)
REDIS_URL=rediss://user:pass@host:6379

# Security configuration
CORS_ORIGINS=https://app.prismax.com
RATE_LIMIT_ENABLED=true
AUDIT_LOG_ENABLED=true
```

### Security Headers Configuration

```typescript
// middleware/security-headers.ts
const securityHeaders = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.openai.com https://api.anthropic.com",
    "frame-ancestors 'none'",
  ].join("; "),
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
```

---

## Security Checklist

### Development Phase

- [ ] All user input validated and sanitized
- [ ] Sensitive data encrypted at rest
- [ ] API keys not hardcoded in source
- [ ] Parameterized queries to prevent SQL injection
- [ ] Proper error handling without leaking sensitive info

### Deployment Phase

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Audit logging enabled

### Operations Phase

- [ ] Regular key rotation
- [ ] Monitor for anomalous access
- [ ] Regular security audits
- [ ] Timely dependency updates
- [ ] Encrypted data backups
