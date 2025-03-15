---
id: doc-ui-test-templates
createdAt: '2025-03-15T19:35:00.000Z'
updatedAt: '2025-03-15T19:35:00.000Z'
versions:
  - id: ver-ui-test-templates-initial
    createdAt: '2025-03-15T19:35:00.000Z'
    message: Initial version
tags:
  - templates
  - document-structure
  - testing
---

# Templates Test

This document tests how the UI handles various template formats and structures, focusing on the template system rather than the composition system.

## Front Matter Templates

### Basic Front Matter Template

```yaml
---
id: template-basic-frontmatter
name: Basic Front Matter Template
description: A simple template for document front matter
version: 1.0.0
fields:
  - name: title
    type: string
    label: Title
    description: The title of the document
    required: true
    default: "Untitled Document"
  - name: author
    type: string
    label: Author
    description: The author of the document
    required: false
    default: ""
  - name: date
    type: date
    label: Date
    description: The creation date of the document
    required: true
    default: "{{currentDate}}"
  - name: status
    type: select
    label: Status
    description: The current status of the document
    required: true
    default: "draft"
    options:
      - value: "draft"
        label: "Draft"
      - value: "review"
        label: "In Review"
      - value: "final"
        label: "Final"
  - name: tags
    type: array
    label: Tags
    description: Tags associated with the document
    required: false
    default: []
    itemType: string
---
```

### Advanced Front Matter Template

```yaml
---
id: template-advanced-frontmatter
name: Advanced Front Matter Template
description: A comprehensive template for document front matter with nested fields
version: 2.0.0
fields:
  - name: title
    type: string
    label: Title
    description: The title of the document
    required: true
    default: "Untitled Document"
    validation:
      minLength: 3
      maxLength: 100
  - name: subtitle
    type: string
    label: Subtitle
    description: The subtitle of the document
    required: false
    default: ""
  - name: authors
    type: array
    label: Authors
    description: The authors of the document
    required: true
    default: []
    itemType: object
    itemFields:
      - name: name
        type: string
        label: Name
        description: The author's name
        required: true
      - name: email
        type: string
        label: Email
        description: The author's email address
        required: false
        validation:
          pattern: "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
      - name: affiliation
        type: string
        label: Affiliation
        description: The author's organizational affiliation
        required: false
      - name: isCorrespondingAuthor
        type: boolean
        label: Corresponding Author
        description: Whether this author is the corresponding author
        required: false
        default: false
  - name: dates
    type: object
    label: Dates
    description: Important dates related to the document
    required: true
    fields:
      - name: created
        type: date
        label: Created
        description: The date the document was created
        required: true
        default: "{{currentDate}}"
      - name: updated
        type: date
        label: Updated
        description: The date the document was last updated
        required: true
        default: "{{currentDate}}"
      - name: published
        type: date
        label: Published
        description: The date the document was published
        required: false
  - name: version
    type: string
    label: Version
    description: The version of the document
    required: true
    default: "1.0.0"
    validation:
      pattern: "^\\d+\\.\\d+\\.\\d+$"
  - name: status
    type: select
    label: Status
    description: The current status of the document
    required: true
    default: "draft"
    options:
      - value: "draft"
        label: "Draft"
      - value: "review"
        label: "In Review"
      - value: "revision"
        label: "Revision"
      - value: "final"
        label: "Final"
      - value: "published"
        label: "Published"
      - value: "archived"
        label: "Archived"
  - name: categories
    type: array
    label: Categories
    description: Categories the document belongs to
    required: false
    default: []
    itemType: string
  - name: tags
    type: array
    label: Tags
    description: Tags associated with the document
    required: false
    default: []
    itemType: string
  - name: keywords
    type: array
    label: Keywords
    description: Keywords for indexing and search
    required: false
    default: []
    itemType: string
  - name: abstract
    type: text
    label: Abstract
    description: A brief summary of the document
    required: false
    default: ""
    validation:
      maxLength: 500
  - name: license
    type: select
    label: License
    description: The license under which the document is published
    required: false
    default: "cc-by"
    options:
      - value: "cc-by"
        label: "CC BY 4.0"
      - value: "cc-by-sa"
        label: "CC BY-SA 4.0"
      - value: "cc-by-nc"
        label: "CC BY-NC 4.0"
      - value: "cc-by-nc-sa"
        label: "CC BY-NC-SA 4.0"
      - value: "cc-by-nd"
        label: "CC BY-ND 4.0"
      - value: "cc-by-nc-nd"
        label: "CC BY-NC-ND 4.0"
      - value: "cc0"
        label: "CC0 1.0"
      - value: "all-rights-reserved"
        label: "All Rights Reserved"
  - name: references
    type: array
    label: References
    description: References cited in the document
    required: false
    default: []
    itemType: object
    itemFields:
      - name: id
        type: string
        label: ID
        description: A unique identifier for the reference
        required: true
      - name: type
        type: select
        label: Type
        description: The type of reference
        required: true
        options:
          - value: "article"
            label: "Journal Article"
          - value: "book"
            label: "Book"
          - value: "chapter"
            label: "Book Chapter"
          - value: "conference"
            label: "Conference Paper"
          - value: "website"
            label: "Website"
          - value: "other"
            label: "Other"
      - name: title
        type: string
        label: Title
        description: The title of the referenced work
        required: true
      - name: authors
        type: array
        label: Authors
        description: The authors of the referenced work
        required: true
        itemType: string
      - name: year
        type: number
        label: Year
        description: The year of publication
        required: true
      - name: source
        type: string
        label: Source
        description: The source of the referenced work (journal, book, etc.)
        required: false
      - name: url
        type: string
        label: URL
        description: The URL of the referenced work
        required: false
  - name: attachments
    type: array
    label: Attachments
    description: Files attached to the document
    required: false
    default: []
    itemType: object
    itemFields:
      - name: id
        type: string
        label: ID
        description: A unique identifier for the attachment
        required: true
      - name: name
        type: string
        label: Name
        description: The name of the attachment
        required: true
      - name: type
        type: string
        label: Type
        description: The MIME type of the attachment
        required: true
      - name: path
        type: string
        label: Path
        description: The path to the attachment
        required: true
  - name: customFields
    type: object
    label: Custom Fields
    description: Additional custom fields for the document
    required: false
    fields: []
---
```

