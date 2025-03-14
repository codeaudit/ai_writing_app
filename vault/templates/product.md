---
title: Product Template
description: Template for creating product documentation
---

{% set schema = {
  productName: "z.string().describe('Name of the product')",
  category: "z.enum(['Electronics', 'Clothing', 'Food', 'Books', 'Home', 'Other']).describe('Product category')",
  price: "z.number().positive().describe('Product price')",
  inStock: "z.boolean().default(true).describe('Whether the product is in stock')",
  releaseDate: "z.date().describe('Product release date')",
  features: "z.array(z.string()).describe('Key product features')",
  colors: "z.array(z.string()).describe('Available colors')"
} %}

# {{ title }}

## Product Information

**Name**: {{ productName }}
**Category**: {{ category }}
**Price**: ${{ price }}
**In Stock**: {% if inStock %}Yes{% else %}No{% endif %}
**Release Date**: {{ releaseDate | dateFormat('MMMM d, yyyy') }}

## Features

{% if features.length > 0 %}
{% for feature in features %}
- {{ feature }}
{% endfor %}
{% else %}
No features listed.
{% endif %}

## Available Colors

{% if colors.length > 0 %}
{% for color in colors %}
- {{ color }}
{% endfor %}
{% else %}
No color options available.
{% endif %}

## Description

Write your product description here...

## Notes 