---
title: Project Specification
description: Template for creating detailed project specifications
---

{% set schema = {
  projectName: "z.string().min(3).max(100).describe('Project name')",
  
  client: "z.object({
    name: z.string().describe('Client name'),
    contactPerson: z.string().describe('Primary contact person'),
    email: z.string().email().describe('Contact email'),
    phone: z.string().optional().describe('Contact phone number')
  }).describe('Client information')",
  
  timeline: "z.object({
    startDate: z.date().describe('Project start date'),
    endDate: z.date().describe('Expected completion date'),
    milestones: z.array(z.object({
      name: z.string().describe('Milestone name'),
      date: z.date().describe('Milestone date')
    })).min(1).describe('Project milestones')
  }).describe('Project timeline')",
  
  budget: "z.number().positive().describe('Project budget in USD')",
  
  team: "z.array(z.object({
    name: z.string().describe('Team member name'),
    role: z.string().describe('Team member role')
  })).min(1).describe('Project team members')",
  
  objectives: "z.array(z.string()).min(1).describe('Project objectives')",
  
  scope: "z.string().min(50).describe('Project scope description')",
  
  risks: "z.array(z.string()).optional().describe('Potential project risks')"
} %}

# {{ projectName }} - Project Specification

## Client Information

**Client:** {{ client.name }}
**Contact Person:** {{ client.contactPerson }}
**Email:** {{ client.email }}
{% if client.phone %}**Phone:** {{ client.phone }}{% endif %}

## Project Timeline

**Start Date:** {{ timeline.startDate | dateFormat('MMMM d, yyyy') }}
**End Date:** {{ timeline.endDate | dateFormat('MMMM d, yyyy') }}

### Milestones

{% for milestone in timeline.milestones %}
- **{{ milestone.name }}**: {{ milestone.date | dateFormat('MMMM d, yyyy') }}
{% endfor %}

## Budget

**Total Budget:** ${{ budget }}

## Team

{% for member in team %}
- **{{ member.name }}** - {{ member.role }}
{% endfor %}

## Objectives

{% for objective in objectives %}
- {{ objective }}
{% endfor %}

## Project Scope

{{ scope }}

{% if risks and risks.length > 0 %}
## Potential Risks

{% for risk in risks %}
- {{ risk }}
{% endfor %}
{% endif %}

---

Document created on {{ date | dateFormat('MMMM d, yyyy') }} 