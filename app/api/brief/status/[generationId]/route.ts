import { NextResponse } from "next/server"

import { getGenerationById, getGenerationMetrics } from "@/lib/server/supabase"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const { generationId } = await params

    if (!generationId) {
      return NextResponse.json({ error: "Generation ID is required" }, { status: 400 })
    }

    const generation = await getGenerationById(generationId)
    if (!generation) {
      return NextResponse.json({ error: "Generation not found" }, { status: 404 })
    }

    const metrics = await getGenerationMetrics(generationId)

    return NextResponse.json({
      generationId,
      status: generation.status,
      progress: generation.progress,
      gammaUrl: generation.gamma_url ?? undefined,
      pdfUrl: generation.pdf_url ?? undefined,
      error: generation.error ?? undefined,
      metrics,
    })
  } catch (error) {
    console.error("[status] Failed to fetch generation status:", error)
    return NextResponse.json({ error: "Failed to fetch generation status" }, { status: 500 })
  }
}
