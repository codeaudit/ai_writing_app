---
id: doc-ui-test-formatting
createdAt: '2025-03-15T18:56:00.000Z'
updatedAt: '2025-03-15T18:56:00.000Z'
versions:
  - id: ver-ui-test-formatting-initial
    createdAt: '2025-03-15T18:56:00.000Z'
    message: Initial version
annotations: []
---

# Comprehensive Markdown Formatting Test

This document tests various markdown formatting features to ensure proper rendering in the UI.

## Text Formatting

**Bold text** for emphasis
*Italic text* for subtle emphasis
***Bold and italic*** for strong emphasis
~~Strikethrough~~ for deleted content
`Inline code` for code snippets
> Blockquote for quoted content
>> Nested blockquote for nested quotes

## Lists

### Unordered Lists
- Item 1
  - Nested item 1.1
  - Nested item 1.2
    - Deeply nested item 1.2.1
- Item 2
- Item 3

### Ordered Lists
1. First item
2. Second item
   1. Nested item 2.1
   2. Nested item 2.2
3. Third item

### Task Lists
- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task
- [ ] Task with **formatted** *text*

## Tables

| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |
| **Bold** | *Italic* | `Code`   |

### Complex Table

| Name | Age | Occupation | Notes |
|------|-----|------------|-------|
| John | 32  | Developer  | Works on [[Project Alpha]] |
| Jane | 28  | Designer   | Collaborates with marketing |
| Alex | 45  | Manager    | Oversees team of 12 |

## Code Blocks

```javascript
function helloWorld() {
  console.log("Hello, world!");
  return true;
}
```

```python
def fibonacci(n):
    if n <= 1:
        return n
    else:
        return fibonacci(n-1) + fibonacci(n-2)
```

## Links

[External link to Google](https://www.google.com)
[[Internal link to another document]]
[[Project Alpha|Link with custom text]]

## Images

![Image alt text](https://via.placeholder.com/150)

## Horizontal Rule

---

## Mixed Content

1. First point about **important** concept
   > Quote supporting this point
   > - With a nested list
   > - And another item

2. Second point with `code` and *emphasis*
   ```
   Example block
   of code
   ```

## Special Characters

Copyright symbol: ©
Registered trademark: ®
Emoji: 😊 🚀 💡

## Math Expressions (if supported)

Inline math: $E = mc^2$

Block math:
$$
\frac{d}{dx}(x^n) = nx^{n-1}
$$

## Footnotes

Here's a sentence with a footnote[^1].

[^1]: This is the footnote content.

## Definition Lists

Term 1
: Definition 1

Term 2
: Definition 2
: Another definition for term 2
