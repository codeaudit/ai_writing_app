---
id: doc-1741998337844-o56bq1r
createdAt: '2025-03-14T18:45:08.255Z'
updatedAt: '2025-03-15T00:26:03.270Z'
versions:
  - id: ver-1741977908255-initial
    createdAt: '2025-03-14T18:45:08.255Z'
    message: Initial version
annotations: []
---
# New Document 34

Start writing here...

#This is default template for composition

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
