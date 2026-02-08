import { setTimeout as sleep } from "node:timers/promises"

const DEFAULT_BASE_URL = "https://open.bigmodel.cn/api/paas/v4"
const DEFAULT_MODEL = "CogView-4"

function getConfig() {
  const apiKey = process.env.ZHIPU_API_KEY
  if (!apiKey) {
    throw new Error("Missing ZHIPU_API_KEY")
  }

  return {
    apiKey,
    baseUrl: process.env.ZHIPU_BASE_URL || DEFAULT_BASE_URL,
    model: process.env.ZHIPU_COGVIEW_MODEL || DEFAULT_MODEL,
  }
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) {
    throw new Error(`Failed to download generated image (${response.status})`)
  }

  const data = await response.arrayBuffer()
  return Buffer.from(data)
}

async function generateImageOnce(prompt: string): Promise<Buffer> {
  const config = getConfig()

  const response = await fetch(`${config.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      prompt,
      size: "1024x1024",
      response_format: "b64_json",
    }),
    signal: AbortSignal.timeout(30000),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`CogView request failed (${response.status}): ${message.slice(0, 240)}`)
  }

  const payload = (await response.json()) as {
    data?: Array<{ url?: string; b64_json?: string }>
  }

  const first = payload.data?.[0]
  if (!first) {
    throw new Error("CogView response missing image data")
  }

  if (first.b64_json) {
    return Buffer.from(first.b64_json, "base64")
  }

  if (first.url) {
    return downloadImage(first.url)
  }

  throw new Error("CogView response has neither url nor b64_json")
}

export async function generateImage(prompt: string): Promise<Buffer> {
  let lastError: unknown

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await generateImageOnce(prompt)
    } catch (error) {
      lastError = error
      if (attempt < 2) {
        await sleep(500 * 2 ** attempt)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to generate image with CogView")
}
