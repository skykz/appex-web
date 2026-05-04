/**
 * AI service — routes chat turns to OpenAI, Anthropic, DeepSeek, or Perplexity when keys exist;
 * otherwise returns the built-in mock replies for local development.
 */

import OpenAI, { APIError as OpenAIAPIError } from 'openai'
import Anthropic, { APIError as AnthropicAPIError } from '@anthropic-ai/sdk'
import { env } from '../config/env.js'
import { AppError } from '../utils/error-handler.js'

/** One row in a multi-turn chat transcript (matches DB roles). */
export type ChatTurn = { role: 'user' | 'assistant'; content: string }

/** Public model row returned by `GET /chat/models`. */
export type AIModelRow = { id: string; name: string; icon: string }

const MOCK_RESPONSES: Record<string, string> = {
  chatgpt:
    'I can assist with generating text, images, and provide guidance on creating video and audio content. Could you please specify what you need help with?',
  'chatgpt-image':
    'I can generate images based on your description. Please tell me what you would like me to create.',
  deepseek:
    'I specialize in code generation and technical analysis. What would you like me to help you with?',
  claude:
    'I can help with analysis, writing, math, and coding. What would you like to work on?',
  'nano-banana':
    'I am a lightweight model optimized for fast responses. How can I help?',
  'stable-diffusion':
    'I generate images from text prompts. Describe the image you want to create.',
  perplexity:
    'I can search the web and provide up-to-date answers with citations. What would you like to know?',
}

/** Full catalog (ids must stay in sync with the learner app’s model picker / icons). */
const MODEL_CATALOG: AIModelRow[] = [
  { id: 'chatgpt', name: 'ChatGPT', icon: '' },
  { id: 'chatgpt-image', name: 'ChatGPT Image', icon: '' },
  { id: 'deepseek', name: 'DeepSeek', icon: '' },
  { id: 'claude', name: 'Claude', icon: '' },
  { id: 'nano-banana', name: 'Nano Banana', icon: '' },
  { id: 'stable-diffusion', name: 'Stable Diffusion', icon: '' },
  { id: 'perplexity', name: 'Perplexity AI', icon: '' },
]

const MAX_MESSAGES = 48

/**
 * Returns true when at least one third-party AI key is set (real routing instead of mocks).
 */
function hasAnyProviderKey(): boolean {
  return Boolean(
    env.OPENAI_API_KEY?.trim() ||
      env.ANTHROPIC_API_KEY?.trim() ||
      env.DEEPSEEK_API_KEY?.trim() ||
      env.PERPLEXITY_API_KEY?.trim()
  )
}

/**
 * Returns whether the given catalog model can be called with the current env.
 */
function isModelConfigured(modelId: string): boolean {
  switch (modelId) {
    case 'chatgpt':
    case 'chatgpt-image':
    case 'nano-banana':
      return Boolean(env.OPENAI_API_KEY?.trim())
    case 'claude':
      return Boolean(env.ANTHROPIC_API_KEY?.trim())
    case 'deepseek':
      return Boolean(env.DEEPSEEK_API_KEY?.trim())
    case 'perplexity':
      return Boolean(env.PERPLEXITY_API_KEY?.trim())
    case 'stable-diffusion':
      return false
    default:
      return false
  }
}

/**
 * Keeps only the most recent turns to bound token usage on upstream APIs.
 */
function trimHistory(turns: ChatTurn[]): ChatTurn[] {
  if (turns.length <= MAX_MESSAGES) return turns
  return turns.slice(-MAX_MESSAGES)
}

/**
 * Returns mock text for a model when no provider keys are configured.
 */
function mockResponse(modelId: string): string {
  return (
    MOCK_RESPONSES[modelId] ??
    'I can help you with a variety of tasks. What would you like to do?'
  )
}

/**
 * Calls OpenAI chat completions for the main ChatGPT product model.
 */
async function openaiChat(turns: ChatTurn[]): Promise<string> {
  const key = env.OPENAI_API_KEY?.trim()
  if (!key) throw new AppError(503, 'OpenAI is not configured (missing OPENAI_API_KEY).')

  const client = new OpenAI({ apiKey: key })
  const model = env.OPENAI_CHAT_MODEL?.trim() || 'gpt-4o'

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: turns.map((m) => ({ role: m.role, content: m.content })),
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) throw new AppError(502, 'OpenAI returned an empty reply.')
    return text
  } catch (e) {
    throw mapProviderError(e, 'OpenAI')
  }
}

/**
 * Calls OpenAI with a smaller model for fast/cheap replies (Nano Banana).
 */
async function openaiFastChat(turns: ChatTurn[]): Promise<string> {
  const key = env.OPENAI_API_KEY?.trim()
  if (!key) throw new AppError(503, 'OpenAI is not configured (missing OPENAI_API_KEY).')

  const client = new OpenAI({ apiKey: key })
  const model = env.OPENAI_FAST_MODEL?.trim() || 'gpt-4o-mini'

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: turns.map((m) => ({ role: m.role, content: m.content })),
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) throw new AppError(502, 'OpenAI returned an empty reply.')
    return text
  } catch (e) {
    throw mapProviderError(e, 'OpenAI')
  }
}

/**
 * Generates one image with DALL·E 3 from the latest user message and returns markdown.
 */
