---
id: doc-1741945192434-qev3k9b
createdAt: '2025-03-14T09:39:52.434Z'
updatedAt: '2025-03-15T22:02:04.593Z'
versions:
  - id: ver-1741945495532
    createdAt: '2025-03-14T09:44:55.532Z'
    message: 'Manual save on 3/14/2025, 5:44:55 AM'
annotations: []
---
# this is the default template from templates

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
