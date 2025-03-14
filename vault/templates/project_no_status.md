---
id: doc-1741954007552
createdAt: '2025-03-14T12:06:47.552Z'
updatedAt: '2025-03-14T12:09:21.962Z'
versions:
  - id: ver-1741954007552-initial
    createdAt: '2025-03-14T12:06:47.552Z'
    message: Initial version
annotations: []
---
{% set schema = {
  description: "z.string().describe('Brief description of the project')",
  dueDate: "z.date().describe('Project deadline')",
  budget: "z.number().min(0).describe('Project budget in dollars')",
  isPublic: "z.boolean().default(false).describe('Whether this project is publicly visible')",
} %}

# {{ title }}

**Project Description**: {{ description }}
**Due Date**: {{ dueDate | dateFormat('MMMM d, yyyy') }}
**Budget**: ${{ budget }}
**Public**: {% if isPublic %}Yes{% else %}No{% endif %}

## Overview

{{ description }}

## Team Members

{% if team.length > 0 %}
{% for member in team %}
- {{ member }}
{% endfor %}
{% else %}
No team members assigned yet.
{% endif %}

## Tags

{% if tags.length > 0 %}
{% for tag in tags %}
- {{ tag }}
{% endfor %}
{% else %}
No tags assigned.
{% endif %}

## Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Notes 
