---
id: doc-ui-test-backlinks
createdAt: '2025-03-15T18:57:00.000Z'
updatedAt: '2025-03-15T18:57:00.000Z'
versions:
  - id: ver-ui-test-backlinks-initial
    createdAt: '2025-03-15T18:57:00.000Z'
    message: Initial version
annotations: []
---

# Backlinks and Cross-References Test

This document tests how the UI handles backlinks, cross-references, and related features.

## Main Content

This document references several other documents in the vault:

- See [[1-Formatting-Test]] for examples of markdown formatting
- Check out [[3-Long-Document-Test]] for performance testing
- Review [[4-Annotations-Test]] for annotation examples
- Explore [[5-Embedded-Content-Test]] for embedded content

## Aliases and Alternative Text

- [[1-Formatting-Test|Formatting Examples]]
- [[3-Long-Document-Test|Document with lots of content]]
- [[Non-existent Document|This link should show as broken]]

## Nested References

This paragraph mentions [[1-Formatting-Test#Tables|tables in the formatting document]] and [[3-Long-Document-Test#Section-5|Section 5 of the long document]].

## Backlink Testing

This document should appear in the backlinks section of all the documents it references. You can test the backlink functionality by:

1. Opening one of the referenced documents
2. Checking if this document appears in its backlinks
3. Testing how the UI handles multiple backlinks

## Reference Map

Here's a map of how documents are connected:

```
2-Backlinks-Test
├── 1-Formatting-Test
├── 3-Long-Document-Test
├── 4-Annotations-Test
└── 5-Embedded-Content-Test
```

## Circular References

This document references itself: [[2-Backlinks-Test]]

And here's a reference to a specific section in this document: [[2-Backlinks-Test#Circular-References]]