## Content Templates

### Basic Content Template

```markdown
# {{title}}

By {{author}}
Date: {{date}}

## Abstract

{{abstract}}

## Introduction

{{introduction}}

## Main Content

{{content}}

## Conclusion

{{conclusion}}

## References

{{references}}
```

### Advanced Content Template with Conditionals

```markdown
# {{title}}
{{#if subtitle}}
## {{subtitle}}
{{/if}}

{{#if authors}}
**Authors:**
{{#each authors}}
- {{name}}{{#if affiliation}} ({{affiliation}}){{/if}}{{#if isCorrespondingAuthor}} *{{/if}}
{{/each}}
{{/if}}

**Date:** {{dates.created}}
{{#if dates.updated}}
**Last Updated:** {{dates.updated}}
{{/if}}
{{#if dates.published}}
**Published:** {{dates.published}}
{{/if}}

**Status:** {{status}}
**Version:** {{version}}

{{#if abstract}}
## Abstract

{{abstract}}
{{/if}}

{{#if keywords}}
**Keywords:** {{keywords}}
{{/if}}

## Introduction

{{introduction}}

{{#if methodology}}
## Methodology

{{methodology}}
{{/if}}

## Results

{{results}}

## Discussion

{{discussion}}

## Conclusion

{{conclusion}}

{{#if acknowledgments}}
## Acknowledgments

{{acknowledgments}}
{{/if}}

{{#if references}}
## References

{{#each references}}
{{id}}. {{authors}} ({{year}}). {{title}}. {{source}}{{#if url}} Available at: {{url}}{{/if}}
{{/each}}
{{/if}}

{{#if license}}
---

**License:** {{license}}
{{/if}}
```

### Template with Custom Sections and Components

```markdown
# {{title}}

{{> header}}

{{#if tableOfContents}}
## Table of Contents

{{> tableOfContents}}
{{/if}}

{{#each sections}}
## {{title}}

{{#if description}}
{{description}}
{{/if}}

{{#if content}}
{{content}}
{{/if}}

{{#if subsections}}
{{#each subsections}}
### {{title}}

{{#if description}}
{{description}}
{{/if}}

{{#if content}}
{{content}}
{{/if}}

{{#if components}}
{{#each components}}
{{> component type=type data=data}}
{{/each}}
{{/if}}
{{/each}}
{{/if}}

{{#if components}}
{{#each components}}
{{> component type=type data=data}}
{{/each}}
{{/if}}
{{/each}}

{{#if footnotes}}
---

## Footnotes

{{#each footnotes}}
{{id}}. {{content}}
{{/each}}
{{/if}}

{{> footer}}
```

## Template Partials

### Header Partial

```markdown
<!-- Header Partial -->
<div class="header">
  <div class="logo">{{companyLogo}}</div>
  <div class="title">{{title}}</div>
  <div class="subtitle">{{subtitle}}</div>
  <div class="metadata">
    <span class="author">{{author}}</span>
    <span class="date">{{date}}</span>
    <span class="version">v{{version}}</span>
  </div>
</div>
```

### Footer Partial

```markdown
<!-- Footer Partial -->
<div class="footer">
  <div class="copyright">© {{year}} {{companyName}}. All rights reserved.</div>
  <div class="page-number">Page {{pageNumber}} of {{totalPages}}</div>
  <div class="document-id">Document ID: {{documentId}}</div>
</div>
```

### Component Partial

