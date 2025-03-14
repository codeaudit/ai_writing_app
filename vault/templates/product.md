---
title: Product Template
description: Template for creating product documentation
---

{% set schema = {
  productName: "z.string().min(2).max(100).describe('Product name')",
  
  price: "z.number().positive().describe('Product price in USD')",
  
  description: "z.string().optional().describe('Detailed product description')",
  
  inStock: "z.boolean().default(true).describe('Whether the product is available')",
  
  categories: "z.array(z.string()).min(1).describe('Product categories')",
  
  releaseDate: "z.date().describe('Product release date')",
  
  features: "z.array(z.string()).min(1).describe('Key product features')"
} %}

# {{ productName }}

**Price:** ${{ price }}
**Release Date:** {{ releaseDate | dateFormat('MMMM d, yyyy') }}
**In Stock:** {{ inStock ? 'Yes' : 'No' }}

## Description

{{ description }}

## Categories

{% for category in categories %}
- {{ category }}
{% endfor %}

## Key Features

{% for feature in features %}
- {{ feature }}
{% endfor %}

## Additional Information

This product was created on {{ date | dateFormat('MMMM d, yyyy') }}. 