# MCP Servers Configuration

This file contains configuration for installed MCP servers.

```yaml
servers:
  - qualifiedName: exa
    config:
      exaApiKey: b4f1c7aa-6263-47c3-bb82-897414271ffc
      apiKey: b4f1c7aa-6263-47c3-bb82-897414271ffc
      description: |-
        Fast, intelligent web search and crawling.

        Exa combines embeddings and traditional search to deliver the best results for LLMs.
      homepage: https://smithery.ai/server/exa
      owner: ''
      repo: ''
      enabled: true
      useCount: 25854
      createdAt: '2024-12-13T15:46:50.750Z'
    enabled: true
    name: Exa Search
    deploymentUrl: https://server.smithery.ai/exa
    connections:
      - type: stdio
        configSchema:
          type: object
          required:
            - exaApiKey
          properties:
            exaApiKey:
              type: string
              description: The API key for the Exa AI Search server.
        exampleConfig:
          exaApiKey: your-api-key-here
        published: true
        stdioFunction: 'config => ({ command: ''npx'', args: [''-y'', ''exa-mcp-server''], env: { EXA_API_KEY: config.exaApiKey } })'
      - type: ws
        deploymentUrl: https://server.smithery.ai/exa
        configSchema:
          type: object
          required:
            - exaApiKey
          properties:
            exaApiKey:
              type: string
              description: The API key for accessing the Exa Search API.

```
