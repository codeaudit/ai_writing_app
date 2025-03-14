---
title: Product Template
description: Template for creating product documentation
---

{% set schema = {
  "fields": {
    "productName": {
      "type": "string",
      "description": "Name of the product"
    },
    "category": {
      "type": "enum",
      "options": ["Electronics", "Clothing", "Food", "Books", "Home", "Other"],
      "description": "Product category"
    },
    "price": {
      "type": "number",
      "positive": true,
      "description": "Product price"
    },
    "inStock": {
      "type": "boolean",
      "default": true,
      "description": "Whether the product is in stock"
    },
    "releaseDate": {
      "type": "date",
      "description": "Product release date"
    },
    "features": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Key product features"
    },
    "colors": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "Available colors"
    }
  }
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