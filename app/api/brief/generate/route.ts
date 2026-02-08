import { NextResponse } from "next/server"

import { runGenerationPipeline } from "@/lib/server/pipeline"
import { createGenerationRecord } from "@/lib/server/supabase"
import type { GenerationRequestV2, Region } from "@/lib/server/types"

const ALLOWED_REGIONS: Region[] = ["europe", "mena", "africa"]

function isRegion(value: string): value is Region {
  return ALLOWED_REGIONS.includes(value as Region)
}

function validateRequest(body: unknown): { ok: true; value: GenerationRequestV2 } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" }
  }

  const payload = body as Record<string, unknown>
  const regionsRaw = payload.regions
  const limitRaw = payload.limitPerRegion

  if (!Array.isArray(regionsRaw) || regionsRaw.length === 0) {
    return { ok: false, error: "At least one region is required" }
  }

  const regions = regionsRaw.filter((v): v is string => typeof v === "string").filter(isRegion)
  if (!regions.length) {
    return { ok: false, error: "Invalid regions" }
  }

  const limitPerRegion = typeof limitRaw === "number" ? limitRaw : Number(limitRaw)
  if (!Number.isFinite(limitPerRegion) || limitPerRegion < 5 || limitPerRegion > 20) {
    return { ok: false, error: "limitPerRegion must be between 5 and 20" }
  }

  const customTag = typeof payload.customTag === "string" ? payload.customTag.trim() : undefined
  const gammaInstructions = typeof payload.gammaInstructions === "string" ? payload.gammaInstructions.trim() : undefined

  return {
    ok: true,
    value: {
      regions,
      customTag: customTag || undefined,
      limitPerRegion,
      gammaInstructions: gammaInstructions || undefined,
    },
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = validateRequest(body)

    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 })
    }

    const generationId = await createGenerationRecord(validated.value)

    void runGenerationPipeline(generationId)

    return NextResponse.json({ generationId }, { status: 202 })
  } catch (error) {
    console.error("[generate] Failed to create generation:", error)
    return NextResponse.json({ error: "Failed to start generation" }, { status: 500 })
  }
}
