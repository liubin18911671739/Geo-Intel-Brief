import { createGammaGeneration, pollGammaResult } from "@/lib/server/gamma"
import { fetchRegionItems } from "@/lib/server/googleRss"
import {
  getGenerationById,
  insertBriefItems,
  listBriefItems,
  updateBriefItemImage,
  updateGeneration,
  uploadImage,
} from "@/lib/server/supabase"
import type { GoogleRssItem, Region } from "@/lib/server/types"
import { generateImage } from "@/lib/server/zhipuCogview"

function uniqueItems(items: GoogleRssItem[]): GoogleRssItem[] {
  const seenSourceUrls = new Set<string>()
  const seenFallback = new Set<string>()

  return items.filter((item) => {
    if (item.sourceUrl) {
      if (seenSourceUrls.has(item.sourceUrl)) return false
      seenSourceUrls.add(item.sourceUrl)
      return true
    }

    const fallbackKey = `${item.title}::${item.publishedAt || ""}`
    if (seenFallback.has(fallbackKey)) return false
    seenFallback.add(fallbackKey)
    return true
  })
}

function buildImagePrompt(item: { region: string; title: string; summary: string | null }, customTag?: string | null): string {
  return [
    "Create a clean editorial news illustration for a geo-intelligence briefing.",
    `Region: ${item.region}`,
    customTag ? `Tag: ${customTag}` : null,
    `Headline: ${item.title}`,
    item.summary ? `Context: ${item.summary}` : null,
    "Style: information-dense, modern, realistic illustration, no text watermark.",
  ]
    .filter(Boolean)
    .join("\n")
}

function buildGammaInputText(
  items: Array<{ region: string; title: string; summary: string | null; source_name: string; source_url: string | null; ai_image_url: string | null }>,
  gammaInstructions?: string | null
): string {
  const grouped = items.reduce<Record<string, typeof items>>((acc, item) => {
    if (!acc[item.region]) acc[item.region] = []
    acc[item.region].push(item)
    return acc
  }, {})

  const sections = Object.entries(grouped).map(([region, regionItems]) => {
    const cards = regionItems
      .map((item, index) => {
        return [
          `## ${index + 1}. ${item.title}`,
          `*地区*: ${region}`,
          `*来源*: ${item.source_name}`,
          item.source_url ? `*链接*: ${item.source_url}` : null,
          item.summary ? `*摘要*: ${item.summary}` : null,
          item.ai_image_url ? `*图片URL*: ${item.ai_image_url}` : "*图片URL*: 无",
        ]
          .filter(Boolean)
          .join("\n")
      })
      .join("\n---\n")

    return `# ${region}\n\n${cards}`
  })

  return [
    "请严格使用简体中文输出标题与正文。",
    "请按地区输出目录并保持卡片简洁。",
    gammaInstructions || null,
    ...sections,
  ]
    .filter(Boolean)
    .join("\n\n---\n\n")
}

function toProgress(index: number, total: number, start: number, end: number): number {
  if (total <= 0) return end
  const ratio = (index + 1) / total
  return Math.round(start + (end - start) * ratio)
}

async function failGeneration(generationId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : "Unknown pipeline error"
  try {
    await updateGeneration(generationId, {
      status: "failed",
      error: message,
    })
  } catch (updateError) {
    console.error("[pipeline] Failed to write failure status:", updateError)
  }
}

export async function runGenerationPipeline(generationId: string): Promise<void> {
  try {
    const generation = await getGenerationById(generationId)
    if (!generation) {
      throw new Error(`Generation not found: ${generationId}`)
    }

    await updateGeneration(generationId, {
      status: "running",
      progress: 10,
      error: null,
    })

    const rssResults = await Promise.allSettled(
      generation.regions.map((region) => fetchRegionItems(region as Region, generation.limit_per_region))
    )

    const rssItems: GoogleRssItem[] = []
    let successCount = 0

    for (const result of rssResults) {
      if (result.status === "fulfilled") {
        successCount += 1
        rssItems.push(...result.value)
      }
    }

    if (successCount === 0) {
      throw new Error("All Google RSS region fetches failed")
    }

    const dedupedItems = uniqueItems(rssItems)
    if (!dedupedItems.length) {
      throw new Error("No RSS items available after deduplication")
    }

    const insertedItems = await insertBriefItems(generationId, dedupedItems)
    await updateGeneration(generationId, { progress: 35 })

    for (let i = 0; i < insertedItems.length; i += 1) {
      const item = insertedItems[i]
      const prompt = buildImagePrompt(
        { region: item.region, title: item.title, summary: item.summary },
        generation.custom_tag
      )
      const image = await generateImage(prompt)
      const imagePath = `${generationId}/${item.id}.png`
      const imageUrl = await uploadImage(image, imagePath, "image/png")
      await updateBriefItemImage(item.id, imagePath, imageUrl)

      await updateGeneration(generationId, {
        progress: toProgress(i, insertedItems.length, 35, 75),
      })
    }

    const enrichedItems = await listBriefItems(generationId)
    if (!enrichedItems.length) {
      throw new Error("No enriched items available before Gamma step")
    }

    await updateGeneration(generationId, { progress: 80 })

    const gammaInputText = buildGammaInputText(enrichedItems, generation.gamma_instructions)
    const gammaGenerationId = await createGammaGeneration(gammaInputText)

    await updateGeneration(generationId, {
      gamma_generation_id: gammaGenerationId,
      progress: 85,
    })

    const gammaResult = await pollGammaResult(gammaGenerationId, {
      onProgress: async (value) => {
        const clamped = Math.max(85, Math.min(95, value))
        await updateGeneration(generationId, { progress: clamped })
      },
    })

    await updateGeneration(generationId, {
      status: "completed",
      progress: 100,
      gamma_url: gammaResult.gammaUrl,
      pdf_url: gammaResult.pdfUrl,
      error: null,
    })
  } catch (error) {
    await failGeneration(generationId, error)
  }
}
