---
id: doc-ui-test-templates-metadata
createdAt: '2025-03-15T19:02:00.000Z'
updatedAt: '2025-03-15T19:02:00.000Z'
versions:
  - id: ver-ui-test-templates-metadata-initial
    createdAt: '2025-03-15T19:02:00.000Z'
    message: Initial version
annotations: []
tags:
  - documentation
  - test
  - ui
  - templates
custom:
  status: Draft
  priority: High
  reviewDate: '2025-04-15'
  reviewers:
    - John Doe
    - Jane Smith
  score: 85
  published: false
---

# Templates and Metadata Test

This document tests how the UI handles templates, front matter, and custom metadata.

## Template Variables

{% set title = "Dynamic Title" %}
{% set author = "Test User" %}
{% set date = "2025-03-15" %}

## Template Output

**Title:** {{ title }}
**Author:** {{ author }}
**Date:** {{ date }}

## Conditional Content

{% if custom.status == "Draft" %}
This content only appears in drafts.
{% else %}
This content only appears in published documents.
{% endif %}

## Loops and Iterations

### Reviewers:
{% for reviewer in custom.reviewers %}
- {{ reviewer }}
{% endfor %}

## Template Includes (if supported)

{% include "templates/partial.md" %}

## Template Extends (if supported)

{% extends "templates/base.md" %}
{% block content %}
This is custom content that extends a base template.
{% endblock %}

## Custom Metadata Display

This document has the following custom metadata:

- **Status:** {{ custom.status }}
- **Priority:** {{ custom.priority }}
- **Review Date:** {{ custom.reviewDate }}
- **Score:** {{ custom.score }}
- **Published:** {{ custom.published }}

## Template Functions (if supported)

Current Date: {% now "YYYY-MM-DD" %}
Uppercase Title: {{ title | upper }}
Word Count: {{ content | word_count }}

## Form Fields (if supported)

<form>
  <label for="name">Name:</label>
  <input type="text" id="name" name="name"><br><br>
  
  <label for="email">Email:</label>
  <input type="email" id="email" name="email"><br><br>
  
  <label for="feedback">Feedback:</label>
  <textarea id="feedback" name="feedback" rows="4" cols="50"></textarea><br><br>
  
  <input type="submit" value="Submit">
</form>

## Interactive Elements (if supported)

<button onclick="alert('Button clicked!')">Click Me</button>

<select>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
  <option value="option3">Option 3</option>
</select>

<input type="checkbox" id="checkbox1" name="checkbox1" value="value1">
<label for="checkbox1">Checkbox 1</label>

## Template Errors (for testing error handling)

{{ undefined_variable }}
{% for item in non_existent_array %}{{ item }}{% endfor %}
{% if invalid_condition %}Invalid{% endif %}
