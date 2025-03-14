---
id: doc-1741966030134-p04qfua
createdAt: '2025-03-14T15:27:10.134Z'
updatedAt: '2025-03-14T15:33:56.372Z'
versions: []
annotations: []
---
{% set schema = {
  "fields": {
    "description": {
      "type": "string",
      "description": "Brief description of the project"
    },
    "status": {
      "type": "enum",
      "options": ["Not Started", "In Progress", "Completed", "On Hold"],
      "description": "Current project status"
    },
    "priority": {
      "type": "enum",
      "options": ["Low", "Medium", "High", "Critical"],
      "description": "Project priority level"
    },
    "dueDate": {
      "type": "date",
      "description": "Project deadline"
    },
    "budget": {
      "type": "number",
      "min": 0,
      "description": "Project budget in dollars"
    },
    "isPublic": {
      "type": "boolean",
      "default": false,
      "description": "Whether this project is publicly visible"
    },
    "tags": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Project tags or categories"
    },
    "team": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Team members working on this project"
    }
  }
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
