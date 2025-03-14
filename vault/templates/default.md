---
id: doc-1741945192434-qev3k9b
createdAt: '2025-03-14T09:39:52.434Z'
updatedAt: '2025-03-14T19:13:25.840Z'
versions:
  - id: ver-1741945495532
    createdAt: '2025-03-14T09:44:55.532Z'
    message: 'Manual save on 3/14/2025, 5:44:55 AM'
annotations: []
---

{% set schema = {
  "fields": {
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Document tags or categories"
    },
    "isImportant": {
      "type": "boolean",
      "default": false,
      "description": "Mark as important document"
    }
  }
} %}

# {{title}}

Created on {{date | dateFormat('MMMM d, yyyy')}}

{% if isImportant %}
**IMPORTANT DOCUMENT**
{% endif %}

## Overview

{{description}}

{% if tags.length > 0 %}
## Tags
{% for tag in tags %}
- {{tag}}
{% endfor %}
{% endif %}

Start writing here...
