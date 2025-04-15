# Application Features

This document outlines the core features of the AI Whisperer's Toolbox application, based on analysis of the main page layout and AI chat components.

## Core Editing & Document Management

*   **Markdown Editor:**
    *   Central panel for viewing and editing Markdown (`.md`) and MDX (`.mdx`) documents.
    *   Likely uses Monaco Editor, providing syntax highlighting, code completion hints, etc.
    *   Includes a basic formatting toolbar (Bold, Italic, Headings, Lists, Code).
    *   Supports viewing/editing document frontmatter via a dedicated dialog.
    *   Can render a live preview of Markdown and MDX content, including custom components.
    *   Supports synchronized scrolling between editor and preview panes.
*   **Document Tree Navigation (`DocumentNavigation`):**
    *   Displays files and folders in a hierarchical tree view.
    *   Supports creating, renaming, and deleting documents and folders.
    *   Includes search (fuzzy) and filtering capabilities for the document list.
    *   Supports selecting multiple documents for comparison (integrated with `VersionHistory` diff view).
    *   Manages a dedicated "Trash" folder for deleted items.
    *   Handles special system folders (e.g., templates, trash) with specific icons/protections.
    *   Provides access to document version history via a dialog.
    *   Integration with document templates via the `TemplateDialog`.
    *   Features for checking vault integrity (`VaultIntegrityDialog`).
    *   Import/Export functionality for the vault (ZIP format).
*   **Directory View (`DirectoryView`):**
    *   Displays folder contents when a folder is selected in the navigation tree.
    *   Offers multiple view modes (List, Grid, Columns, Gallery).
    *   Provides sorting and filtering options for folder contents.
    *   Includes context menus for file/folder operations (Rename, History, Compare, Move, Trash).
*   **Annotations (`AnnotationsNavigator`):**
    *   Lists annotations found across documents.
    *   Allows navigation directly to an annotation's location within the editor.
    *   Supports creating new annotations via a dialog (`AnnotationDialog`) when text is selected in the editor.
*   **Document Versioning (`VersionHistory`):**
    *   Manages document versions stored within the document data itself.
    *   Allows explicit creation of new versions with optional messages.
    *   Provides a dialog to view the history of a document.
    *   Supports restoring content from a previous version.
    *   Integrates with a diff viewer (likely Monaco Diff Editor) to compare versions against the current content or against each other.
*   **MDX Support (`MDXRenderer`, `MDXBundlerRenderer`):**
    *   Renders `.mdx` files, allowing JSX components within Markdown.
    *   Utilizes `next-mdx-remote` or `mdx-bundler` for processing.
    *   Includes a library of pre-defined custom components (Alerts, Cards, Tabs, Callouts, Charts, Code Blocks, Timelines, etc.) for use in MDX.
    *   Supports LaTeX math rendering via KaTeX.
    *   Handles internal `[[WikiLinks]]` within MDX, enabling navigation or document creation prompts.
    *   Parses and optionally displays document frontmatter in the preview.

## AI Interaction (`AIChat` / `AIComposer`)

*   **Conversational AI (`AIChat`):**
    *   Core interface for interacting with various AI models.
    *   Displays conversation turn-by-turn, visually distinguishing user and AI messages.
    *   Supports different message types (User, Assistant, System).
*   **Chat History & Branching:**
    *   Stores chat history in a tree structure (`useAIChatStore`), allowing for branching conversations when messages are edited.
    *   Visually indicates when a message has alternative branches.
    *   Persists user messages to a dedicated history file (`/api/history`, `history.md`).
    *   Provides a history dropdown in the main header to view and reuse past user messages.
*   **Message Management:**
    *   Edit user messages (creates a new branch in the conversation tree).
    *   Copy AI responses to the clipboard.
    *   Insert AI responses directly into the active Markdown editor at the cursor position or replacing selected text.
    *   Bookmark important messages (`BookmarkMessage`).
    *   Clear chat history.
*   **Context Management:**
    *   Add documents from the vault as context for the AI chat.
    *   Context documents are sent to the AI model along with the prompt.
    *   Manage (add/remove/clear) context documents directly within the chat interface (`ContextDocumentList`).
    *   Autocomplete (`@`) feature for quickly adding documents to context.
*   **Model & Provider Selection:**
    *   Dropdown menu to choose from multiple AI providers (OpenAI, OpenRouter, Anthropic, Gemini, Featherless, Groq).
    *   Select specific models within the chosen provider.
    *   Configuration is persisted via Zustand (`useLLMStore`) and cookies.
*   **Multi-Cluster Processing (MCP):**
    *   Toggle to enable/disable using a potentially distributed backend service (`mcp-service.ts`) for specific providers.
    *   Visual indicator (`MCPServersIndicator`) for MCP status and server count.
    *   Detailed MCP server management available in Settings.
*   **Prompt Assistance:**
    *   Suggestion buttons for common tasks (e.g., Summarize, Improve).
    *   Prompt enhancement tools (`PromptEnhancementButtons`).
    *   AI Role switcher (`AIRoleSwitcher`) allowing selection from pre-defined or custom AI roles/personas.
*   **Debug Tools (`AIDebugPanel`):**
    *   Panel to view the exact prompt sent to the AI model.
    *   Dialog to inspect the raw chat tree structure.
