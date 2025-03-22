---
title: LLM Extension Demo
date: {{ date | dateFormat }}
author: {{ author | default('AI Writing Assistant') }}
---

# LLM Extension Demo

This template demonstrates the capabilities of the LLM extension in Nunjucks templates.

## Basic Example

### Prompt: Generate a short paragraph about climate change

{% llm "Generate a short paragraph about climate change" %}

## Using Parameters

### Prompt: Generate a creative story with high temperature

{% llm "Generate a short creative story about a robot discovering emotions", 
   temperature: 0.9, 
   maxTokens: 500
%}

## Using Context Variables

### Prompt: Answer a question about {{ topic | default('artificial intelligence') }}

{% llm "Write a short explanation about " + topic | default('artificial intelligence') %}

## Using AI Roles

### Prompt: Write as a poet

{% llm "Write a poem about the ocean", 
   aiRole: "creative"
%}

## Content Transformation

### Original Content:
```
{{ content | default('The quick brown fox jumps over the lazy dog. This is a sample sentence used for text processing demonstrations.') }}
```

### LLM-Enhanced Content:
{% llm "Improve the following content to make it more engaging and descriptive: " + content | default('The quick brown fox jumps over the lazy dog. This is a sample sentence used for text processing demonstrations.'),
   temperature: 0.7,
   maxTokens: 300
%}

## Custom Context Documents (when provided)

{% if contextDocuments and contextDocuments.length > 0 %}
### Summary of Context Documents:

{% llm "Summarize the following documents in a few paragraphs:", 
   contextDocuments: contextDocuments,
   temperature: 0.5
%}
{% else %}
*No context documents provided. To see this feature in action, provide context documents when processing this template.*
{% endif %}

## Chat Mode Example

{% llm "Provide a conclusion based on this conversation", 
   chat: true,
   messages: [
     { role: "user", content: "What are the benefits of exercise?" },
     { role: "assistant", content: "Exercise has many benefits including improved cardiovascular health, better mood through endorphin release, increased strength and flexibility, better sleep quality, and reduced risk of chronic diseases." },
     { role: "user", content: "What about the mental health benefits specifically?" }
   ]
%}

---

*This template was rendered at {{ date | dateFormat('PP') }} {{ date | timeFormat }}* 