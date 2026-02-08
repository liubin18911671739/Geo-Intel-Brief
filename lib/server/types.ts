export type Region = "europe" | "mena" | "africa"

export interface GenerationRequestV2 {
  regions: Region[]
  customTag?: string
  limitPerRegion: number
  gammaInstructions?: string
}

export interface GoogleRssItem {
  region: Region
  title: string
  summary: string | null
  sourceName: string
  sourceUrl: string | null
  publishedAt: string | null
  originalImageUrl: string | null
}

export interface GenerationMetrics {
  fetchedCount: number
  generatedImageCount: number
  uploadedImageCount: number
}

export interface GammaResult {
  gammaUrl: string
  pdfUrl: string | null
  gammaGenerationId?: string
}
