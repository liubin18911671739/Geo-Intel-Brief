import Parser from "rss-parser"

import type { GoogleRssItem, Region } from "@/lib/server/types"

const REGION_QUERIES: Record<Region, string> = {
  europe: "Europe geopolitics policy AI",
  mena: "Middle East North Africa geopolitics policy AI",
  africa: "Africa geopolitics policy AI",
}

interface ParsedFeedItem {
  title?: string
  link?: string
  isoDate?: string
  pubDate?: string
  contentSnippet?: string
  content?: string
  enclosure?: { url?: string }
  [key: string]: unknown
}

function getRegionLabel(region: Region): string {
  switch (region) {
    case "europe":
      return "Europe"
    case "mena":
      return "MENA"
    case "africa":
      return "Africa"
  }
}

export function buildGoogleRssUrl(query: string, hl = "en-US", gl = "US", ceid = "US:en"): string {
  const encoded = encodeURIComponent(query)
  return `https://news.google.com/rss/search?q=${encoded}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`
}

function extractImageUrl(item: ParsedFeedItem): string | null {
  if (item.enclosure?.url) return item.enclosure.url

  const mediaContent = item["media:content"] as { $?: { url?: string } }[] | { $?: { url?: string } } | undefined
  if (Array.isArray(mediaContent) && mediaContent[0]?.$?.url) return mediaContent[0].$.url
  if (mediaContent && !Array.isArray(mediaContent) && mediaContent.$?.url) return mediaContent.$.url

  const mediaThumbnail = item["media:thumbnail"] as { $?: { url?: string } }[] | { $?: { url?: string } } | undefined
  if (Array.isArray(mediaThumbnail) && mediaThumbnail[0]?.$?.url) return mediaThumbnail[0].$.url
  if (mediaThumbnail && !Array.isArray(mediaThumbnail) && mediaThumbnail.$?.url) return mediaThumbnail.$.url

  const html = item.content || item.contentSnippet || ""
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  return match?.[1] || null
}

async function fetchXml(url: string, timeoutMs = 12000): Promise<string> {
  const response = await fetch(url, {
    headers: { Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8" },
    signal: AbortSignal.timeout(timeoutMs),
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(`Google RSS request failed (${response.status}): ${message.slice(0, 200)}`)
  }

  return response.text()
}

export async function fetchRegionItems(region: Region, limit: number): Promise<GoogleRssItem[]> {
  const parser = new Parser()
  const query = REGION_QUERIES[region]
  const url = buildGoogleRssUrl(query)
  const xml = await fetchXml(url)
  const feed = await parser.parseString(xml)

  const sourceName = feed.title || `Google News ${getRegionLabel(region)}`
  const items = (feed.items || []) as ParsedFeedItem[]

  return items.slice(0, limit).map((item) => ({
    region,
    title: item.title?.trim() || "Untitled",
    summary: item.contentSnippet?.trim() || null,
    sourceName,
    sourceUrl: item.link || null,
    publishedAt: item.isoDate || item.pubDate || null,
    originalImageUrl: extractImageUrl(item),
  }))
}
