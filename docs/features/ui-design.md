# UI Design

> This document describes the PrismaX interface layout and interaction design

---

## Main Interface Layout

```
+-------------------------------------------------------------------------+
|  PrismaX                                    [Search] [Settings] [User]  |
+-------------+-----------------------------------------------------------+
|             |                                                           |
|  Sessions   |                    Chat Area                              |
|             |                                                           |
|  [+ New]    |  +-----------------------------------------------------+ |
|             |  |                                                     | |
|  [Today]    |  |  User message                                       | |
|  |- Chat 1  |  |                                                     | |
|  |- Chat 2  |  |  AI response                                        | |
|             |  |                                                     | |
|  [Yesterday]|  |                                                     | |
|  |- Chat 3  |  |                                                     | |
|             |  |                                                     | |
|             |  +-----------------------------------------------------+ |
|             |                                                           |
|             |  +-----------------------------------------------------+ |
|  ---------- |  | Type a message...              [Attach] [Voice] [Send] | |
|  Knowledge  |  +-----------------------------------------------------+ |
|  Assistants |                                                           |
|  Plugins    |  [GPT-4o v] [Knowledge: None v] [Temp: 0.7]              |
|             |                                                           |
+-------------+-----------------------------------------------------------+
```

---

## Layout Area Descriptions

### 1. Top Navigation Bar

```
+-------------------------------------------------------------------------+
|  PrismaX                                    [Search] [Settings] [User]  |
+-------------------------------------------------------------------------+
```

**Elements**:

- Logo and app name
- Global search button
- Settings entry
- User avatar/login status

### 2. Left Sidebar

```
+-------------+
|  [+ New]    |
|             |
|  [Today]    |
|  |- Chat 1  |
|  |- Chat 2  |
|  |- Chat 3  |
|             |
|  [Yesterday]|
|  |- Chat 4  |
|             |
|  [Earlier]  |
|  |- ...     |
|             |
|  ---------- |
|  Knowledge  |
|  Assistants |
|  Plugins    |
+-------------+
```

**Features**:

- New session button
- Session list (grouped by time)
- Quick navigation (Knowledge, Assistants, Plugins)
- Collapsible/expandable
- Drag-and-drop sorting support

### 3. Chat Area

````
+-----------------------------------------------------------------+
|                                                                 |
|  User                                              2024-01-11   |
|  +-------------------------------------------------------------+ |
|  | Please help me write a React Hook to manage form state      | |
|  +-------------------------------------------------------------+ |
|                                                                 |
|  Assistant (GPT-4o)                               2024-01-11   |
|  +-------------------------------------------------------------+ |
|  | Sure, I'll help you create a generic form state Hook:       | |
|  |                                                              | |
|  | ```typescript                                                | |
|  | function useForm<T>(initialValues: T) {                      | |
|  |   const [values, setValues] = useState(initialValues);       | |
|  |   // ...                                                     | |
|  | }                                                            | |
|  | ```                                                          | |
|  |                                                              | |
|  | [Copy] [Regenerate] [Edit] [Delete]                          | |
|  +-------------------------------------------------------------+ |
|                                                                 |
+-----------------------------------------------------------------+
````

**Features**:

- Message bubble display
- User/AI role distinction
- Timestamp display
- Message action buttons
- Code block highlighting and copy
- Streaming typing effect

### 4. Input Area

```
+-----------------------------------------------------------------+
|  +-------------------------------------------------------------+ |
|  | Type a message...                    [Attach] [Voice] [Send] | |
|  +-------------------------------------------------------------+ |
|                                                                 |
|  [GPT-4o v] [Knowledge: None v] [Temp: 0.7] [Max Tokens: 4096] |
+-----------------------------------------------------------------+
```

**Features**:

- Multi-line text input
- File upload button
- Voice input button
- Send button
- Model selection
- Knowledge base selection
- Parameter adjustment

---

## Page Designs

### Settings Page

```
+-------------------------------------------------------------------------+
|  <- Settings                                                            |
+-------------+-----------------------------------------------------------+
|             |                                                           |
|  General    |  General Settings                                         |
|  Models     |  --------------------------------------------------------- |
|  Knowledge  |                                                           |
|  Shortcuts  |  Theme                                                    |
|  Data       |  [Dark] [Light] [System]                                  |
|  About      |                                                           |
|             |  Language                                                 |
|             |  [English v]                                              |
|             |                                                           |
|             |  Default Model                                            |
|             |  [GPT-4o v]                                               |
|             |                                                           |
|             |  Send Shortcut                                            |
|             |  [Enter to send] [Ctrl+Enter to send]                     |
|             |                                                           |
+-------------+-----------------------------------------------------------+
```

