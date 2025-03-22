# LLM Extension for Nunjucks Templates

This extension adds an `{% llm %}` tag to Nunjucks templates that allows generating content from LLMs (Large Language Models) directly within your templates.

## Installation

The LLM extension is automatically registered with the Nunjucks environment in the application, so you can use it right away in your templates.

## Basic Usage

The simplest way to use the extension is with a prompt string:

```nunjucks
{% llm "Generate a short paragraph about climate change" %}
```

This will generate text using the default LLM settings.

## Parameters

The `llm` tag supports a wide range of parameters to control the behavior of the LLM:

```nunjucks
{% llm "Generate a creative story about a robot", 
   provider: "anthropic", 
   model: "claude-2", 
   temperature: 0.9, 
   maxTokens: 2000,
   aiRole: "creative"
%}
```

### Available Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `provider` | string | *from context* | The LLM provider to use (openai, anthropic, gemini, openrouter) |
| `model` | string | *from context* | The specific model to use (e.g., gpt-4, claude-2) |
| `temperature` | number | 0.7 | Controls randomness (0.0-1.0, lower is more deterministic) |
| `maxTokens` | number | 1000 | Maximum number of tokens in the response |
| `token_length` | number | 1000 | Alias for maxTokens |
| `systemPrompt` | string | *from aiRole* | Custom system prompt to guide the model |
| `system` | string | *from aiRole* | Alias for systemPrompt |
| `aiRole` | string | "assistant" | Predefined role to use (assistant, co-creator, validator, etc.) |
| `chat` | boolean | false | Use chat completion API instead of text completion |
| `messages` | array | null | Array of messages for chat mode |
| `contextDocuments` | array | [] | Array of documents to provide as context |
| `stream` | boolean | false | Whether to stream the response (advanced usage) |

## Advanced Usage

### Using Context Variables

You can use variables from your template context:

```nunjucks
{% llm userQuestion, temperature: userTemperature %}
```

### Using Context Documents

Provide context documents to give the LLM relevant information:

```nunjucks
{% llm "Summarize these documents", 
   contextDocuments: documents
%}
```

### Chat Mode with Messages

For multi-turn conversations, use chat mode with messages:

```nunjucks
{% llm "What do you think?", 
   chat: true,
   messages: [
     { role: "user", content: "What is machine learning?" },
     { role: "assistant", content: "Machine learning is..." },
     { role: "user", content: "How does it relate to AI?" }
   ]
%}
```

### Custom System Prompt

Provide a custom system prompt to guide the model's behavior:

```nunjucks
{% llm "Write a poem about the ocean", 
   systemPrompt: "You are a professional poet who specializes in nature poetry. Write in the style of Emily Dickinson."
%}
```

### Using with AI Roles

Use predefined AI roles to guide the model's behavior:

```nunjucks
{% llm "Improve this paragraph", 
   aiRole: "editor"
%}
```

## Setting Default LLM Values in Context

You can set default values in your template context:

```javascript
nunjucksEnv.renderString(template, {
  // Your other variables...
  llmDefaultProvider: "openai",
  llmDefaultModel: "gpt-4",
  llmDefaultRole: "assistant"
});
```

## Error Handling

If the LLM call fails, an error message will be displayed in the output. You can wrap the call in a try/catch block using Nunjucks error handling:

```nunjucks
{% try %}
  {% llm "Generate some content" %}
{% catch %}
  Unable to generate content. Please try again later.
{% endtry %}
```

## Examples

### Creating a Blog Post Introduction

```nunjucks
# {{ title }}

{% llm "Write an engaging introduction for a blog post with the title: " + title, 
   temperature: 0.8,
   aiRole: "blogger" 
%}
```

### Generating a Content Summary

```nunjucks
## Summary

{% llm "Summarize the following content in 3-5 bullet points: " + content,
   maxTokens: 500,
   temperature: 0.3
%}
```

### Creating a Custom FAQ Section

```nunjucks
## Frequently Asked Questions

{% llm "Generate 5 frequently asked questions and answers about: " + productName,
   contextDocuments: productDocuments
%}
```

### Technical Analysis

```nunjucks
## Technical Analysis

{% llm "Analyze the following code and explain what it does: " + codeSnippet,
   aiRole: "developer",
   temperature: 0.2
%}
```

## Performance Considerations

- LLM calls are asynchronous and may take several seconds to complete
- Using the extension with many LLM calls in a single template may cause slow rendering
- Consider caching the results for frequently used templates
- Use lower max token values when possible to improve response times

## Security Notes

- The LLM extension makes server-side API calls to LLM providers
- API keys are managed by the server and never exposed to clients
- User input used in prompts should be validated to prevent prompt injection attacks
- Consider the privacy implications of sending potentially sensitive data to LLM providers

## Testing the Extension

To test the LLM extension, you can use the sample template provided at `vault/templates/llm-demo.md`. This template demonstrates various ways to use the LLM extension.

### Testing Steps:

1. Start your development server with `npm run dev`
2. Access the template processing endpoint:
   - Use a POST request to `/api/templates/process`
   - Include the template name and variables in the request body:

```json
{
  "templateName": "llm-demo.md",
  "variables": {
    "date": "2023-10-15T14:30:00.000Z",
    "author": "Your Name",
    "topic": "quantum computing",
    "content": "Artificial intelligence is transforming industries across the globe. The rapid advancement of machine learning algorithms has enabled new applications."
  }
}
```

3. The response will include the processed template with LLM-generated content replacing the `{% llm %}` tags.

### Testing via UI:

If your application has a template testing UI, you can also:

1. Navigate to the templates section
2. Select the "llm-demo.md" template
3. Provide values for the variables
4. Process the template to see the results

### Debugging

If the LLM call fails, you'll see an error message in the place of the LLM content. Common issues include:

- Missing API keys for the LLM provider
- Network connectivity problems
- Invalid prompt format or parameters

Check your server logs for more detailed error information. 