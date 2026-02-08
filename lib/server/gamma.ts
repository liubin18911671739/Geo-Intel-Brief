import type { GammaResult } from "@/lib/server/types"

const DEFAULT_GAMMA_BASE = "https://public-api.gamma.app/v1.0"

function getGammaConfig() {
  const apiKey = process.env.GAMMA_API_KEY
  if (!apiKey) {
    throw new Error("Missing GAMMA_API_KEY")
  }

  return {
    apiKey,
    baseUrl: process.env.GAMMA_BASE_URL || DEFAULT_GAMMA_BASE,
  }
}

function extractPdfUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null

  const data = payload as Record<string, unknown>
  const finalResult = (data.finalResult && typeof data.finalResult === "object" ? data.finalResult : null) as
    | Record<string, unknown>
    | null

  const candidates = [
    data.file_url,
    data.pdfUrl,
    data.fileUrl,
    data.exportUrl,
    data.downloadUrl,
    (data.files as Record<string, unknown> | undefined)?.pdf,
    (data.files as Record<string, unknown> | undefined)?.pdfUrl,
    (data.exports as Record<string, unknown> | undefined)?.pdf,
    (data.exports as Record<string, unknown> | undefined)?.pdfUrl,
    ((data.exports as Record<string, unknown> | undefined)?.pdf as Record<string, unknown> | undefined)?.url,
    finalResult?.file_url,
    finalResult?.pdfUrl,
    finalResult?.fileUrl,
    finalResult?.exportUrl,
    finalResult?.downloadUrl,
    (finalResult?.files as Record<string, unknown> | undefined)?.pdf,
    (finalResult?.files as Record<string, unknown> | undefined)?.pdfUrl,
    (finalResult?.exports as Record<string, unknown> | undefined)?.pdf,
    (finalResult?.exports as Record<string, unknown> | undefined)?.pdfUrl,
    ((finalResult?.exports as Record<string, unknown> | undefined)?.pdf as Record<string, unknown> | undefined)?.url,
  ]

  for (const value of candidates) {
    if (typeof value === "string" && value) return value
  }

  return null
}

export async function createGammaGeneration(inputText: string): Promise<string> {
  const config = getGammaConfig()

  const response = await fetch(`${config.baseUrl}/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": config.apiKey,
      Accept: "application/json",
    },
    body: JSON.stringify({
      inputText,
      exportAs: "pdf",
      textMode: "preserve",
      format: "social",
      cardOptions: { dimensions: "4x5" },
      cardSplit: "inputTextBreaks",
      sharingOptions: { externalAccess: "view" },
    }),
    signal: AbortSignal.timeout(25000),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Gamma create failed (${response.status}): ${message.slice(0, 240)}`)
  }

  const payload = (await response.json()) as { generationId?: string }
  if (!payload.generationId) {
    throw new Error("Gamma response missing generationId")
  }

  return payload.generationId
}

export async function pollGammaResult(
  gammaGenerationId: string,
  options?: { intervalMs?: number; maxTries?: number; onProgress?: (value: number) => Promise<void> | void }
): Promise<GammaResult> {
  const config = getGammaConfig()
  const intervalMs = options?.intervalMs ?? 2500
  const maxTries = options?.maxTries ?? 120

  for (let i = 0; i < maxTries; i += 1) {
    const response = await fetch(`${config.baseUrl}/generations/${gammaGenerationId}`, {
      headers: {
        "X-API-KEY": config.apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(20000),
    })

    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Gamma poll failed (${response.status}): ${message.slice(0, 240)}`)
    }

    const payload = (await response.json()) as Record<string, unknown>
    const finalResult = (payload.finalResult && typeof payload.finalResult === "object" ? payload.finalResult : null) as
      | Record<string, unknown>
      | null

    const status = (payload.status || finalResult?.status) as string | undefined
    const gammaUrl = (payload.gammaUrl || finalResult?.gammaUrl || payload.url || finalResult?.url) as string | undefined
    const pdfUrl = extractPdfUrl(payload)

    const progressRaw = (payload.progress ?? finalResult?.progress) as number | undefined
    const progress = typeof progressRaw === "number" ? progressRaw : Math.round(((i + 1) / maxTries) * 100)
    if (options?.onProgress) {
      await options.onProgress(Math.max(1, Math.min(99, progress)))
    }

    if (status === "completed" && gammaUrl) {
      return {
        gammaUrl,
        pdfUrl,
        gammaGenerationId,
      }
    }

    if (status === "failed") {
      const errorMessage = (payload.error || finalResult?.error || "Gamma generation failed") as string
      throw new Error(errorMessage)
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  throw new Error(`Gamma polling timeout for ${gammaGenerationId}`)
}
