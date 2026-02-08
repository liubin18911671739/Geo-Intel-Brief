"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CheckCircle2, Clock, Copy, ExternalLink, Loader2 } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Toaster } from "@/components/ui/toaster"
import { useToast } from "@/hooks/use-toast"

type Region = "europe" | "mena" | "africa"

interface GenerationRequestV2 {
  regions: Region[]
  customTag?: string
  limitPerRegion: number
  gammaInstructions?: string
}

interface GenerationStatusV2 {
  generationId: string
  status: "queued" | "running" | "completed" | "failed"
  progress: number
  gammaUrl?: string
  pdfUrl?: string
  error?: string
  metrics?: {
    fetchedCount: number
    generatedImageCount: number
    uploadedImageCount: number
  }
}

interface HistoryItem {
  id: string
  gammaUrl: string
  timestamp: Date
}

function regionLabel(region: Region): string {
  switch (region) {
    case "europe":
      return "欧洲"
    case "mena":
      return "中东北非"
    case "africa":
      return "非洲"
  }
}

export default function GeoIntelBriefPage() {
  const { toast } = useToast()

  const [theme, setTheme] = useState("minimal")

  const [regions, setRegions] = useState<Region[]>(["europe"])
  const [customTag, setCustomTag] = useState("")
  const [limitPerRegion, setLimitPerRegion] = useState(12)
  const [gammaInstructions, setGammaInstructions] = useState(
    "生成一个简洁的单页站点，按地区提供目录。每张卡片简短易扫读，避免过长段落。"
  )

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationId, setGenerationId] = useState<string | null>(null)
  const [status, setStatus] = useState<GenerationStatusV2 | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])

  useEffect(() => {
    if (!generationId || !isGenerating) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/brief/status/${generationId}`)
        const data: GenerationStatusV2 = await response.json()

        setStatus(data)

        if (data.status === "completed") {
          setIsGenerating(false)
          toast({
            title: "站点已生成",
            description: "你的 Gamma 简报站点已成功生成。",
          })

          if (data.gammaUrl) {
            setHistory((prev) => [{ id: generationId, gammaUrl: data.gammaUrl!, timestamp: new Date() }, ...prev.slice(0, 4)])
          }
        } else if (data.status === "failed") {
          setIsGenerating(false)
          toast({
            title: "生成失败",
            description: data.error || "生成过程中发生错误。",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("[page] Error polling status:", error)
      }
    }

    const interval = setInterval(pollStatus, 2500)
    void pollStatus()

    return () => clearInterval(interval)
  }, [generationId, isGenerating, toast])

  const handleRegionToggle = (region: Region) => {
    setRegions((prev) => (prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]))
  }

  const handleGenerate = async () => {
    if (!regions.length) {
      toast({
        title: "未选择地区",
        description: "请至少选择一个地区。",
        variant: "destructive",
      })
      return
    }

    const request: GenerationRequestV2 = {
      regions,
      customTag: customTag.trim() || undefined,
      limitPerRegion,
      gammaInstructions: gammaInstructions.trim() || undefined,
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
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error || "启动生成失败")
      }

      const data = (await response.json()) as { generationId: string }
      setGenerationId(data.generationId)

      toast({
        title: "已开始生成",
        description: `任务 ID：${data.generationId}`,
      })
    } catch (error) {
      setIsGenerating(false)
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "启动生成失败",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text)
    toast({ title: "已复制", description: "链接已复制到剪贴板" })
  }

  const getStatusIcon = () => {
    if (!status) return null
    switch (status.status) {
      case "queued":
        return <Clock className="h-5 w-5 text-yellow-600" />
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-600" />
    }
  }

  const getStatusText = () => {
    if (!status) return ""
    switch (status.status) {
      case "queued":
        return "排队中"
      case "running":
        return "执行中"
      case "completed":
        return "已完成"
      case "failed":
        return "失败"
    }
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-lg font-semibold md:text-xl">Geo-Intel Brief</h1>
              <p className="text-xs text-muted-foreground md:text-sm">Google RSS（固定地区模板）→ CogView-4 → Supabase → Gamma</p>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <Button variant="ghost" size="sm" className="text-xs md:text-sm">
                文档
              </Button>
              <Select value={theme} onValueChange={setTheme}>
                <SelectTrigger className="w-[100px] md:w-[130px]">
                  <SelectValue placeholder="主题" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minimal">简约</SelectItem>
                  <SelectItem value="dark">深色</SelectItem>
                  <SelectItem value="modern">现代</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-4 md:p-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>地区</CardTitle>
                  <CardDescription>仅支持固定 Google RSS 地区模板</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {(["europe", "mena", "africa"] as Region[]).map((region) => (
                      <div key={region} className="flex items-center space-x-2">
                        <Checkbox id={region} checked={regions.includes(region)} onCheckedChange={() => handleRegionToggle(region)} />
                        <Label htmlFor={region} className="cursor-pointer text-sm font-normal">
                          {regionLabel(region)}
                        </Label>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customTag" className="text-sm">
                      自定义标签（可选）
                    </Label>
                    <Input
                      id="customTag"
                      placeholder="例如：紧急 / 重点观察"
                      value={customTag}
                      onChange={(e) => setCustomTag(e.target.value)}
                      disabled={isGenerating}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>选项</CardTitle>
                  <CardDescription>控制每个地区采集数量与 Gamma 指令</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="limitPerRegion">每个地区条数上限</Label>
                      <span className="text-sm text-muted-foreground">{limitPerRegion}</span>
                    </div>
                    <Slider
                      id="limitPerRegion"
                      min={5}
                      max={20}
                      step={1}
                      value={[limitPerRegion]}
                      onValueChange={([value]) => setLimitPerRegion(value)}
                      disabled={isGenerating}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gammaInstructions">Gamma 附加指令</Label>
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

              <Card>
                <CardHeader>
                  <CardTitle>处理预览</CardTitle>
                  <CardDescription>任务运行期间显示处理中占位</CardDescription>
                </CardHeader>
                <CardContent>
                  {!isGenerating && !status && <p className="py-8 text-center text-sm text-muted-foreground">点击“生成”后，状态信息会显示在右侧。</p>}
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

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>生成与结果</CardTitle>
                  <CardDescription>手动触发生成流程</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full" size="lg" onClick={handleGenerate} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        生成中...
                      </>
                    ) : (
                      "生成 Gamma 简报站点"
                    )}
                  </Button>
                </CardContent>
              </Card>

              {generationId && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      状态
                      {getStatusIcon()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="mb-1 text-xs text-muted-foreground">任务 ID</p>
                      <p className="break-all font-mono text-sm">{generationId}</p>
                    </div>

                    {status && (
                      <>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">状态：{getStatusText()}</p>
                            <p className="text-sm text-muted-foreground">{status.progress}%</p>
                          </div>
                          <Progress value={status.progress} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 rounded border bg-muted/20 p-3 text-center text-xs">
                          <div>
                            <p className="text-muted-foreground">抓取</p>
                            <p className="font-semibold">{status.metrics?.fetchedCount ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">生成图</p>
                            <p className="font-semibold">{status.metrics?.generatedImageCount ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">已上传</p>
                            <p className="font-semibold">{status.metrics?.uploadedImageCount ?? 0}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {status?.status === "completed" && status.gammaUrl && (
                <Card className="border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20">
                  <CardHeader>
                    <CardTitle className="text-green-900 dark:text-green-100">站点已就绪</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Button className="flex-1" onClick={() => window.open(status.gammaUrl, "_blank")}> 
                        <ExternalLink className="mr-2 h-4 w-4" />
                        打开站点
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(status.gammaUrl!)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    {status.pdfUrl && (
                      <Button variant="outline" className="w-full" onClick={() => window.open(status.pdfUrl, "_blank")}>
                        打开 PDF 导出
                      </Button>
                    )}
                    <div className="rounded border bg-background p-3">
                      <p className="break-all font-mono text-xs">{status.gammaUrl}</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {status?.status === "failed" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>生成失败</AlertTitle>
                  <AlertDescription>
                    {status.error || "生成过程中发生未知错误。"}
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
                      重试
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {history.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">历史记录</CardTitle>
                    <CardDescription>最近 5 次生成的站点</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {history.map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
                          <div className="flex-1 overflow-hidden">
                            <p className="text-xs text-muted-foreground">{item.timestamp.toLocaleString("zh-CN")}</p>
                            <p className="truncate font-mono text-xs">{item.gammaUrl}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => window.open(item.gammaUrl, "_blank")}>
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => copyToClipboard(item.gammaUrl)}>
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
