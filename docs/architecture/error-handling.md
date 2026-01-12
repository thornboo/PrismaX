# Error Handling Standard

> To support i18n and structured logging, Core Layer must use `AppError`.

---

## 1. Error Class Definition

```typescript
// packages/shared/src/errors/AppError.ts

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string, // Internal debug message (not for user)
    public status: number = 500,
    public details?: Record<string, any>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
```

## 2. Error Code Registry

All error codes must be defined here.

```typescript
// packages/shared/src/errors/codes.ts

export enum ErrorCode {
  // Auth
  UNAUTHORIZED = "AUTH_001",
  FORBIDDEN = "AUTH_002",

  // Validation
  INVALID_INPUT = "VAL_001",

  // Resource
  RESOURCE_NOT_FOUND = "RES_001",
  RESOURCE_EXISTS = "RES_002",

  // Business Logic
  QUOTA_EXCEEDED = "BIZ_001",
  FILE_TOO_LARGE = "BIZ_002",

  // System
  INTERNAL_ERROR = "SYS_001",
  AI_PROVIDER_ERROR = "SYS_002",
}
```

## 3. Implementation Guide

### Core Layer (Throwing)

```typescript
if (user.quota <= 0) {
  throw new AppError(ErrorCode.QUOTA_EXCEEDED, `User ${userId} has no quota left`, 403, {
    current: 0,
    required: 1,
  });
}
```

### Adapter Layer (Catching)

**tRPC (Web)**:

- Middleware catches `AppError`.
- Converts to tRPC error with `code` in meta.
- UI Client receives `code` and looks up translation.

**IPC (Desktop)**:

- Wrapper catches `AppError`.
- Serializes `{ code, details }` to renderer.
- UI Client receives object and looks up translation.

## 4. i18n Translation

UI Layer maintains the mapping:

```json
// locales/zh.json
{
  "errors": {
    "BIZ_001": "您的配额不足 (需要: {required}, 当前: {current})"
  }
}
```