```markdown
<!-- Component Partial -->
{{#if type == "codeBlock"}}
```{{data.language}}
{{data.code}}
```
{{#if data.caption}}
*{{data.caption}}*
{{/if}}
{{/if}}

{{#if type == "image"}}
![{{data.altText}}]({{data.url}})
{{#if data.caption}}
*{{data.caption}}*
{{/if}}
{{/if}}

{{#if type == "table"}}
| {{#each data.headers}} {{this}} |{{/each}}
| {{#each data.headers}} --- |{{/each}}
{{#each data.rows}}
| {{#each this}} {{this}} |{{/each}}
{{/each}}
{{#if data.caption}}
*{{data.caption}}*
{{/if}}
{{/if}}

{{#if type == "callout"}}
> **{{data.title}}**
> 
> {{data.content}}
{{/if}}

{{#if type == "video"}}
<video src="{{data.url}}" controls {{#if data.autoplay}}autoplay{{/if}} {{#if data.loop}}loop{{/if}}>
  Your browser does not support the video tag.
</video>
{{#if data.caption}}
*{{data.caption}}*
{{/if}}
{{/if}}

{{#if type == "audio"}}
<audio src="{{data.url}}" controls {{#if data.autoplay}}autoplay{{/if}} {{#if data.loop}}loop{{/if}}>
  Your browser does not support the audio tag.
</audio>
{{#if data.caption}}
*{{data.caption}}*
{{/if}}
{{/if}}

{{#if type == "embed"}}
<iframe src="{{data.url}}" width="{{data.width}}" height="{{data.height}}" frameborder="0" allowfullscreen></iframe>
{{#if data.caption}}
*{{data.caption}}*
{{/if}}
{{/if}}
```

## Template Helpers

### Date Formatting Helper

```javascript
Handlebars.registerHelper('formatDate', function(date, format) {
  // Format date according to the specified format
  return moment(date).format(format);
});
```

### Conditional Helper

```javascript
Handlebars.registerHelper('ifCond', function(v1, operator, v2, options) {
  switch (operator) {
    case '==':
      return (v1 == v2) ? options.fn(this) : options.inverse(this);
    case '===':
      return (v1 === v2) ? options.fn(this) : options.inverse(this);
    case '!=':
      return (v1 != v2) ? options.fn(this) : options.inverse(this);
    case '!==':
      return (v1 !== v2) ? options.fn(this) : options.inverse(this);
    case '<':
      return (v1 < v2) ? options.fn(this) : options.inverse(this);
    case '<=':
      return (v1 <= v2) ? options.fn(this) : options.inverse(this);
    case '>':
      return (v1 > v2) ? options.fn(this) : options.inverse(this);
    case '>=':
      return (v1 >= v2) ? options.fn(this) : options.inverse(this);
    case '&&':
      return (v1 && v2) ? options.fn(this) : options.inverse(this);
    case '||':
      return (v1 || v2) ? options.fn(this) : options.inverse(this);
    default:
      return options.inverse(this);
  }
});
```

### Math Helper

```javascript
Handlebars.registerHelper('math', function(lvalue, operator, rvalue) {
  lvalue = parseFloat(lvalue);
  rvalue = parseFloat(rvalue);
  
  switch (operator) {
    case '+': return lvalue + rvalue;
    case '-': return lvalue - rvalue;
    case '*': return lvalue * rvalue;
    case '/': return lvalue / rvalue;
    case '%': return lvalue % rvalue;
  }
});
```

## Template Inheritance

### Base Template

```markdown
<!DOCTYPE html>
<html>
<head>
  <title>{{title}}</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  {{#block "head"}}{{/block}}
</head>
<body>
  <header>
    {{#block "header"}}
    <h1>{{title}}</h1>
    {{/block}}
  </header>
  
  <main>
    {{#block "content"}}
    <p>Default content</p>
    {{/block}}
  </main>
  
  <footer>
    {{#block "footer"}}
    <p>&copy; {{year}} {{company}}</p>
    {{/block}}
  </footer>
</body>
</html>
```

### Child Template

```markdown
{{#extend "base"}}
  {{#content "head"}}
  <link rel="stylesheet" href="{{stylesheetUrl}}">
  <script src="{{scriptUrl}}"></script>
  {{/content}}
  
  {{#content "header"}}
  <h1>{{title}}</h1>
  <p>{{subtitle}}</p>
  {{/content}}
  
  {{#content "content"}}
  <div class="container">
    <div class="row">
      <div class="col">
        <h2>{{section1.title}}</h2>
        <p>{{section1.content}}</p>
      </div>
      <div class="col">
        <h2>{{section2.title}}</h2>
        <p>{{section2.content}}</p>
      </div>
    </div>
  </div>
  {{/content}}
  
  {{#content "footer"}}
  <p>&copy; {{year}} {{company}} - All rights reserved</p>
  <p>Contact: {{contact}}</p>
  {{/content}}
{{/extend}}
```

## Template Resources

- [[#Front Matter Templates|Front Matter Template Examples]]
- [[#Content Templates|Content Template Examples]]
- [[#Template Partials|Template Partial Examples]]
- [[#Template Helpers|Template Helper Examples]]
- [[#Template Inheritance|Template Inheritance Examples]]

---

*This document is for testing purposes and contains examples of templates to test UI rendering capabilities.*
