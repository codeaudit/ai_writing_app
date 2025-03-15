---
id: doc-ui-test-annotations
createdAt: '2025-03-15T18:59:00.000Z'
updatedAt: '2025-03-15T18:59:00.000Z'
versions:
  - id: ver-ui-test-annotations-initial
    createdAt: '2025-03-15T18:59:00.000Z'
    message: Initial version
annotations:
  - id: anno-ui-test-1
    documentId: doc-ui-test-annotations
    startOffset: 150
    endOffset: 220
    content: "This is a simple annotation that tests basic annotation functionality."
    color: yellow
    createdAt: '2025-03-15T18:59:10.000Z'
    updatedAt: '2025-03-15T18:59:10.000Z'
    tags: ["test", "basic"]
  - id: anno-ui-test-2
    documentId: doc-ui-test-annotations
    startOffset: 350
    endOffset: 450
    content: "This annotation has **markdown formatting** and *styling* to test rich text in annotations."
    color: blue
    createdAt: '2025-03-15T18:59:20.000Z'
    updatedAt: '2025-03-15T18:59:20.000Z'
    tags: ["formatting", "markdown"]
  - id: anno-ui-test-3
    documentId: doc-ui-test-annotations
    startOffset: 600
    endOffset: 700
    content: "This annotation has a link to [[1-Formatting-Test]] to test cross-references in annotations."
    color: green
    createdAt: '2025-03-15T18:59:30.000Z'
    updatedAt: '2025-03-15T18:59:30.000Z'
    tags: ["links", "references"]
  - id: anno-ui-test-4
    documentId: doc-ui-test-annotations
    startOffset: 900
    endOffset: 1000
    content: "This is a very long annotation that tests how the UI handles lengthy annotation content. It should wrap properly and be scrollable if necessary. The UI should provide a good reading experience even for annotations with substantial text content."
    color: red
    createdAt: '2025-03-15T18:59:40.000Z'
    updatedAt: '2025-03-15T18:59:40.000Z'
    tags: ["long", "scrolling"]
  - id: anno-ui-test-5
    documentId: doc-ui-test-annotations
    startOffset: 1200
    endOffset: 1300
    content: "```javascript\nfunction testCode() {\n  console.log('Testing code in annotations');\n}\n```"
    color: purple
    createdAt: '2025-03-15T18:59:50.000Z'
    updatedAt: '2025-03-15T18:59:50.000Z'
    tags: ["code", "syntax"]
---

# Annotations Test Document

This document is designed to test how the UI handles annotations. It contains multiple paragraphs with different annotations applied to test various annotation features.

## Basic Annotation

This paragraph has a basic annotation applied to it. The annotation should be visible when hovering over the highlighted text and should display properly when clicked.

## Formatted Annotation

This paragraph has an annotation with rich text formatting. The annotation includes bold text, italic text, and other markdown formatting to test how the UI renders formatted annotations.

## Annotation with Links

This paragraph has an annotation that includes links to other documents. The annotation should properly render the links and allow navigation to the referenced documents.

## Long Annotation

This paragraph has a very long annotation applied to it. The annotation contains a substantial amount of text to test how the UI handles lengthy annotations. The annotation should be properly displayed and scrollable if necessary.

## Annotation with Code

This paragraph has an annotation that includes a code block. The annotation should properly render the code with syntax highlighting if supported by the UI.

## Multiple Annotations

This paragraph has multiple overlapping annotations applied to it. The UI should handle overlapping annotations gracefully and allow the user to interact with each annotation individually.

## Annotation Tags

This paragraph has annotations with different tags. The UI should display the tags and allow filtering or searching by tag if supported.

## Annotation Colors

This paragraph has annotations with different colors. The UI should properly display the different highlight colors and maintain consistent styling.

## Annotation Editing

This paragraph is for testing annotation editing. Try editing the annotations on this paragraph to test the editing functionality of the UI.

## Annotation Deletion

This paragraph is for testing annotation deletion. Try deleting annotations on this paragraph to test the deletion functionality of the UI.
