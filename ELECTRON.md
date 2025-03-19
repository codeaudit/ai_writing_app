# Writing App - Electron Desktop Application

This document provides instructions for running, building, and packaging the Writing App as an Electron desktop application.

## Prerequisites

- Node.js (v18 or newer)
- npm (v9 or newer)

## Development

### Installation

First, install all dependencies:

```bash
npm install
```

### Running in Development Mode

To run the app in development mode:

```bash
npm run electron-dev
```

This command will:
1. Start the Next.js development server
2. Wait for it to be available at http://localhost:3000
3. Launch Electron with the development version of the app

### Building for Production

To build the app for production:

```bash
npm run package
```

This will:
1. Build the Next.js application
2. Package it with Electron Builder
3. Create an installer for your current platform

## Platform-Specific Builds

### Building for All Platforms

```bash
npm run package-all
```

### Building for macOS

```bash
npm run package-mac
```

### Building for Windows

```bash
npm run package-win
```

### Building for Linux

```bash
npm run package-linux
```

## Architecture

The Electron app consists of:

1. **Main Process (`electron/main.js`)**
   - Handles window creation and management
   - Provides native OS functionality
   - Manages the application menu
   - Handles file system operations

2. **Preload Script (`electron/preload.js`)**
   - Creates a secure bridge between the renderer process and the main process
   - Exposes limited Electron APIs to the renderer

3. **Renderer Process (Next.js App)**
   - The actual web application
   - Communicates with the main process via the preload script
   - Handles UI rendering and business logic

4. **Electron Service (`src/lib/electron-service.ts`)**
   - Provides utility functions for Electron functionality
   - Handles file operations and menu events

5. **Electron Provider (`src/components/electron-provider.tsx`)**
   - Integrates Electron with the React application
   - Sets up event listeners for menu actions
   - Provides context for Electron features

## File System Integration

The app provides file system integration through Electron's native APIs:

- **Open File**: Uses system file dialog to open Markdown files
- **Save File**: Saves documents to the file system
- **Open Folder**: Opens a folder and loads all Markdown files
- **Export**: Exports documents as PDF or HTML

## Menu Shortcuts

| Action | Shortcut |
|--------|----------|
| New Document | Ctrl/Cmd + N |
| Open File | Ctrl/Cmd + O |
| Open Folder | Ctrl/Cmd + Shift + O |
| Save | Ctrl/Cmd + S |
| Save As | Ctrl/Cmd + Shift + S |
| Find | Ctrl/Cmd + F |
| Replace | Ctrl/Cmd + H |
| Toggle Left Panel | Ctrl/Cmd + B |
| Toggle Right Panel | Ctrl/Cmd + J |
| Toggle Dark Mode | Ctrl/Cmd + Shift + D |

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**
   - Ensure all dependencies are installed with `npm install`

2. **White screen when launching**
   - Check console for errors
   - Verify that the Next.js build worked correctly

3. **File operations not working**
   - Check permissions for file access

### Development Debugging

When running in development mode, you can access the Chrome DevTools by:

1. Running `npm run electron-dev`
2. The DevTools should open automatically
3. If not, use the View menu > Developer > Toggle Developer Tools 