### Model Configuration Page

```
+-------------------------------------------------------------------------+
|  <- Model Configuration                                                 |
+-------------------------------------------------------------------------+
|                                                                         |
|  OpenAI                                                      [Enabled]  |
|  |- API Key: sk-****************************                [Edit]     |
|  |- Endpoint: https://api.openai.com/v1                     [Edit]     |
|  |- Available models: GPT-4o, GPT-4, GPT-3.5-turbo                     |
|                                                                         |
|  -------------------------------------------------------------------   |
|                                                                         |
|  Anthropic                                                   [Enabled]  |
|  |- API Key: sk-ant-****************************            [Edit]     |
|  |- Available models: Claude 3.5 Sonnet, Claude 3 Opus                 |
|                                                                         |
|  -------------------------------------------------------------------   |
|                                                                         |
|  Ollama                                                      [Enabled]  |
|  |- Endpoint: http://localhost:11434                        [Edit]     |
|  |- Available models: llama3.2, mistral, codellama                     |
|                                                                         |
|  -------------------------------------------------------------------   |
|                                                                         |
|  [+ Add Custom Provider]                                                |
|                                                                         |
+-------------------------------------------------------------------------+
```

### Knowledge Base Page

```
+-------------------------------------------------------------------------+
|  <- Knowledge Base                                    [+ New Knowledge] |
+-------------------------------------------------------------------------+
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |  Project Docs                                        [12 docs]    |  |
|  |  For project-related technical documentation Q&A                  |  |
|  |  Created on 2024-01-10                                            |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |  Learning Materials                                   [8 docs]    |  |
|  |  Programming learning resources                                   |  |
|  |  Created on 2024-01-08                                            |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

### Knowledge Base Detail Page

```
+-------------------------------------------------------------------------+
|  <- Project Docs                              [Upload] [Settings] [Delete]|
+-------------------------------------------------------------------------+
|                                                                         |
|  Document List (12)                                                     |
|  -------------------------------------------------------------------   |
|                                                                         |
|  API Design Spec.md                             1.2 MB    [Processed]   |
|  Database Design.md                             0.8 MB    [Processed]   |
|  Deployment Guide.pdf                           2.5 MB    [Processed]   |
|  Architecture.md                                0.5 MB    [Processing]  |
|  Test Report.docx                               1.0 MB    [Failed]      |
|                                                                         |
|  -------------------------------------------------------------------   |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                                                                   |  |
|  |                    Drag files here to upload                      |  |
|  |                    or click to select files                       |  |
|  |                                                                   |  |
|  |              Supports PDF, Markdown, Word, TXT formats            |  |
|  |                                                                   |  |
|  +-------------------------------------------------------------------+  |
|                                                                         |
+-------------------------------------------------------------------------+
```

---

## Responsive Design

### Desktop (>1024px)

- Full three-column layout
- Sidebar always visible
- Spacious chat area

### Tablet (768px - 1024px)

- Collapsible sidebar
- Click hamburger menu to expand
- Chat area fills width

### Mobile (<768px)

- Single column layout
- Bottom navigation bar
- Sidebar becomes drawer
- Simplified input area

---

## Theme Design

### Light Theme

```css
--background: #ffffff;
--foreground: #0a0a0a;
--card: #ffffff;
--card-foreground: #0a0a0a;
--primary: #171717;
--primary-foreground: #fafafa;
--secondary: #f5f5f5;
--secondary-foreground: #171717;
--muted: #f5f5f5;
--muted-foreground: #737373;
--accent: #f5f5f5;
--accent-foreground: #171717;
--border: #e5e5e5;
```

### Dark Theme

```css
--background: #0a0a0a;
--foreground: #fafafa;
--card: #0a0a0a;
--card-foreground: #fafafa;
--primary: #fafafa;
--primary-foreground: #171717;
--secondary: #262626;
--secondary-foreground: #fafafa;
--muted: #262626;
--muted-foreground: #a3a3a3;
--accent: #262626;
--accent-foreground: #fafafa;
--border: #262626;
```

---

## Animation Design

### Transition Animations

- Page transitions: Fade + slight slide
- Sidebar expand/collapse: Slide + fade
- Modal: Scale + fade
- Message appearance: Slide up from bottom

### Interaction Feedback

- Button click: Slight scale
- Hover effect: Background color change
- Loading state: Skeleton + pulse animation
- Send message: Send button rotation

### Streaming Response

- Typewriter effect
- Cursor blinking
- Character-by-character display
