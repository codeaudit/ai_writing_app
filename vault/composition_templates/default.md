---
id: doc-1741977908255
createdAt: '2025-03-14T18:45:08.255Z'
updatedAt: '2025-03-14T18:54:59.029Z'
versions:
  - id: ver-1741977908255-initial
    createdAt: '2025-03-14T18:45:08.255Z'
    message: Initial version
annotations: []
---

{% set schema = {
  "fields": {
    "description": {
      "type": "string",
      "description": "Brief description of the document"
    },
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

# {{ title }}

Created on {{ date | dateFormat('MMMM d, yyyy') }} at {{ time | timeFormat }}

{% if contextDocuments.length > 0 %}
## Context Documents

{% for doc in contextDocuments %}
- {{ doc.name }}
{% endfor %}
{% endif %}

{% if chatMessages.length > 0 %}
## Chat History

{% for message in chatMessages %}
### {{ message.role | capitalize }}

{{ message.content }}

{% endfor %}
{% endif %}

## New Content

{% if description %}
{{ description }}
{% else %}
Start writing here...
{% endif %}
