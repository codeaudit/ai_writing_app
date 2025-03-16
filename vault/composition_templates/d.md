---
id: doc-1742144097440-i6qviki
name: d
createdAt: '2025-03-15T23:32:29.801Z'
updatedAt: '2025-03-16T16:55:38.695Z'
versions:
  - id: ver-1742081549801-initial
    createdAt: '2025-03-15T23:32:29.801Z'
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

#This is default template for composition 33

# {{ title }}

Created on {{ date | dateFormat('MMMM d, yyyy') }} at {{ time | timeFormat }}

{% if contextDocuments.length > 0 %}
## Context Documents

{% for doc in contextDocuments %}
- {{ doc.name }}
- {{ doc.content }}
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
