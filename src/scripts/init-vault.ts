import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

// Base directory for the vault
const VAULT_DIR = path.join(process.cwd(), 'vault');

// Ensure vault directory exists
if (!fs.existsSync(VAULT_DIR)) {
  fs.mkdirSync(VAULT_DIR, { recursive: true });
}

// Create .obsidian directory
const OBSIDIAN_DIR = path.join(VAULT_DIR, '.obsidian');
if (!fs.existsSync(OBSIDIAN_DIR)) {
  fs.mkdirSync(OBSIDIAN_DIR, { recursive: true });
}

// Create some sample folders
const folders = [
  { name: 'Projects', path: path.join(VAULT_DIR, 'Projects') },
  { name: 'Daily Notes', path: path.join(VAULT_DIR, 'Daily Notes') },
  { name: 'Reference', path: path.join(VAULT_DIR, 'Reference') },
  { name: 'Web Development', path: path.join(VAULT_DIR, 'Projects', 'Web Development') },
];

folders.forEach(folder => {
  if (!fs.existsSync(folder.path)) {
    fs.mkdirSync(folder.path, { recursive: true });
  }
});

// Helper function to create a markdown file with frontmatter
const createMarkdownFile = (filePath: string, content: string, frontmatter: any) => {
  const fileContent = matter.stringify(content, frontmatter);
  fs.writeFileSync(filePath, fileContent);
};

// Create some sample files
const files = [
  {
    path: path.join(VAULT_DIR, 'Welcome.md'),
    content: `# Welcome to Your Obsidian-like Vault

This is your personal knowledge base. You can create and organize notes, link between them, and build your own knowledge graph.

## Features

- **[[Markdown Support]]** - Write in Markdown with support for formatting, lists, and more
- **[[Internal Links]]** - Create links between notes using the \`[[Note Name]]\` syntax
- **[[Folder Structure]]** - Organize your notes in folders and subfolders
- **[[Backlinks]]** - See which notes link to the current note

## Getting Started

1. Create a new note using the "New Note" button
2. Organize your notes in folders
3. Link between notes using \`[[Note Name]]\` syntax
4. Use the search to find notes quickly
`,
    frontmatter: {
      id: `doc-${Date.now()}-welcome`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['getting-started']
    }
  },
  {
    path: path.join(VAULT_DIR, 'Markdown Support.md'),
    content: `# Markdown Support

This app supports standard Markdown syntax for formatting your notes.

## Basic Formatting

- **Bold text** is written as \`**bold text**\`
- *Italic text* is written as \`*italic text*\`
- ~~Strikethrough~~ is written as \`~~strikethrough~~\`

## Lists

Unordered lists:
- Item 1
- Item 2
  - Nested item

Ordered lists:
1. First item
2. Second item
   1. Nested item

## Code Blocks

\`\`\`javascript
// This is a code block
function hello() {
  console.log("Hello, world!");
}
\`\`\`

## Links

- External links: [OpenAI](https://openai.com)
- Internal links: [[Internal Links]]

## Images

![Example Image](https://via.placeholder.com/150)

## Tables

| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
`,
    frontmatter: {
      id: `doc-${Date.now()}-markdown`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['reference', 'markdown']
    }
  },
  {
    path: path.join(VAULT_DIR, 'Internal Links.md'),
    content: `# Internal Links

One of the most powerful features of this app is the ability to create links between notes.

## Creating Links

To create a link to another note, use the \`[[Note Name]]\` syntax. For example:

- Link to [[Welcome]]
- Link to [[Markdown Support]]
- Link to [[Backlinks]]

## Following Links

You can click on any internal link to navigate to that note. If the note doesn't exist yet, you'll have the option to create it.

## Benefits of Linking

- Creates a network of connected thoughts
- Helps you discover relationships between ideas
- Makes navigation between related notes easier
- Builds a knowledge graph over time

The more you link your notes, the more valuable your knowledge base becomes.
`,
    frontmatter: {
      id: `doc-${Date.now()}-links`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['reference', 'linking']
    }
  },
  {
    path: path.join(VAULT_DIR, 'Backlinks.md'),
    content: `# Backlinks

Backlinks show you which notes link to the current note. This is a powerful way to discover connections in your knowledge base.

## How Backlinks Work

When you create a link to a note using the \`[[Note Name]]\` syntax, that link is tracked. The target note will show that it has been linked from other notes.

For example:
- [[Internal Links]] links to this note
- [[Welcome]] links to this note

## Benefits of Backlinks

- Discover unexpected connections
- See how ideas relate to each other
- Find notes that reference the current topic
- Build a bidirectional network of knowledge

Backlinks are displayed in the right sidebar when viewing a note.
`,
    frontmatter: {
      id: `doc-${Date.now()}-backlinks`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['reference', 'linking']
    }
  },
  {
    path: path.join(VAULT_DIR, 'Folder Structure.md'),
    content: `# Folder Structure

Organizing your notes in folders helps keep your knowledge base manageable as it grows.

## Creating Folders

You can create folders and subfolders to organize your notes by topic, project, or any other system that makes sense to you.

Some example folder structures:

- Projects/
  - Project A/
  - Project B/
- Areas/
  - Health/
  - Finance/
- Resources/
  - Books/
  - Articles/
- Archive/

## Moving Notes

You can move notes between folders to reorganize your vault as your needs change.

## Benefits of Good Organization

- Easier to find related notes
- Provides visual structure to your knowledge
- Helps separate different areas of your life or work
- Makes it easier to focus on specific projects or topics

Remember that you can always use search and links to find notes, regardless of where they're stored in your folder structure.
`,
    frontmatter: {
      id: `doc-${Date.now()}-folders`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['reference', 'organization']
    }
  },
  {
    path: path.join(VAULT_DIR, 'Projects', 'Project Ideas.md'),
    content: `# Project Ideas

A collection of project ideas to explore.

## Web Development

- Personal portfolio website
- Recipe collection app
- Habit tracker
- [[Web Development Resources]]

## Mobile Apps

- Meditation timer
- Plant identification app
- Language learning flashcards

## Writing

- Short story collection
- Technical blog posts
- Memoir essays

## Other

- Home automation system
- Digital garden
- Photography portfolio
`,
    frontmatter: {
      id: `doc-${Date.now()}-project-ideas`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['projects', 'ideas']
    }
  },
  {
    path: path.join(VAULT_DIR, 'Projects', 'Web Development', 'Web Development Resources.md'),
    content: `# Web Development Resources

A collection of useful resources for web development projects.

## Learning Platforms

- [MDN Web Docs](https://developer.mozilla.org)
- [freeCodeCamp](https://www.freecodecamp.org)
- [Frontend Masters](https://frontendmasters.com)

## Frameworks and Libraries

- React
- Vue
- Angular
- Next.js
- Svelte

## Design Resources

- [Figma](https://www.figma.com)
- [Dribbble](https://dribbble.com)
- [Unsplash](https://unsplash.com) (free images)

## Tools

- VS Code
- GitHub
- Vercel
- Netlify

## Related Notes

- [[Project Ideas]]
`,
    frontmatter: {
      id: `doc-${Date.now()}-web-resources`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['web-development', 'resources']
    }
  },
];

files.forEach(file => {
  createMarkdownFile(file.path, file.content, file.frontmatter);
});

console.log('Vault initialized with sample folders and files!'); 