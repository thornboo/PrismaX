# Testing Standards

> This document describes the PrismaX testing strategy and standards

---

## Overview

PrismaX adopts a multi-layered testing strategy to ensure code quality and functional stability.

---

## Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 / Tests \
                /----------\
               / Integration \
              /    Tests      \
             /------------------\
            /    Unit Tests      \
           /----------------------\
```

| Test Type         | Proportion | Execution Frequency | Execution Time |
| ----------------- | ---------- | ------------------- | -------------- |
| Unit Tests        | 70%        | Every commit        | Seconds        |
| Integration Tests | 20%        | Every PR            | Minutes        |
| E2E Tests         | 10%        | Daily/Pre-release   | Minutes        |

---

## Testing Tools

| Tool            | Purpose                       |
| --------------- | ----------------------------- |
| Vitest          | Unit tests, integration tests |
| Playwright      | E2E tests                     |
| Testing Library | React component tests         |
| MSW             | API mocking                   |
| Faker           | Test data generation          |

---

## Unit Tests

### File Naming

```
src/
├── utils/
│   ├── format.ts
│   └── format.test.ts      # Unit test file
├── hooks/
│   ├── useChat.ts
│   └── useChat.test.ts
```

### Test Structure

```typescript
// format.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { formatDate, formatFileSize, truncateText } from "./format";

describe("formatDate", () => {
  beforeEach(() => {
    // Fix time for stable tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-01-15T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should format date in default format", () => {
    const date = new Date("2024-01-15T08:30:00Z");
    expect(formatDate(date)).toBe("2024-01-15 08:30");
  });

  it("should format date with custom format", () => {
    const date = new Date("2024-01-15T08:30:00Z");
    expect(formatDate(date, "YYYY/MM/DD")).toBe("2024/01/15");
  });

  it("should handle invalid date", () => {
    expect(formatDate(new Date("invalid"))).toBe("Invalid Date");
  });

  it("should show relative time for recent dates", () => {
    const fiveMinutesAgo = new Date("2024-01-15T09:55:00Z");
    expect(formatDate(fiveMinutesAgo, "relative")).toBe("5 minutes ago");
  });
});

describe("formatFileSize", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1 KB"],
    [1536, "1.5 KB"],
    [1048576, "1 MB"],
    [1073741824, "1 GB"],
  ])("should format %i bytes as %s", (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected);
  });

  it("should throw for negative values", () => {
    expect(() => formatFileSize(-1)).toThrow("Invalid file size");
  });
});

describe("truncateText", () => {
  it("should not truncate short text", () => {
    expect(truncateText("Hello", 10)).toBe("Hello");
  });

  it("should truncate long text with ellipsis", () => {
    expect(truncateText("Hello World", 8)).toBe("Hello...");
  });

  it("should handle empty string", () => {
    expect(truncateText("", 10)).toBe("");
  });
});
```

### Async Tests

```typescript
// api.test.ts
import { describe, it, expect, vi } from "vitest";
import { fetchUserData, createConversation } from "./api";

describe("fetchUserData", () => {
  it("should fetch user data successfully", async () => {
    const mockUser = { id: "1", name: "Test User" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    });

    const result = await fetchUserData("1");

    expect(result).toEqual(mockUser);
    expect(fetch).toHaveBeenCalledWith("/api/users/1");
  });

  it("should throw error on failed request", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await expect(fetchUserData("999")).rejects.toThrow("User not found");
  });

  it("should handle network error", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(fetchUserData("1")).rejects.toThrow("Network error");
  });
});
```

### Mock Usage

```typescript
// service.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ChatService } from "./chat-service";
import { AIProvider } from "./ai-provider";

// Mock module
vi.mock("./ai-provider", () => ({
  AIProvider: vi.fn().mockImplementation(() => ({
    chat: vi.fn(),
    stream: vi.fn(),
  })),
}));

describe("ChatService", () => {
  let chatService: ChatService;
  let mockProvider: AIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    mockProvider = new AIProvider();
    chatService = new ChatService(mockProvider);
  });

  it("should send message and return response", async () => {
    const mockResponse = { content: "Hello!" };
    vi.mocked(mockProvider.chat).mockResolvedValue(mockResponse);

    const result = await chatService.sendMessage("Hi");

    expect(mockProvider.chat).toHaveBeenCalledWith([{ role: "user", content: "Hi" }]);
    expect(result).toEqual(mockResponse);
  });
});
```

---

## Component Tests

### React Component Tests

```typescript
// ChatInput.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('should render input field', () => {
    render(<ChatInput onSend={vi.fn()} />);

    expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
  });

  it('should call onSend when submit button clicked', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello');

    const submitButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(submitButton);

    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('should call onSend when Enter pressed', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello{enter}');

    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('should not submit empty message', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const submitButton = screen.getByRole('button', { name: /send/i });
    await userEvent.click(submitButton);

    expect(onSend).not.toHaveBeenCalled();
  });

  it('should clear input after submit', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);

    const input = screen.getByPlaceholderText('Type a message...');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(input).toHaveValue('');
  });

  it('should disable input when loading', () => {
    render(<ChatInput onSend={vi.fn()} isLoading />);

    expect(screen.getByPlaceholderText('Type a message...')).toBeDisabled();
    expect(screen.getByRole('button', { name: /send/i })).toBeDisabled();
  });
});
```

### Hook Tests

```typescript
// useChat.test.ts
import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "./useChat";

