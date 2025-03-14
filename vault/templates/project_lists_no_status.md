---
id: doc-1741954927181
createdAt: '2025-03-14T12:22:07.181Z'
updatedAt: '2025-03-14T12:22:25.594Z'
versions:
  - id: ver-1741954927181-initial
    createdAt: '2025-03-14T12:22:07.181Z'
    message: Initial version
annotations: []
---
{% set schema = {
  description: "z.string().describe('Brief description of the project')",
  dueDate: "z.date().describe('Project deadline')",
  budget: "z.number().min(0).describe('Project budget in dollars')",
  isPublic: "z.boolean().default(false).describe('Whether this project is publicly visible')",
  tags: "z.array(z.string()).describe('Project tags or categories')",
  team: "z.array(z.string()).describe('Team members working on this project')"
} %}

# {{ title }}

**Project Description**: {{ description }}
**Status**: {{ status }}
**Priority**: {{ priority }}
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
