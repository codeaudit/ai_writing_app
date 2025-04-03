# Markdown Writing App

A Next.js application for writing markdown files with AI assistance, built with Shadcn UI components and Monaco Editor.

## Features

- **Three-Panel Layout**: Similar to Cursor IDE with navigation, editor, and AI composer panels
- **Customizable Interface**: Hide/show panels to focus on writing or use fullscreen mode
- **Resizable Right Panel**: Drag panel divider to adjust the width of the AI composer panel
- **Monaco Editor Integration**: Powerful code editor with syntax highlighting, auto-completion, and more
- **Markdown Editing**: Write and preview markdown content with formatting tools
- **Version History**: Track changes with version history and compare different versions with diff view
- **Document Comparison**: Compare any two documents side-by-side with diff highlighting
- **AI Assistance**: Get help from AI models for writing, editing, and brainstorming
- **Multiple LLM Providers**: Configure different AI providers (OpenAI, Anthropic, Google, Mistral, etc.)
- **Document Management**: Create, edit, and organize markdown documents
- **Dark/Light Mode**: Toggle between dark and light themes for both the app and editor
- **Auto-Save**: Automatically saves your work after a period of inactivity
- **Keyboard Shortcuts**: Familiar shortcuts like Ctrl+S for saving and Alt+1/2 for toggling panels

## Tech Stack

- **Next.js**: React framework for building the application
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Shadcn UI**: High-quality UI components built with Radix UI and Tailwind
- **Monaco Editor**: The code editor that powers VS Code, with diff view capabilities
- **React Markdown**: Markdown rendering
- **Zustand**: State management
- **LangChain**: Framework for working with language models

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/markdown-writing-app.git
   cd markdown-writing-app
   ```

2. Install dependencies:
   ```bash
   npm install
   # This will install all required dependencies
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Navigation Panel (Left)**: Browse and select documents
   - Click the comparison mode button to select two documents for comparison
   - Use checkboxes to select documents for comparison
   - Fixed width panel that can be hidden/shown
2. **Editor Panel (Middle)**: Write and edit markdown content with Monaco Editor
   - Use the formatting toolbar for common markdown elements
   - Switch between Edit and Preview modes
   - Use keyboard shortcuts (Ctrl+S to save, etc.)
   - Export your markdown files
   - Access version history and compare changes
3. **AI Composer Panel (Right)**: Interact with AI to get writing assistance
   - Resize by dragging the panel divider
   - Hide/show using the panel toggle button
4. **Panel Management**:
   - Toggle panels with the header buttons or keyboard shortcuts
   - Resize the right panel by dragging the divider
   - Enter fullscreen mode to hide both side panels
5. **Settings**: Configure LLM providers and API keys

## Document Comparison

The app includes powerful document comparison features:

- **Compare Documents**: Select two documents in comparison mode to see differences
- **Compare Versions**: Compare different versions of the same document
- **Side-by-Side View**: See differences highlighted in a side-by-side view
- **Restore Options**: Easily restore either version from the comparison view
- **Word-Level Diffs**: See precise word-level differences between documents

## Keyboard Shortcuts

The app includes several keyboard shortcuts for improved productivity:

- **Alt+1**: Toggle the left panel (document navigation)
- **Alt+2**: Toggle the right panel (AI composer)
- **Alt+3**: Toggle both panels
- **Alt+0**: Show both panels
- **Alt+F**: Toggle fullscreen mode (hide/show both panels)
- **Ctrl+S**: Save the current document
- **Various editor shortcuts**: All Monaco Editor keyboard shortcuts are available

## Version History

The app includes a powerful version history system:

- **Automatic Versioning**: Manual saves create new versions automatically
- **Version Comparison**: Compare any version with the current document using a side-by-side diff view
- **Version Restoration**: Easily restore previous versions of your documents
- **Version Notes**: Add descriptive notes to your versions for better organization

## Configuration

To use the AI features, you'll need to configure your LLM provider:

1. Click the Settings button in the navigation panel
2. Select your preferred LLM provider
3. Enter your API key
4. Select the model you want to use
5. Save your settings

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Next.js](https://nextjs.org/)
- [Shadcn UI](https://ui.shadcn.com/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Tailwind CSS](https://tailwindcss.com/)
- [React Markdown](https://github.com/remarkjs/react-markdown)
