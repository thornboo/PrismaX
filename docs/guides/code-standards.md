# Code Standards

> This document describes the PrismaX code style and standards

---

## General Standards

### Language Standards

The project adopts an **English-only** strategy to ensure internationalization and code consistency:

| Content                 | Language Requirement | Example                           |
| ----------------------- | -------------------- | --------------------------------- |
| Code comments           | English              | `// Initialize the chat store`    |
| TODO/FIXME              | English              | `// TODO: Add pagination support` |
| Variable/function names | English              | `getUserById`, `messageList`      |
| Commit messages         | English              | `feat(chat): add message editing` |
| Documentation (docs/)   | English              | For global developers             |
| README.md               | English              | Main project documentation        |
| docs/zh/README.md       | Chinese              | Chinese README                    |

### File Naming

| Type              | Naming Convention      | Example                  |
| ----------------- | ---------------------- | ------------------------ |
| React components  | PascalCase             | `ChatMessage.tsx`        |
| Utility functions | camelCase              | `formatDate.ts`          |
| Constants file    | camelCase              | `constants.ts`           |
| Type definitions  | camelCase              | `types.ts`               |
| Style files       | Same as component      | `ChatMessage.module.css` |
| Test files        | Same as source + .test | `formatDate.test.ts`     |

### Directory Structure

```
src/
├── components/          # React components
│   ├── ChatMessage/
│   │   ├── index.tsx    # Component entry
│   │   ├── ChatMessage.tsx
│   │   ├── ChatMessage.test.tsx
│   │   └── types.ts
│   └── ...
├── hooks/               # Custom Hooks
├── lib/                 # Utility libraries
├── stores/              # State management
├── types/               # Type definitions
└── utils/               # Utility functions
```

---

## TypeScript Standards

### Type Definitions

```typescript
// Use interface for object types
interface User {
  id: string;
  name: string;
  email: string;
}

// Use type for union types, intersection types
type Status = "pending" | "success" | "error";
type UserWithRole = User & { role: string };

// Avoid using any, use unknown instead
function parseJSON(json: string): unknown {
  return JSON.parse(json);
}

// Use generics for reusability
function getFirst<T>(arr: T[]): T | undefined {
  return arr[0];
}
```

### Naming Conventions

```typescript
// Interface names use PascalCase
interface UserProfile

// Type aliases use PascalCase
type MessageType = 'text' | 'image';

// Enums use PascalCase, members use PascalCase
enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
  System = 'system',
}

// Constants use UPPER_SNAKE_CASE
const MAX_MESSAGE_LENGTH = 10000;

// Functions and variables use camelCase
const getUserById = (id: string) => {};
```

---

## React Standards

### Component Definition

```tsx
// Use function components + TypeScript
interface ChatMessageProps {
  message: Message;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function ChatMessage({ message, onEdit, onDelete }: ChatMessageProps) {
  // Component logic
  return <div>{/* JSX */}</div>;
}

// When using forwardRef
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ label, ...props }, ref) => {
  return (
    <div>
      {label && <label>{label}</label>}
      <input ref={ref} {...props} />
    </div>
  );
});
```

### Hooks Usage

```tsx
// Custom Hooks start with use
function useConversation(id: string) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load data
  }, [id]);

  return { conversation, loading };
}

// Avoid using Hooks in conditional statements
// Bad
if (condition) {
  const [state, setState] = useState();
}

// Good
const [state, setState] = useState();
if (condition) {
  // Use state
}
```

### Event Handling

```tsx
// Event handlers start with handle
function ChatInput() {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle submit
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea onKeyDown={handleKeyDown} />
    </form>
  );
}
```

---

## Styling Standards

### Tailwind CSS

```tsx
// Use Tailwind class names
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
  <span className="text-sm text-gray-500">Hello</span>
</div>;

// Use cn utility function to merge class names
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded-md",
    variant === "primary" && "bg-blue-500 text-white",
    variant === "secondary" && "bg-gray-100 text-gray-900",
    disabled && "opacity-50 cursor-not-allowed",
  )}
>
  Click me
</button>;
```

### CSS Variables

```css
/* Use CSS variables for theming */
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 0 0% 9%;
}
```

---

## State Management Standards

### Zustand Store

```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ChatStore {
  // State
  conversations: Conversation[];
  activeId: string | null;

  // Actions
  setActiveId: (id: string | null) => void;
  addConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set) => ({
      conversations: [],
      activeId: null,

      setActiveId: (id) => set({ activeId: id }),

      addConversation: (conversation) =>
        set((state) => ({
          conversations: [...state.conversations, conversation],
        })),

      removeConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
        })),
    }),
    {
      name: "chat-store",
    },
  ),
);
```

---

## Comment Standards

**All comments must be in English.**

### File Header Comments

```typescript
/**
 * Chat Message Component
 *
 * Displays a single chat message with Markdown rendering and code highlighting.
 */
```

### Function Comments

```typescript
/**
 * Format date to relative time string
 *
 * @param date - The date to format
 * @param locale - Locale for formatting, defaults to 'en-US'
 * @returns Formatted relative time string
 *
 * @example
 * formatRelativeTime(new Date()) // 'just now'
 * formatRelativeTime(new Date(Date.now() - 60000)) // '1 minute ago'
 */
function formatRelativeTime(date: Date, locale = "en-US"): string {
  // Implementation
}
```

### TODO Comments

```typescript
// TODO: Implement message pagination
// FIXME: Fix performance issue with long messages
// NOTE: Using special algorithm here, see documentation
// HACK: Temporary workaround, waiting for upstream fix
```

---

## Testing Standards

### Unit Tests

```typescript
import { describe, it, expect } from "vitest";
import { formatRelativeTime } from "./formatRelativeTime";

describe("formatRelativeTime", () => {
  it('should return "just now" for current time', () => {
    const result = formatRelativeTime(new Date());
    expect(result).toBe("just now");
  });

  it('should return "1 minute ago" for 1 minute ago', () => {
    const date = new Date(Date.now() - 60000);
    const result = formatRelativeTime(date);
    expect(result).toBe("1 minute ago");
  });
});
```

### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from './ChatInput';

describe('ChatInput', () => {
  it('should call onSubmit when form is submitted', () => {
    const onSubmit = vi.fn();
    render(<ChatInput onSubmit={onSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.submit(input.closest('form')!);

    expect(onSubmit).toHaveBeenCalledWith('Hello');
  });
});
```

---

## ESLint Configuration

The project uses the following ESLint rules:

```javascript
// eslint.config.js
export default [
  {
    rules: {
      // TypeScript
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "warn",

      // React
      "react/prop-types": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // Import
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling"],
          "newlines-between": "always",
        },
      ],
    },
  },
];
```

---

## Prettier Configuration

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```
