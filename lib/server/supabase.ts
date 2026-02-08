import { createClient, type SupabaseClient } from "@supabase/supabase-js"

import type { GenerationMetrics, GenerationRequestV2, GoogleRssItem } from "@/lib/server/types"

const GENERATIONS_TABLE = "generations"
const BRIEF_ITEMS_TABLE = "brief_items"

interface GenerationRow {
  id: string
  status: "queued" | "running" | "completed" | "failed"
  progress: number
  regions: string[]
  custom_tag: string | null
  limit_per_region: number
  gamma_instructions: string | null
  gamma_generation_id: string | null
  gamma_url: string | null
  pdf_url: string | null
  error: string | null
  created_at: string
  updated_at: string
}

interface BriefItemRow {
  id: string
  generation_id: string
  region: string
  title: string
  summary: string | null
  source_name: string
  source_url: string | null
  published_at: string | null
  original_image_url: string | null
  ai_image_path: string | null
  ai_image_url: string | null
  created_at: string
}

let cachedClient: SupabaseClient | null = null

function getRequiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

function getSupabaseAdminClient(): SupabaseClient {
  if (cachedClient) return cachedClient

  const url = getRequiredEnv("SUPABASE_URL")
  const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY")

  cachedClient = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return cachedClient
}

export async function createGenerationRecord(input: GenerationRequestV2): Promise<string> {
  const client = getSupabaseAdminClient()
  const generationId = crypto.randomUUID()

  const { error } = await client.from(GENERATIONS_TABLE).insert({
    id: generationId,
    status: "queued",
    progress: 5,
    regions: input.regions,
    custom_tag: input.customTag ?? null,
    limit_per_region: input.limitPerRegion,
    gamma_instructions: input.gammaInstructions ?? null,
  })

  if (error) {
    throw new Error(`Failed to create generation: ${error.message}`)
  }

  return generationId
}

export async function getGenerationById(generationId: string): Promise<GenerationRow | null> {
  const client = getSupabaseAdminClient()
  const { data, error } = await client
    .from(GENERATIONS_TABLE)
    .select("*")
    .eq("id", generationId)
    .maybeSingle<GenerationRow>()

  if (error) {
    throw new Error(`Failed to fetch generation: ${error.message}`)
  }

  return data
}

export async function updateGeneration(
  generationId: string,
  patch: Partial<Pick<GenerationRow, "status" | "progress" | "gamma_generation_id" | "gamma_url" | "pdf_url" | "error">>
): Promise<void> {
  const client = getSupabaseAdminClient()
  const { error } = await client
    .from(GENERATIONS_TABLE)
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", generationId)

  if (error) {
    throw new Error(`Failed to update generation: ${error.message}`)
  }
}

export async function insertBriefItems(generationId: string, items: GoogleRssItem[]): Promise<BriefItemRow[]> {
  if (!items.length) return []

  const client = getSupabaseAdminClient()
  const payload = items.map((item) => ({
    generation_id: generationId,
    region: item.region,
    title: item.title,
    summary: item.summary,
    source_name: item.sourceName,
    source_url: item.sourceUrl,
    published_at: item.publishedAt,
    original_image_url: item.originalImageUrl,
  }))

  const { data, error } = await client
    .from(BRIEF_ITEMS_TABLE)
    .insert(payload)
    .select("*")
    .returns<BriefItemRow[]>()

  if (error) {
    throw new Error(`Failed to insert brief items: ${error.message}`)
  }

  return data || []
}

export async function listBriefItems(generationId: string): Promise<BriefItemRow[]> {
  const client = getSupabaseAdminClient()
  const { data, error } = await client
    .from(BRIEF_ITEMS_TABLE)
    .select("*")
    .eq("generation_id", generationId)
    .order("created_at", { ascending: true })
    .returns<BriefItemRow[]>()

  if (error) {
    throw new Error(`Failed to list brief items: ${error.message}`)
  }

  return data || []
}

export async function updateBriefItemImage(itemId: string, path: string, url: string): Promise<void> {
  const client = getSupabaseAdminClient()
  const { error } = await client
    .from(BRIEF_ITEMS_TABLE)
    .update({ ai_image_path: path, ai_image_url: url })
    .eq("id", itemId)

  if (error) {
    throw new Error(`Failed to update brief item image: ${error.message}`)
  }
}

export async function uploadImage(buffer: Buffer, path: string, contentType = "image/png"): Promise<string> {
  const client = getSupabaseAdminClient()
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "brief-images"

  const { error } = await client.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: true,
  })

  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`)
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path)
  if (!data.publicUrl) {
    throw new Error("Failed to get public URL from Supabase Storage")
  }

  return data.publicUrl
}

export async function getGenerationMetrics(generationId: string): Promise<GenerationMetrics> {
  const client = getSupabaseAdminClient()

  const [{ count: fetchedCount, error: fetchedError }, { count: uploadedCount, error: uploadedError }] = await Promise.all([
    client.from(BRIEF_ITEMS_TABLE).select("id", { count: "exact", head: true }).eq("generation_id", generationId),
    client
      .from(BRIEF_ITEMS_TABLE)
      .select("id", { count: "exact", head: true })
      .eq("generation_id", generationId)
      .not("ai_image_url", "is", null),
  ])

  if (fetchedError) {
    throw new Error(`Failed to fetch metrics (fetched count): ${fetchedError.message}`)
  }

  if (uploadedError) {
    throw new Error(`Failed to fetch metrics (uploaded count): ${uploadedError.message}`)
  }

  const fetched = fetchedCount || 0
  const uploaded = uploadedCount || 0

  return {
    fetchedCount: fetched,
    generatedImageCount: uploaded,
    uploadedImageCount: uploaded,
  }
}
