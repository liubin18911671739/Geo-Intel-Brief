import { NextResponse } from "next/server"
import { generations } from "../../generate/route"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ generationId: string }> }
) {
  try {
    const { generationId } = await params
    
    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      )
    }
    
    const generation = generations.get(generationId)
    
    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      )
    }
    
    return NextResponse.json({
      generationId,
      status: generation.status,
      gammaUrl: generation.gammaUrl,
      error: generation.error,
      progress: generation.progress,
    })
  } catch (error) {
    console.error("[v0] Error fetching generation status:", error)
    return NextResponse.json(
      { error: "Failed to fetch generation status" },
      { status: 500 }
    )
  }
}
