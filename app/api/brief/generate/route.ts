import { NextResponse } from "next/server"

interface GenerationRequest {
  regions: string[]
  customTag?: string
  rssUrls: string[]
  xQueries: string[]
  limitPerSource: number
  enableAiFallbackImages: boolean
  gammaInstructions: string
}

// In-memory store for demo purposes
const generations = new Map<string, {
  status: "queued" | "running" | "completed" | "failed"
  gammaUrl?: string
  error?: string
  progress?: number
  createdAt: Date
}>()

export async function POST(request: Request) {
  try {
    const body: GenerationRequest = await request.json()
    
    // Validate request
    if (body.rssUrls.length === 0 && body.xQueries.length === 0) {
      return NextResponse.json(
        { error: "At least one RSS URL or X query is required" },
        { status: 400 }
      )
    }
    
    // Generate unique ID
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    // Store initial status
    generations.set(generationId, {
      status: "queued",
      progress: 10,
      createdAt: new Date(),
    })
    
    console.log("[v0] Generation started:", generationId, body)
    
    // Simulate async processing
    simulateGeneration(generationId, body)
    
    return NextResponse.json({ generationId }, { status: 202 })
  } catch (error) {
    console.error("[v0] Error starting generation:", error)
    return NextResponse.json(
      { error: "Failed to start generation" },
      { status: 500 }
    )
  }
}

// Simulate the generation process
async function simulateGeneration(generationId: string, request: GenerationRequest) {
  try {
    // Simulate queued state (1-2 seconds)
    await sleep(1500)
    
    const gen = generations.get(generationId)
    if (gen) {
      gen.status = "running"
      gen.progress = 30
    }
    
    console.log("[v0] Generation running:", generationId)
    
    // Simulate processing (3-5 seconds)
    await sleep(2000)
    
    if (gen) {
      gen.progress = 60
    }
    
    await sleep(1500)
    
    if (gen) {
      gen.progress = 90
    }
    
    await sleep(1000)
    
    // Generate mock Gamma URL
    const mockGammaUrl = `https://gamma.app/docs/${generationId.replace("gen_", "")}`
    
    if (gen) {
      gen.status = "completed"
      gen.progress = 100
      gen.gammaUrl = mockGammaUrl
    }
    
    console.log("[v0] Generation completed:", generationId, mockGammaUrl)
  } catch (error) {
    console.error("[v0] Generation failed:", generationId, error)
    const gen = generations.get(generationId)
    if (gen) {
      gen.status = "failed"
      gen.error = error instanceof Error ? error.message : "Unknown error occurred"
    }
  }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Cleanup old generations (keep last 50)
setInterval(() => {
  if (generations.size > 50) {
    const entries = Array.from(generations.entries())
      .sort((a, b) => b[1].createdAt.getTime() - a[1].createdAt.getTime())
    
    entries.slice(50).forEach(([id]) => generations.delete(id))
  }
}, 60000) // Every minute

// Export the generations map for the status route
export { generations }
