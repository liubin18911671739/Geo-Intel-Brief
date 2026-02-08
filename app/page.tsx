"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Copy, ExternalLink, AlertCircle, Clock, CheckCircle2, Loader2 } from "lucide-react"

type Region = "europe" | "mena" | "africa"

interface GenerationRequest {
  regions: string[]
  customTag?: string
  rssUrls: string[]
  xQueries: string[]
  limitPerSource: number
  enableAiFallbackImages: boolean
  gammaInstructions: string
}

interface GenerationStatus {
  generationId: string
  status: "queued" | "running" | "completed" | "failed"
  gammaUrl?: string
  error?: string
  progress?: number
}

interface HistoryItem {
  id: string
  gammaUrl: string
  timestamp: Date
}

const DEMO_RSS_URLS = `https://www.aljazeera.com/xml/rss/all.xml
https://feeds.bbci.co.uk/news/world/africa/rss.xml
https://www.france24.com/en/rss`

const DEMO_X_QUERIES = `(Europe OR EU) has:images lang:en
(MENA OR "Middle East") has:images lang:en
Africa has:images lang:en`

export default function GeoIntelBriefPage() {
  const { toast } = useToast()
  
  // Theme state
  const [theme, setTheme] = useState("minimal")
  
  // Config state
  const [regions, setRegions] = useState<Region[]>(["europe"])
  const [customTag, setCustomTag] = useState("")
  const [rssUrls, setRssUrls] = useState("")
  const [xQueries, setXQueries] = useState("")
  const [limitPerSource, setLimitPerSource] = useState(12)
  const [enableAiFallbackImages, setEnableAiFallbackImages] = useState(true)
  const [gammaInstructions, setGammaInstructions] = useState(
    "Make a clean one-page microsite with a TOC by region. Keep each card short and scannable. No overly long paragraphs."
  )
  
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [status, setStatus] = useState<GenerationStatus | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  // Polling for status
  useEffect(() => {
    if (!generationId || !isGenerating) return
    
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/brief/status/${generationId}`)
        const data: GenerationStatus = await response.json()
        
        setStatus(data)
        
        if (data.status === "completed") {
          setIsGenerating(false)
          toast({
            title: "Microsite ready!",
            description: "Your Gamma microsite has been generated successfully.",
          })
          
          if (data.gammaUrl) {
            setHistory(prev => [
              { id: generationId, gammaUrl: data.gammaUrl!, timestamp: new Date() },
              ...prev.slice(0, 4)
            ])
          }
        } else if (data.status === "failed") {
          setIsGenerating(false)
          toast({
            title: "Generation failed",
            description: data.error || "An error occurred during generation.",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[v0] Error polling status:", error)
      }
    }
    
    const interval = setInterval(pollStatus, 2500)
    pollStatus() // Poll immediately
    
    return () => clearInterval(interval)
  }, [generationId, isGenerating, toast])

  const handleRegionToggle = (region: Region) => {
    setRegions(prev =>
      prev.includes(region)
        ? prev.filter(r => r !== region)
        : [...prev, region]
    )
  }

  const handleGenerate = async () => {
    // Validate
    const rssUrlList = rssUrls.split("\n").filter(line => line.trim())
    const xQueryList = xQueries.split("\n").filter(line => line.trim())
    
    if (rssUrlList.length === 0 && xQueryList.length === 0) {
      toast({
        title: "No sources provided",
        description: "Please add at least one RSS URL or X query.",
        variant: "destructive",
      })
      return
    }
    
    const request: GenerationRequest = {
      regions: regions.length > 0 ? regions : ["europe"],
      customTag: customTag.trim() || undefined,
      rssUrls: rssUrlList,
      xQueries: xQueryList,
      limitPerSource,
      enableAiFallbackImages,
      gammaInstructions,
    }
    
    try {
      setIsGenerating(true)
      setStatus(null)
      
      const response = await fetch("/api/brief/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      })
      
      if (!response.ok) {
        throw new Error("Failed to start generation")
      }
      
      const data = await response.json()
      setGenerationId(data.generationId)
      
      toast({
        title: "Generation started",
        description: `Job ID: ${data.generationId}`,
      })
    } catch (error) {
      setIsGenerating(false)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start generation",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: "Copied!",
      description: "Link copied to clipboard",
    })
  }

  const getStatusIcon = () => {
    if (!status) return null
    
    switch (status.status) {
      case "queued":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "running":
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusProgress = () => {
    if (!status) return 0
    
    switch (status.status) {
      case "queued":
        return 10
      case "running":
        return status.progress || 50
      case "completed":
        return 100
      case "failed":
        return 0
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Sticky Header */}
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-lg font-semibold md:text-xl">Geo-Intel Brief</h1>
              <p className="text-xs text-muted-foreground md:text-sm">
                Europe / MENA / Africa → RSS + X + Websites → Image-first → Gamma
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm">
                Docs
              </Button>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[100px] md:w-[130px]">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">Minimal</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="modern">Modern</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* Regions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Regions</CardTitle>
                  <CardDescription>Select geographic areas to monitor</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="europe"
                        checked={regions.includes("europe")}
                        onCheckedChange={() => handleRegionToggle("europe")}
                      />
                      <Label htmlFor="europe" className="text-sm font-normal cursor-pointer">
                        Europe
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="mena"
                        checked={regions.includes("mena")}
                        onCheckedChange={() => handleRegionToggle("mena")}
                      />
                      <Label htmlFor="mena" className="text-sm font-normal cursor-pointer">
                        MENA (Arab World)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="africa"
                        checked={regions.includes("africa")}
                        onCheckedChange={() => handleRegionToggle("africa")}
                      />
                      <Label htmlFor="africa" className="text-sm font-normal cursor-pointer">
                        Africa
                      </Label>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="customTag" className="text-sm">
                      Custom tag (optional)
                    </Label>
                    <Input
                      id="customTag"
                      placeholder="e.g., 'URGENT' or 'PRIORITY'"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      disabled={isGenerating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Will be attached to all items as region label if filled
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sources Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Sources</CardTitle>
                  <CardDescription>Configure RSS feeds and X queries</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="rss" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="rss">RSS</TabsTrigger>
                      <TabsTrigger value="x">X (Twitter)</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="rss" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="rssUrls">RSS URLs (one per line)</Label>
                        <Textarea
                          id="rssUrls"
                          placeholder="https://example.com/feed.xml"
                          rows={6}
                          value={rssUrls}
                          onChange={(e) => setRssUrls(e.target.value)}
                          disabled={isGenerating}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRssUrls(DEMO_RSS_URLS)}
                        disabled={isGenerating}
                      >
                        Load Demo URLs
                      </Button>
                    </TabsContent>
                    
                    <TabsContent value="x" className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="xQueries">X queries (one per line)</Label>
                        <Textarea
                          id="xQueries"
                          placeholder="(Europe OR EU) has:images"
                          rows={6}
                          value={xQueries}
                          onChange={(e) => setXQueries(e.target.value)}
                          disabled={isGenerating}
                        />
                        <p className="text-xs text-muted-foreground">
                          Use has:images when possible
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setXQueries(DEMO_X_QUERIES)}
                        disabled={isGenerating}
                      >
                        Load Demo Queries
                      </Button>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Options Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Options</CardTitle>
                  <CardDescription>Fine-tune generation parameters</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="limitPerSource">Limit per source</Label>
                      <span className="text-sm text-muted-foreground">{limitPerSource}</span>
                    </div>
                    <Slider
                      id="limitPerSource"
                      min={5}
                      max={20}
                      step={1}
                      value={[limitPerSource]}
                      onValueChange={([value]) => setLimitPerSource(value)}
                      disabled={isGenerating}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="aiFallback">AI fallback images when missing</Label>
                      <p className="text-xs text-muted-foreground">
                        Generate images with AI if source has none
                      </p>
                    </div>
                    <Switch
                      id="aiFallback"
                      checked={enableAiFallbackImages}
                      onCheckedChange={setEnableAiFallbackImages}
                      disabled={isGenerating}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gammaInstructions">Gamma additional instructions</Label>
                    <Textarea
                      id="gammaInstructions"
                      rows={4}
                      value={gammaInstructions}
                      onChange={(e) => setGammaInstructions(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Preview (client-side only)</CardTitle>
                  <CardDescription>Preview of items during generation</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isGenerating && !status && (
                    <div className="py-8 text-center text-muted-foreground">
                      <p className="text-sm">
                        After you click Generate, items will appear here once the job starts.
                      </p>
                    </div>
                  )}
                  
                  {isGenerating && (
                    <div className="space-y-3">
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="flex gap-3">
                          <Skeleton className="h-16 w-16 flex-shrink-0 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              {/* Generate Button */}
              <Card>
                <CardHeader>
                  <CardTitle>Generate & Results</CardTitle>
                  <CardDescription>Start the generation process</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Gamma Microsite"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* Status Panel */}
              {generationId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      Status
                      {getStatusIcon()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Generation ID</p>
                      <p className="text-sm font-mono break-all">{generationId}</p>
                    </div>
                    
                    {status && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">
                              Status: <span className="capitalize">{status.status}</span>
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getStatusProgress()}%
                            </p>
                          </div>
                          <Progress value={getStatusProgress()} />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Result Panel */}
              {status?.status === "completed" && status.gammaUrl && (
                <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="text-green-900 dark:text-green-100">
                      Microsite Ready!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => window.open(status.gammaUrl, "_blank")}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open Microsite
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(status.gammaUrl!)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="rounded border bg-background p-3">
                      <p className="text-xs font-mono break-all">{status.gammaUrl}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Error Panel */}
              {status?.status === "failed" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Generation Failed</AlertTitle>
                  <AlertDescription>
                    {status.error || "An unknown error occurred during generation."}
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3 w-full bg-transparent"
                      onClick={() => {
                        setStatus(null)
                        setGenerationId(null)
                        setIsGenerating(false)
                      }}
                    >
                      Try Again
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* History */}
              {history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">History</CardTitle>
                    <CardDescription>Last 5 generated microsites</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-2 rounded-lg border p-3"
                        >
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-muted-foreground">
                              {item.timestamp.toLocaleString()}
                            </p>
                            <p className="truncate text-xs font-mono">{item.gammaUrl}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => window.open(item.gammaUrl, "_blank")}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 flex-shrink-0"
                              onClick={() => copyToClipboard(item.gammaUrl)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
      
      <Toaster />
    </>
  )
}