async function openaiImage(turns: ChatTurn[]): Promise<string> {
  const key = env.OPENAI_API_KEY?.trim()
  if (!key) throw new AppError(503, 'OpenAI is not configured (missing OPENAI_API_KEY).')

  const lastUser = [...turns].reverse().find((m) => m.role === 'user')
  if (!lastUser?.content?.trim()) {
    throw new AppError(400, 'Send a text prompt to generate an image.')
  }

  const client = new OpenAI({ apiKey: key })

  try {
    const img = await client.images.generate({
      model: 'dall-e-3',
      prompt: lastUser.content.trim(),
      n: 1,
      size: '1024x1024',
    })
    const item = img.data?.[0]
    const url = item?.url
    if (!url) throw new AppError(502, 'OpenAI did not return an image URL.')
    let md = `![Generated image](${url})`
    if (item.revised_prompt) {
      md += `\n\n*Revised prompt used by the model: ${item.revised_prompt}*`
    }
    return md
  } catch (e) {
    throw mapProviderError(e, 'OpenAI Images')
  }
}

/**
 * Calls Anthropic Messages API for Claude.
 */
async function anthropicChat(turns: ChatTurn[]): Promise<string> {
  const key = env.ANTHROPIC_API_KEY?.trim()
  if (!key) throw new AppError(503, 'Anthropic is not configured (missing ANTHROPIC_API_KEY).')

  let slice = [...turns]
  while (slice.length && slice[0].role === 'assistant') slice.shift()
  if (!slice.length) throw new AppError(400, 'Conversation must include a user message.')

  const client = new Anthropic({ apiKey: key })
  const model = env.ANTHROPIC_MODEL?.trim() || 'claude-3-5-sonnet-20241022'

  try {
    const msg = await client.messages.create({
      model,
      max_tokens: 8192,
      messages: slice.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    })
    const block = msg.content.find((b) => b.type === 'text')
    if (!block || block.type !== 'text') {
      throw new AppError(502, 'Claude returned no text content.')
    }
    const text = block.text.trim()
    if (!text) throw new AppError(502, 'Claude returned an empty reply.')
    return text
  } catch (e) {
    throw mapProviderError(e, 'Anthropic')
  }
}

/**
 * Calls DeepSeek via the OpenAI-compatible HTTP API.
 */
async function deepseekChat(turns: ChatTurn[]): Promise<string> {
  const key = env.DEEPSEEK_API_KEY?.trim()
  if (!key) throw new AppError(503, 'DeepSeek is not configured (missing DEEPSEEK_API_KEY).')

  const client = new OpenAI({
    apiKey: key,
    baseURL: 'https://api.deepseek.com',
  })
  const model = env.DEEPSEEK_MODEL?.trim() || 'deepseek-chat'

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: turns.map((m) => ({ role: m.role, content: m.content })),
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) throw new AppError(502, 'DeepSeek returned an empty reply.')
    return text
  } catch (e) {
    throw mapProviderError(e, 'DeepSeek')
  }
}

/**
 * Calls Perplexity’s OpenAI-compatible chat endpoint.
 */
async function perplexityChat(turns: ChatTurn[]): Promise<string> {
  const key = env.PERPLEXITY_API_KEY?.trim()
  if (!key) throw new AppError(503, 'Perplexity is not configured (missing PERPLEXITY_API_KEY).')

  const client = new OpenAI({
    apiKey: key,
    baseURL: 'https://api.perplexity.ai',
  })
  const model = env.PERPLEXITY_MODEL?.trim() || 'sonar'

  try {
    const completion = await client.chat.completions.create({
      model,
      messages: turns.map((m) => ({ role: m.role, content: m.content })),
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) throw new AppError(502, 'Perplexity returned an empty reply.')
    return text
  } catch (e) {
    throw mapProviderError(e, 'Perplexity')
  }
}

/**
 * Maps SDK / fetch errors into an `AppError` with a safe message for the client.
 */
function mapProviderError(err: unknown, label: string): AppError {
  if (err instanceof AppError) return err
  if (err instanceof OpenAIAPIError) {
    const s = err.status
    const status =
      typeof s === 'number' && s >= 400 && s < 600 ? s : 502
    return new AppError(status, `${label}: ${err.message}`)
  }
  if (err instanceof AnthropicAPIError) {
    const s = err.status
    const status =
      typeof s === 'number' && s >= 400 && s < 600 ? s : 502
    return new AppError(status, `${label}: ${err.message}`)
  }
  const msg = err instanceof Error ? err.message : 'Unknown error'
  return new AppError(502, `${label}: ${msg}`)
}

/**
 * Runs the configured provider for `modelId` using the full transcript, or mock if no keys are set.
 */
export async function getAIResponse(
  modelId: string,
  messages: ChatTurn[]
): Promise<string> {
  const turns = trimHistory(messages)

  if (!hasAnyProviderKey()) {
    await new Promise((r) => setTimeout(r, 200))
    return mockResponse(modelId)
  }

  if (!isModelConfigured(modelId)) {
    throw new AppError(
      503,
      `Model "${modelId}" is not available. Add the matching API key in backend/.env or pick another model.`
    )
  }

  switch (modelId) {
    case 'chatgpt':
      return openaiChat(turns)
    case 'nano-banana':
      return openaiFastChat(turns)
    case 'chatgpt-image':
      return openaiImage(turns)
    case 'claude':
      return anthropicChat(turns)
    case 'deepseek':
      return deepseekChat(turns)
    case 'perplexity':
      return perplexityChat(turns)
    default:
      throw new AppError(400, `Unknown model: ${modelId}`)
  }
}

/**
 * Models exposed to the learner SPA: all catalog entries when using mocks; only configured rows when any provider key is set.
 */
export function getAvailableModelsForClient(): AIModelRow[] {
  if (!hasAnyProviderKey()) return [...MODEL_CATALOG]
  const configured = MODEL_CATALOG.filter((m) => isModelConfigured(m.id))
  if (configured.length === 0) {
    console.warn(
      '[ai] Provider keys are set but no catalog models matched; exposing full catalog.'
    )
    return [...MODEL_CATALOG]
  }
  return configured
}
