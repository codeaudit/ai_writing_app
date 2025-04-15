# Making the Application Scriptable

Making all features of a complex application like the AI Whisperer's Toolbox scriptable requires a deliberate architectural approach. It means designing the application so its core functionalities are accessible programmatically, not just through the graphical user interface (GUI).

Here's a breakdown of how you could implement this, focusing on a layered approach with an API as the central piece:

## 1. Core Strategy: A Comprehensive Backend API

This is the most fundamental requirement. The core logic for almost every feature needs to be exposed via a well-defined API, likely RESTful or potentially GraphQL. The UI itself would then become just one *client* of this API.

*   **Decouple Logic from UI:** The actual functions that handle document creation/saving/deletion, folder management, AI interactions, template processing, versioning, settings updates, etc., must live in backend services or libraries (`/lib/services/` or similar), separate from the React components (`/components/`, `/app/`).
*   **API Endpoints for Everything:** Create specific API routes (e.g., in `/app/api/`) that expose these decoupled functions. Examples:
    *   **Documents/Folders:**
        *   `GET /api/documents`, `GET /api/documents/{id}`
        *   `POST /api/documents` (Create new, potentially with content or from template)
        *   `PUT /api/documents/{id}` (Update content, rename)
        *   `DELETE /api/documents/{id}`
        *   `GET /api/folders`, `POST /api/folders`, `PUT /api/folders/{id}`, `DELETE /api/folders/{id}`
        *   `POST /api/documents/{id}/move`, `POST /api/folders/{id}/move`
    *   **AI Interaction:**
        *   `POST /api/chat` (Send prompt, context docs, model config -> get response)
        *   `GET /api/chat/history`
        *   `POST /api/compositions` (Save current chat/context)
        *   `GET /api/compositions`, `GET /api/compositions/{id}`
        *   `DELETE /api/compositions/{id}`
        *   `POST /api/compositions/{id}/load` (Potentially trigger loading into a session or return data)
    *   **Templates:**
        *   `GET /api/templates`
        *   `POST /api/templates/process` (Send template name/content + variables -> get processed content)
    *   **Versioning:**
        *   `GET /api/documents/{id}/versions`
        *   `POST /api/documents/{id}/versions` (Create a new version)
        *   `POST /api/documents/{id}/versions/{versionId}/restore`
    *   **Annotations:**
        *   `GET /api/annotations?documentId={id}`
        *   `POST /api/annotations`
        *   `DELETE /api/annotations/{id}`
    *   **Settings:**
        *   `GET /api/settings` (Get current LLM config, etc.)
        *   `PUT /api/settings` (Update settings)
        *   `POST /api/settings/api-keys`
        *   `GET /api/settings/mcp/servers`, `POST /api/settings/mcp/servers/{name}/install`, etc.
        *   `GET /api/settings/tools`, `PUT /api/settings/tools/{id}`
    *   **Sessions:**
        *   `GET /api/sessions`, `POST /api/sessions`, `DELETE /api/sessions/{id}`
        *   `PUT /api/sessions/{id}/documents` (Add/remove documents)
*   **Authentication & Authorization:** The API needs a robust way to authenticate script requests (e.g., API keys, tokens) and authorize actions.
*   **Stateless API:** Aim for stateless API interactions where possible. State should primarily reside in the backend data stores (filesystem, database).
*   **Clear Documentation:** Document the API thoroughly (e.g., using OpenAPI/Swagger) so users know how to script interactions.

## 2. Complementary Strategy: Command-Line Interface (CLI)

Once the API exists, you can build a CLI tool that acts as a convenient wrapper around the API for common scripting tasks.

*   **CLI Tool (`ai-toolbox` or similar):** A separate application (e.g., Node.js script) that users can run from their terminal.
*   **Commands Mapping to API:** The CLI commands would parse arguments and make the corresponding calls to the backend API.
    *   `ai-toolbox doc create --template "Meeting Notes" --name "Project Kickoff" --vars '{"attendees":"Alice, Bob"}'` -> `POST /api/documents` + `POST /api/templates/process`
    *   `ai-toolbox chat "Summarize this" --context-doc doc-123.md --model gpt-4o` -> `POST /api/chat`
    *   `ai-toolbox doc list --folder folder-456` -> `GET /api/documents?folder=folder-456`
    *   `ai-toolbox config set --provider openai --model gpt-4o` -> `PUT /api/settings`
    *   `ai-toolbox composition save "My Analysis"` -> `POST /api/compositions`
*   **Configuration:** The CLI would need configuration for the API endpoint URL and authentication credentials.
*   **Use Cases:** Ideal for batch processing, CI/CD integration, automating repetitive tasks, and simpler scripting needs.

## 3. Architectural Considerations

*   **Eventual Consistency/Real-time Updates:** If scripts modify data via the API/CLI, how does the UI (if open) get updated? Options include:
    *   Polling the API.
    *   Using WebSockets for real-time updates pushed from the backend.
    *   Relying on the user to manually refresh.
*   **Headless Operation:** Ensure core logic (especially backend interactions) can run without a UI or browser environment being present.
*   **Error Handling:** Robust error reporting in both the API and CLI is crucial for scripting.
*   **Configuration:** Scripts need ways to manage configurations (API keys, model preferences) separately from the UI's storage (cookies, localStorage).

## 4. Advanced Options (Potentially Overkill)

*   **Embedded Scripting Engine:** Integrate something like Lua or a JavaScript engine (Node.js via IPC) directly. This allows scripts *within* the app but adds significant complexity and security concerns.
*   **Plugin System with Scripting Hooks:** Allow users to write plugins that register commands or hook into application events, providing deeper integration points.

## Summary

The most practical and scalable approach is to **build a comprehensive backend API** that exposes all core functionality. The UI becomes a primary consumer of this API. Then, **create a CLI tool** that also uses this API, providing a user-friendly interface for scripting common tasks. This requires significant architectural effort in decoupling the application's logic from its presentation layer. 