*   **Compositions (`Compositions`):**
    *   Save chat conversations (including context documents and chat messages) as named "Compositions" (saved as documents).
    *   Load saved Compositions back into the AI chat interface.
    *   Dedicated panel/tab for managing compositions (View, Delete, Load, Use in Template).
    *   Supports creating new documents from compositions using specific `composition_templates`.
*   **Token Counting (`TokenCounterDialog`):**
    *   Dialog to calculate token counts for selected text or documents, useful for managing LLM context limits.

## Settings & Configuration (`/settings`)

*   **Dedicated Settings Page:** Accessed via a button in the main header.
*   **Tabbed Interface:** Organizes settings into General, Editor, AI, Templates, Tools, and MCP Servers sections.
*   **AI Configuration:**
    *   Manage API Keys for different LLM providers (OpenAI, Google Gemini, Anthropic).
    *   Set default LLM provider and model.
    *   Adjust generation parameters: Temperature, Max Tokens.
    *   Manage AI response caching (enable/disable, flush cache).
*   **AI Roles Management:** Link to a separate page (`/admin/ai-roles`) for creating and editing custom AI roles/system prompts (`AIRoleEditor`).
*   **MCP Server Management (`MCPSettings`):**
    *   Browse, search, filter, install, uninstall, configure, and enable/disable MCP servers.
    *   Test installed tools provided by MCP servers.
*   **AI Tools Management (`ToolSettings`):**
    *   View and enable/disable available AI tools (categorized).
    *   Placeholders for configuring tools and installing additional ones.
*   **Template Management:** Includes a `TemplateTester` component for testing document templates.
*   **General & Editor Settings:** Placeholder tabs for future configurations.

## Templates & Automation

*   **Nunjucks Templating:** Uses Nunjucks syntax (`{{ variable }}`) for dynamic content generation in templates.
*   **Template Schema:** Templates can define input schemas (`{% set schema = {... %}`) using a custom SDL-like syntax.
*   **Dynamic Forms (`SchemaForm`):** Automatically generates forms based on template schemas for user input.
*   **Template Processing:** Backend API (`/api/templates/...`) processes templates with provided variables (including schema data, built-in vars, and Composition data).
*   **Template Creation (`TemplateDialog`):** Dialog to create new documents by selecting a template and filling in required schema variables.
*   **Template Directories:** Supports standard (`templates`) and composition-specific (`composition_templates`) template locations.

## Navigation & Organization

*   **Resizable Three-Panel Layout:**
    *   Left Panel: Document Navigation, Annotations, Sessions.
    *   Middle Panel: Markdown/MDX Editor or Directory View.
    *   Right Panel: AI Composer, Compositions.
*   **Panel Management:** Panels can be toggled visible/hidden and collapsed/expanded (icon view).
*   **Fullscreen Mode:** Hides both side panels for focused editing/viewing.
*   **Tabbed Navigation:** Main sections within the left and right panels are organized using tabs.
*   **Document Navigation History (`useNavigationHistory`):**
    *   Back/Forward buttons track navigation between documents and folders.
    *   Dropdown menus on Back/Forward buttons show recent navigation history for quick jumps.
    *   Ability to create a new Session from the document navigation history.
*   **Sessions (`SessionManager`):**
    *   Group related documents into sessions.
    *   Create, load, delete, and sync sessions (sync functionality might be partial/placeholder).
    *   Documents visited during navigation can be automatically added to the active session.

## UI & UX

*   **Theme Toggle:** Switch between light and dark modes (`ThemeProvider`).
*   **Responsive Design:** Adapts layout for desktop, tablet, and mobile screen sizes using media queries.
*   **Toast Notifications:** Uses a custom toast system (`useToast`) for non-intrusive feedback.
*   **Keyboard Shortcuts:** Shortcuts for toggling panels (Alt+1/2), fullscreen (Alt+F), potentially others.
*   **About Splash Screen (`AboutSplash`):** Informational screen shown on first visit.
*   **Persistent Layout:** User's panel configuration (size, visibility, collapsed state) is saved in `localStorage`.
*   **Component Library:** Uses `shadcn/ui` for base components (Buttons, Cards, Dialogs, etc.).

## Integrated Terminal (`TerminalView`)

*   **Embedded Shell:** Provides a terminal interface within the app.
*   **Filesystem Commands:** `ls`, `cd`, `pwd`, `mkdir`, `touch`, `rm`, `rename`, `cat` operating on the app's document structure.
*   **Template Commands:** `templates` (list), `create` (create from template).
*   **App Commands:** `open` (open doc), `exit`.
*   **Integration:** Interacts with `useDocumentStore` and the router.
*   **Features:** Command history, basic tab completion.

## Underlying Systems

*   **State Management:** Uses Zustand (`useDocumentStore`, `useLLMStore`, `useAIChatStore`, `useSessionStore`, `useNavigationHistory`) for managing application state.
*   **Client-Side Routing:** Uses Next.js App Router.
*   **API Interaction:** Communicates with a backend API for initialization (`/api/initialize`), history (`/api/history`), templates (`/api/templates/...`), API key management (`/api/set-api-keys`), document operations, AI calls (`llm-service`, `mcp-service`), etc.
*   **Persistence:** Uses `localStorage` for UI state. Uses cookies for LLM configuration. Document data, history, sessions, and compositions are persisted via backend/filesystem interactions (details depend on backend implementation). 