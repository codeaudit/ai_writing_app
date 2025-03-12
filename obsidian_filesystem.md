Obsidian's File Management System
Obsidian uses a file-based approach to knowledge management that works directly with Markdown files stored on your local system. Here's a detailed explanation of how Obsidian's file management system works:
Core Architecture
Obsidian organizes content around "vaults," which are simply folders on your file system. Each vault is a self-contained workspace with its own settings, plugins, and files. The fundamental aspects include:
Local File Storage

Files are stored as plain text Markdown (.md) files on your local device
No proprietary database is used - everything is accessible through your file system
Changes are saved directly to your disk

Folder Structure

You can create any folder hierarchy within a vault
Folders and subfolders can be created, renamed, and moved through Obsidian's interface
The folder structure is reflected in your actual file system

File Operations
Obsidian provides several ways to manage files:
File Explorer

The left sidebar File Explorer shows your vault's folder structure
Right-clicking files/folders provides options like create, rename, delete, and move
You can drag and drop files between folders
File operations in Obsidian sync with your file system immediately

Quick Switcher

The Quick Switcher (Ctrl/Cmd+O) allows rapid file access without using the explorer
It supports fuzzy search to find files quickly
It can create new files in specific locations when combined with folder paths

Internal Linking System

Links between files use the [[filename]] syntax
Links automatically update when files are renamed
When files are moved, Obsidian can update all links pointing to them

Metadata Management
Obsidian enhances file management with metadata features:
YAML Frontmatter

Files can contain YAML frontmatter at the top for metadata
This includes tags, aliases, creation date, and custom properties
The metadata doesn't affect the file's compatibility with other Markdown editors

Tags

Tags can be added in frontmatter or inline with #tag syntax
The Tags pane provides an overview of all tags in the vault
Clicking a tag shows all notes containing that tag

Synchronization
Obsidian manages synchronization in different ways:
File System Events

Obsidian monitors file system events to detect external changes
If files are modified outside Obsidian, changes are reflected when you return to the app
This allows integration with external tools and file management utilities

Obsidian Sync (Premium Feature)

End-to-end encrypted sync service for vaults across devices
Handles conflict resolution when the same file is modified in multiple places
Provides version history of files

Attachments and Media
Obsidian has specific handling for non-Markdown files:
Asset Management

Images, PDFs, and other attachments can be stored in the vault
Default location is an "attachments" folder, but this is configurable
Attachments are referenced in notes using Markdown image/link syntax

Embedding

Media files can be embedded directly in notes
Supported formats include images, audio, video, and PDFs
Obsidian renders these embeds in Preview mode

Technical Implementation
Under the hood:

Obsidian uses Electron, which provides Node.js capabilities for file system access
The app monitors file system events using Node.js's fs.watch API
Files are parsed and rendered using custom Markdown parsers
The graph view and other features build an in-memory representation of links between files

This architecture makes Obsidian powerful yet flexible - you own your data, can access it with other tools, and can implement your own file management strategies alongside Obsidian's built-in capabilities.