describe("useChat", () => {
  it("should initialize with empty messages", () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("should add user message when sending", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.messages).toContainEqual(
      expect.objectContaining({
        role: "user",
        content: "Hello",
      }),
    );
  });

  it("should set loading state while sending", async () => {
    const { result } = renderHook(() => useChat());

    act(() => {
      result.current.sendMessage("Hello");
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("should handle errors", async () => {
    // Mock API error
    vi.spyOn(global, "fetch").mockRejectedValue(new Error("API Error"));

    const { result } = renderHook(() => useChat());

    await act(async () => {
      await result.current.sendMessage("Hello");
    });

    expect(result.current.error).toBe("API Error");
  });
});
```

### Store Tests

```typescript
// chatStore.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useChatStore } from "./chatStore";

describe("chatStore", () => {
  beforeEach(() => {
    // Reset store state
    useChatStore.setState({
      conversations: [],
      activeConversationId: null,
      messages: {},
    });
  });

  it("should create conversation", () => {
    const { createConversation } = useChatStore.getState();

    createConversation({ title: "Test" });

    const { conversations } = useChatStore.getState();
    expect(conversations).toHaveLength(1);
    expect(conversations[0].title).toBe("Test");
  });

  it("should set active conversation", () => {
    const { createConversation, setActiveConversation } = useChatStore.getState();

    createConversation({ title: "Test" });
    const { conversations } = useChatStore.getState();

    setActiveConversation(conversations[0].id);

    expect(useChatStore.getState().activeConversationId).toBe(conversations[0].id);
  });

  it("should add message to conversation", () => {
    const { createConversation, addMessage } = useChatStore.getState();

    createConversation({ title: "Test" });
    const { conversations } = useChatStore.getState();
    const conversationId = conversations[0].id;

    addMessage(conversationId, {
      role: "user",
      content: "Hello",
    });

    const { messages } = useChatStore.getState();
    expect(messages[conversationId]).toHaveLength(1);
    expect(messages[conversationId][0].content).toBe("Hello");
  });
});
```

---

## E2E Tests

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "pnpm dev:web",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### E2E Test Cases

```typescript
// e2e/chat.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Chat", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should create new conversation", async ({ page }) => {
    // Click new conversation button
    await page.click('[data-testid="new-conversation"]');

    // Verify new conversation created
    await expect(page.locator('[data-testid="conversation-item"]')).toHaveCount(1);
  });

  test("should send message and receive response", async ({ page }) => {
    // Create new conversation
    await page.click('[data-testid="new-conversation"]');

    // Input message
    const input = page.locator('[data-testid="chat-input"]');
    await input.fill("Hello, how are you?");

    // Send message
    await page.click('[data-testid="send-button"]');

    // Verify user message displayed
    await expect(page.locator('[data-testid="user-message"]')).toContainText("Hello, how are you?");

    // Wait for AI response
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible({ timeout: 30000 });
  });

  test("should regenerate message", async ({ page }) => {
    // Create conversation and send message
    await page.click('[data-testid="new-conversation"]');
    await page.locator('[data-testid="chat-input"]').fill("Test message");
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await expect(page.locator('[data-testid="assistant-message"]')).toBeVisible();

    // Click regenerate
    await page.click('[data-testid="regenerate-button"]');

    // Verify generating
    await expect(page.locator('[data-testid="loading-indicator"]')).toBeVisible();
  });

  test("should switch between conversations", async ({ page }) => {
    // Create two conversations
    await page.click('[data-testid="new-conversation"]');
    await page.locator('[data-testid="chat-input"]').fill("First conversation");
    await page.click('[data-testid="send-button"]');

    await page.click('[data-testid="new-conversation"]');
    await page.locator('[data-testid="chat-input"]').fill("Second conversation");
    await page.click('[data-testid="send-button"]');

    // Switch to first conversation
    await page.click('[data-testid="conversation-item"]:first-child');

    // Verify first conversation messages displayed
    await expect(page.locator('[data-testid="user-message"]')).toContainText("First conversation");
  });
});
```

---

## Test Coverage

### Configuration

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/*.d.ts",
        "**/*.test.ts",
        "**/*.spec.ts",
        "**/mocks/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
```

### Coverage Requirements

| Metric             | Minimum | Target |
| ------------------ | ------- | ------ |
| Line coverage      | 80%     | 90%    |
| Function coverage  | 80%     | 90%    |
| Branch coverage    | 80%     | 85%    |
| Statement coverage | 80%     | 90%    |

---

## Testing Best Practices

### Naming Conventions

```typescript
// Use descriptive test names
describe("ChatService", () => {
  describe("sendMessage", () => {
    it("should return response when API call succeeds", () => {});
    it("should throw error when API returns 500", () => {});
    it("should retry on network timeout", () => {});
  });
});
```

### AAA Pattern

```typescript
it("should add item to cart", () => {
  // Arrange
  const cart = new Cart();
  const item = { id: "1", name: "Product", price: 100 };

  // Act
  cart.addItem(item);

  // Assert
  expect(cart.items).toContain(item);
  expect(cart.total).toBe(100);
});
```

### Avoid Testing Implementation Details

```typescript
// Bad - testing implementation details
it("should set isLoading to true", () => {
  component.handleClick();
  expect(component.state.isLoading).toBe(true);
});

// Good - testing behavior
it("should show loading indicator when clicked", async () => {
  await userEvent.click(screen.getByRole("button"));
  expect(screen.getByTestId("loading")).toBeVisible();
});
```

### Test Isolation

```typescript
// Each test should run independently
beforeEach(() => {
  // Reset state
  vi.clearAllMocks();
  localStorage.clear();
});
```
