// Create module declarations
declare module 'ws';
declare module 'dotenv';

import Anthropic from "@anthropic-ai/sdk"
// Use any for Anthropic types to resolve version conflicts
import dotenv from "dotenv"
import { exit } from "node:process"
import { OpenAI } from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/index.mjs"
import { MultiClient } from "@smithery/sdk/index.js"
import { AnthropicChatAdapter } from "@smithery/sdk/integrations/llm/anthropic.js"
import { OpenAIChatAdapter } from "@smithery/sdk/integrations/llm/openai.js"
import { createTransport } from "@smithery/sdk/transport.js"
import WebSocket from 'ws';

// Type declaration for global WebSocket
declare global {
	interface Window {
		WebSocket: typeof WebSocket;
	}
}

// Assign WebSocket to global to avoid connection issues
// @ts-ignore - ignore type errors for global assignment
global.WebSocket = WebSocket;

/**
 * Showcases a multi-tool calling example with OpenAI or Anthropic
 * using environment variables from .env.local
 */
async function main() {
	// Load environment variables from .env.local first, then .env
	dotenv.config({ path: '.env.local' })
	dotenv.config()

	const args = process.argv.slice(2)
	const useOpenAI = args.includes("--openai")

	// Get configuration from environment variables
	const EXA_API_KEY = process.env.EXA_API_KEY
	const SMITHERY_API_KEY = process.env.SMITHERY_API_KEY
	const EXA_SERVER_URL = process.env.EXA_SERVER_URL || 'https://server.smithery.ai/exa'

	// Validate required environment variables
	if (!EXA_API_KEY || !SMITHERY_API_KEY) {
		console.error("Missing required environment variables. Please create a .env.local file with:")
		console.error("EXA_API_KEY=your_exa_api_key")
		console.error("SMITHERY_API_KEY=your_smithery_api_key")
		console.error("EXA_SERVER_URL=https://server.smithery.ai/exa (optional)")
		exit(1)
	}

	console.log(`Using server: ${EXA_SERVER_URL}`)

	// Create a new connection with environment variables
	const exaTransport = createTransport(EXA_SERVER_URL, {
		"exaApiKey": EXA_API_KEY,
		"apiKey": SMITHERY_API_KEY
	})

	// Initialize a multi-client connection
	const client = new MultiClient()
	await client.connectAll({
		exa: exaTransport,
		// You can add more connections here...
	})

	// Example conversation with tool usage
	let isDone = false

	// Initialize chat state with selected model
	// @ts-ignore - ignore type errors with different message formats
	const chatState = useOpenAI
		? {
				type: "openai",
				llm: new OpenAI(),
				messages: [],
			}
		: {
				type: "anthropic",
				llm: new Anthropic(),
				messages: [],
			}

	// Add the initial user message
	chatState.messages.push({
		role: "user",
		content:
			"What are some AI events happening in Singapore and how many days until the next one?",
	})

	// Run the chat loop
	while (!isDone) {
		try {
			if (chatState.type === "openai") {
				const adapter = new OpenAIChatAdapter(client)
				// @ts-ignore - ignore type errors
				const response = await chatState.llm.chat.completions.create({
					model: "gpt-4o-mini",
					messages: chatState.messages,
					tools: await adapter.listTools(),
				})
				chatState.messages.push(response.choices[0].message)
				// @ts-ignore - ignore type errors
				const toolMessages = await adapter.callTool(response)
				chatState.messages.push(...toolMessages)
				isDone = toolMessages.length === 0
			} else {
				const adapter = new AnthropicChatAdapter(client)
				// @ts-ignore - ignore type errors
				const response = await chatState.llm.messages.create({
					model: "claude-3-5-sonnet-20241022",
					max_tokens: 256,
					messages: chatState.messages,
					tools: await adapter.listTools(),
				})

				chatState.messages.push({
					role: response.role,
					content: response.content,
				})
				// @ts-ignore - ignore type errors
				const toolMessages = await adapter.callTool(response)
				chatState.messages.push(...toolMessages)
				isDone = toolMessages.length === 0
			}
			console.log("messages", JSON.stringify(chatState.messages, null, 2))
		} catch (error) {
			console.error("Error in chat loop:", error)
			break
		}
	}

	// Print the final conversation
	console.log("\nFinal conversation:")
	chatState.messages.forEach((msg) => {
		console.log(`\n${msg.role.toUpperCase()}:`)
		console.log(msg.content)
	})

	await client.close()
	exit(0)
}

// Run the example
main().catch((err) => {
	console.error("Error:", err)
	process.exit(1)
})
