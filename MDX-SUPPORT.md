# MDX Support in the Writing App

The editor now supports MDX (Markdown with JSX) to enhance your documents with dynamic components and interactive elements.

## What is MDX?

MDX allows you to use JSX (JavaScript XML) directly in your markdown files. This enables:

- Using React components in your markdown
- Creating interactive documents with dynamic content
- Embedding custom visualizations, charts, and UI elements
- Implementing sophisticated document layouts

## How to Use MDX

### Basic MDX Syntax

MDX files support all standard Markdown syntax, plus JSX components:

```mdx
# My MDX Document

Regular markdown **bold** and *italic* works normally.

## Using Components

<CustomComponent prop="value">
  This is content inside the component
</CustomComponent>

## Mixing Markdown and JSX

You can mix markdown and JSX freely:

- List item 1
- <Highlight>List item with a component</Highlight>
- List item 3
```

### Using JavaScript Expressions

You can use JavaScript expressions in curly braces:

```mdx
# Dynamic Content

The current date is: {new Date().toLocaleDateString()}

{['apple', 'banana', 'orange'].map(fruit => (
  <li key={fruit}>{fruit}</li>
))}
```

### Import Statements

You can import components at the top of your MDX file:

```mdx
import { Chart } from './components/Chart'
import { Counter } from './components/Counter'

# My Interactive Dashboard

Here's a chart of our data:

<Chart data={myData} />

And a counter component:

<Counter initialValue={5} />
```

## Features

- Full Monaco Editor integration with JSX syntax highlighting
- Code completion for common JSX elements
- Live preview of MDX content
- Support for frontmatter metadata
- Export to HTML or PDF with rendered components

## Implementation Details

The MDX support is implemented using:

1. Monaco Editor with custom language configuration
2. next-mdx-remote for server-side and client-side rendering
3. Custom components for specialized UI elements

## Future Enhancements

- Component library for common document elements
- Theme customization for MDX components
- Better debugging tools for MDX errors
- Template system with pre-built MDX layouts 