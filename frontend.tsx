"use client"

import type React from "react"
import { useState, useEffect, useRef, startTransition } from "react"
import { useRouter } from 'next/navigation'
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import {
  Download,
  Play,
  Pause,
  Share2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  ArrowRight,
  Video,
  Sparkles,
  LogOut,
  User,
  Wallet,
  Volume2,
  VolumeX,
  Maximize,
  Zap,
  Shield,
  Compass,
  Plus,
  BarChart3,
  Settings,
  Grid3x3,
  X,
  Upload,
  Music,
  Map,
  BookOpen,
  MessageCircle,
  Filter,
  Search,
  Code,
  ChevronRight,
  Loader2,
  Film,
  Mic,
} from "lucide-react"
// backend helpers imported dynamically inside the effect to avoid static resolution issues

// Dynamic imports for libraries (to handle SSR compatibility)
let pdfjsLib: any
let mammoth: any

const initializeLibraries = async () => {
  if (typeof window !== "undefined" && !pdfjsLib) {
    pdfjsLib = await import("pdfjs-dist")
    mammoth = await import("mammoth")
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`
  }
}

const getBackendUrl = (path: string) => {
  const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
  if (!path || typeof path !== 'string') {
    return backendBaseUrl
  }
  if (!path.startsWith("http")) {
    // Remove trailing slash if present
    return backendBaseUrl.replace(/\/$/, "") + path
  }
  return path
}

// ============================================
// File Content Extraction Helpers (Client-side)
// ============================================

const extractTextFromPDF = async (file: File): Promise<string> => {
  try {
    await initializeLibraries()
    if (!pdfjsLib) return ""
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let text = ""
    
    for (let i = 0; i < pdf.numPages; i++) {
      const page = await pdf.getPage(i + 1)
      const textContent = await page.getTextContent()
      const pageText = textContent.items
        .map((item: any) => item.str || "")
        .join(" ")
      text += pageText + "\n"
    }
    
    return text.trim()
  } catch (error) {
    console.error("PDF extraction failed:", error)
    return ""
  }
}

const extractTextFromDOCX = async (file: File): Promise<string> => {
  try {
    await initializeLibraries()
    if (!mammoth) return ""
    
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value.trim()
  } catch (error) {
    console.error("DOCX extraction failed:", error)
    return ""
  }
}

const extractTextFromFile = async (file: File): Promise<string> => {
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    console.warn(`File ${file.name} exceeds 5MB limit`)
    return ""
  }
  
  // Handle PDF
  if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
    return await extractTextFromPDF(file)
  }
  
  // Handle DOCX
  if (
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.name.endsWith(".docx")
  ) {
    return await extractTextFromDOCX(file)
  }
  
  // Handle plain text files
  if (
    file.type.startsWith("text/") ||
    file.name.endsWith(".txt") ||
    file.name.endsWith(".md") ||
    file.name.endsWith(".json") ||
    file.name.endsWith(".csv")
  ) {
    return await file.text()
  }
  
  // Unsupported file type
  return ""
}

// ============================================
// GitHub Repo Import Helpers (Frontend-only)
// ============================================

// Map of known docs sites to their GitHub repositories
const DOCS_REPO_MAP: Record<string, string> = {
  "docs.solana.com": "https://github.com/solana-labs/solana-docs",
  "nextjs.org/docs": "https://github.com/vercel/next.js",
  "tailwindcss.com/docs": "https://github.com/tailwindlabs/tailwindcss.com",
  "docs.astro.build": "https://github.com/withastro/astro/tree/main/packages/astro/docs",
  "react.dev": "https://github.com/facebook/react/tree/main/docs",
  "typescript.org": "https://github.com/microsoft/TypeScript-Website",
}

// Detect URL type and normalize
interface URLDetectionResult {
  type: "github" | "docs" | "unknown"
  url: string
  message?: string
}

const detectURLType = (url: string): URLDetectionResult => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname

    // Check if it's a docs site mapping
    for (const [docsHost, repoUrl] of Object.entries(DOCS_REPO_MAP)) {
      if (hostname.includes(docsHost.split("/")[0])) {
        return {
          type: "docs",
          url: repoUrl,
          message: "Imported from GitHub source for best results.",
        }
      }
    }

    // Check if it's GitHub
    if (hostname === "github.com") {
      return { type: "github", url }
    }

    return { type: "unknown", url }
  } catch {
    return { type: "unknown", url }
  }
}

// Parse GitHub URL to get owner and repo
const parseGitHubURL = (url: string): { owner: string; repo: string } | null => {
  try {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)(?:\.git)?(?:\/)?$/)
    if (match) {
      return { owner: match[1], repo: match[2] }
    }
    return null
  } catch {
    return null
  }
}

// Supported file extensions for import
const SUPPORTED_EXTENSIONS = [".md", ".mdx", ".txt", ".json", ".js", ".ts", ".tsx", ".jsx"]
const MAX_FILE_SIZE = 500 * 1024 // 500KB per file
const MAX_TOTAL_FILES = 100
const MAX_CONTENT_LENGTH = 100 * 1024 // 100KB total content

interface GitHubFileNode {
  name: string
  path: string
  type: "file" | "dir"
  size?: number
}

interface GitHubTreeResponse {
  tree: GitHubFileNode[]
  truncated: boolean
}

// Fetch GitHub repository tree recursively
const fetchGitHubTree = async (
  owner: string,
  repo: string,
  path: string = ""
): Promise<GitHubFileNode[]> => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents${path ? "/" + path : ""}`
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github.v3+json" },
    })

    if (response.status === 404) {
      throw new Error("Repository not found")
    }
    if (response.status === 403) {
      throw new Error("Rate limit exceeded. Please try again in a few minutes.")
    }
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Handle single file vs directory listing
    if (!Array.isArray(data)) {
      return []
    }

    return data as GitHubFileNode[]
  } catch (error) {
    console.error("Error fetching GitHub tree:", error)
    throw error
  }
}

// Fetch content of a specific file from GitHub
const fetchGitHubFileContent = async (
  owner: string,
  repo: string,
  path: string
): Promise<string> => {
  try {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`
    const response = await fetch(url, {
      headers: { Accept: "application/vnd.github.raw+json" },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch ${path}`)
    }

    const text = await response.text()
    return text
  } catch (error) {
    console.error(`Error fetching ${path}:`, error)
    return ""
  }
}

// Recursively extract supported files from GitHub repo
const extractGitHubContent = async (
  owner: string,
  repo: string,
  basePath: string = "",
  depth: number = 0
): Promise<Array<{ path: string; name: string; content: string }>> => {
  const maxDepth = 5
  if (depth > maxDepth) return []

  try {
    const tree = await fetchGitHubTree(owner, repo, basePath)
    const results: Array<{ path: string; name: string; content: string }> = []

    // Process items in parallel with Promise.allSettled
    const promises = tree.map(async (item) => {
      // Skip hidden files and unwanted directories
      if (
        item.name.startsWith(".") ||
        ["node_modules", "dist", "build", ".git", "coverage"].includes(item.name)
      ) {
        return null
      }

      // If it's a directory, recurse
      if (item.type === "dir") {
        const newPath = basePath ? `${basePath}/${item.name}` : item.name
        const nestedResults = await extractGitHubContent(owner, repo, newPath, depth + 1)
        return nestedResults
      }

      // If it's a supported file type and under size limit
      const isSupportedExt = SUPPORTED_EXTENSIONS.some((ext) => item.name.endsWith(ext))
      if (isSupportedExt && item.size && item.size <= MAX_FILE_SIZE) {
        const content = await fetchGitHubFileContent(owner, repo, item.path)
        if (content) {
          return [{ path: item.path, name: item.name, content }]
        }
      }

      return null
    })

    const settledResults = await Promise.allSettled(promises)

    // Flatten results and filter nulls
    for (const settled of settledResults) {
      if (settled.status === "fulfilled" && settled.value) {
        if (Array.isArray(settled.value)) {
          results.push(...settled.value)
        } else {
          results.push(settled.value)
        }
      }
    }

    return results.slice(0, MAX_TOTAL_FILES)
  } catch (error) {
    console.error("Error extracting GitHub content:", error)
    throw error
  }
}

// Combine imported files into Studio sources
const combineImportedFiles = (
  files: Array<{ path: string; name: string; content: string }>,
  repoUrl: string
): Array<{ name: string; type: "repo"; content: string; originUrl: string }> => {
  const grouped: Record<string, string> = {}

  // Group files by directory
  for (const file of files) {
    const dir = file.path.substring(0, file.path.lastIndexOf("/")) || "root"
    const key = dir
    if (!grouped[key]) {
      grouped[key] = ""
    }
    // Add file content with separator
    grouped[key] += `\n\n--- File: ${file.name} ---\n${file.content}`
  }

  // Convert to Studio sources
  const sources: Array<{ name: string; type: "repo"; content: string; originUrl: string }> =
    Object.entries(grouped).map(([dir, content]) => ({
      name: dir === "root" ? "Repository Root" : `Folder: ${dir.split("/").pop()}`,
      type: "repo",
      content: content.slice(0, MAX_CONTENT_LENGTH), // Limit content size
      originUrl: repoUrl,
    }))

  return sources
}

const generateProjectName = async (content: string): Promise<string> => {
  try {
    const response = await fetch("/api/generate-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.slice(0, 500) }),
    })
    if (response.ok) {
      const data = await response.json()
      return data.name || "Untitled Project"
    }
  } catch (error) {
    console.error("Failed to generate name:", error)
  }
  // Fallback: extract first meaningful words
  const words = content.trim().split(/\s+/).slice(0, 4).join(" ")
  return words || "Untitled Project"
}

// Enhanced Video Display Component
interface VideoDisplayProps {
  videoUrl: string
  title?: string
  onClose?: () => void
}

const VideoDisplay: React.FC<VideoDisplayProps> = ({ videoUrl, title = "Generated Tutorial Video", onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Always use absolute backend URL for video
  const absoluteVideoUrl = getBackendUrl(videoUrl)

  // Log when video URL changes
  useEffect(() => {
    console.log("Video URL in display component:", absoluteVideoUrl)
  }, [absoluteVideoUrl])

  const handleDownload = async () => {
    try {
      const response = await fetch(absoluteVideoUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${title.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Download failed:", error)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: "Check out this AI-generated tutorial video!",
          url: absoluteVideoUrl,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      try {
        await navigator.clipboard.writeText(absoluteVideoUrl)
        // Show toast notification
        const toast = document.createElement("div")
        toast.className = "fixed top-4 right-4 bg-violet-600 text-white px-4 py-2 rounded-lg shadow-lg z-50"
        toast.textContent = "Video URL copied to clipboard!"
        document.body.appendChild(toast)
        setTimeout(() => document.body.removeChild(toast), 3000)
      } catch (error) {
        console.error("Failed to copy URL:", error)
      }
    }
  }

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const toggleFullscreen = () => {
    if (videoRef.current && videoRef.current.requestFullscreen) {
      videoRef.current.requestFullscreen()
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const percent = (videoRef.current.currentTime / videoRef.current.duration) * 100
      setProgress(percent)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-600 to-indigo-500 rounded-lg flex items-center justify-center">
            <Play className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <p className="text-sm text-slate-400">AI-generated tutorial video</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
            <button
              onClick={handleShare}
              className="bg-gray-800/50 hover:bg-violet-600/20 text-white p-3 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-gray-700/50"
              title="Share video"
            >
            <Share2 className="w-5 h-5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="bg-gray-800/50 hover:bg-red-500/20 text-white p-3 rounded-xl transition-all duration-200 hover:scale-105 backdrop-blur-sm border border-gray-700/50"
              title="Close video"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Video Container */}
      <div
        className="relative bg-black rounded-2xl overflow-hidden shadow-2xl group border border-gray-800/50"
        onMouseEnter={() => setShowControls(true)}
        onMouseLeave={() => setShowControls(false)}
      >
        <video
          ref={videoRef}
          src={absoluteVideoUrl}
          className="w-full h-auto max-h-[60vh] object-contain"
          preload="metadata"
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => {
            if (videoRef.current) {
              setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100)
              setCurrentTime(videoRef.current.currentTime)
            }
          }}
          onLoadedMetadata={(e) => {
            if (videoRef.current) {
              setDuration(videoRef.current.duration)
            }
          }}
        >
          Your browser does not support the video tag.
        </video>

        {/* Custom Controls Overlay */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 transition-all duration-300 ${showControls ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          {/* Progress Bar */}
              <div className="w-full bg-gray-700/50 rounded-full h-1 mb-4">
            <div
              className="bg-gradient-to-r from-violet-600 to-indigo-500 h-1 rounded-full transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={togglePlay}
                className="bg-violet-600 hover:bg-indigo-500 text-white p-3 rounded-full transition-all duration-200 hover:scale-110 shadow-lg"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </button>

              <button
                onClick={toggleMute}
                className="bg-gray-800/70 hover:bg-gray-700 text-white p-2 rounded-full transition-all duration-200"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <span className="text-white text-sm font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <button
              onClick={toggleFullscreen}
              className="bg-gray-800/70 hover:bg-gray-700 text-white p-2 rounded-full transition-all duration-200"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4">
        <button
          onClick={handleDownload}
          className="flex-1 min-w-[200px] bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-3 px-5 rounded-xl transition-all duration-200 transform hover:scale-[1.02] flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl"
        >
          <Download className="w-5 h-5" />
          <span>Download Video</span>
        </button>

        <button
          onClick={handleShare}
          className="flex-1 min-w-[200px] bg-gray-800/50 hover:bg-gray-700/50 text-white font-semibold py-3 px-5 rounded-xl border border-gray-700/50 transition-all duration-200 flex items-center justify-center space-x-3 backdrop-blur-sm"
        >
          <Share2 className="w-5 h-5" />
          <span>Share Video</span>
        </button>
      </div>

      {/* Video Stats */}
      {/* <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-violet-600/10 to-indigo-500/10 rounded-xl p-4 border border-violet-600/20 text-center backdrop-blur-sm">
          <div className="text-3xl mb-2">✨</div>
          <div className="text-sm text-white font-semibold">AI Generated</div>
          <div className="text-xs text-slate-400">Powered by WeaveIt</div>
        </div>

        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl p-4 border border-blue-500/20 text-center backdrop-blur-sm">
          <div className="text-3xl mb-2">🎯</div>
          <div className="text-sm text-white font-semibold">High Quality</div>
          <div className="text-xs text-gray-400">Professional output</div>
        </div>

        <div className="bg-gradient-to-br from-violet-600/10 to-indigo-500/10 rounded-xl p-4 border border-violet-600/20 text-center backdrop-blur-sm">
          <div className="text-3xl mb-2">⚡</div>
          <div className="text-sm text-white font-semibold">Fast Creation</div>
          <div className="text-xs text-slate-400">Generated in minutes</div>
        </div>
      </div> */}
    </div>
  )
}

// Enhanced Script Form Component with Payment Integration
interface ScriptFormProps {
  onVideoGenerated: (videoUrl: string, title: string) => void
  generationType: "video" | "audio"
  setGenerationType: React.Dispatch<React.SetStateAction<"video" | "audio">>
  // optional props so parent can control helper CTA visibility and wire handlers
  videosLength?: number
  hasCurrentVideo?: boolean
  onImportRepo?: () => void
  onUploadClick?: () => void
  onCreditsUpdate?: (credits: number) => void
  currentPoints?: number | null
  prompt?: string
}

const ScriptForm: React.FC<ScriptFormProps> = ({
  onVideoGenerated,
  generationType,
  setGenerationType,
  videosLength = 0,
  hasCurrentVideo = false,
  onImportRepo,
  onUploadClick,
  onCreditsUpdate,
  currentPoints,
  prompt,
}) => {
  const [script, setScript] = useState("")
  const [title, setTitle] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loadingStep, setLoadingStep] = useState("")
  const [progressPct, setProgressPct] = useState<number>(0)
  const wsRef = useRef<WebSocket | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const wallet = useWallet()
  const { connection } = useConnection()

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (pollingRef.current) {
        clearTimeout(pollingRef.current)
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!script.trim()) {
      setError("Please enter a script for your tutorial")
      return
    }

    if (!title.trim()) {
      setError("Please enter a title for your video")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      if (!wallet || !wallet.publicKey) {
        throw new Error("Wallet not connected")
      }

      setLoadingStep("Generating " + generationType + "...")

      const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

      // Choose endpoint based on generation type
      const endpoint = generationType === "audio" ? "/api/generate/audio" : "/api/generate"
      
      const response = await fetch(`${backendBaseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          script,
          title,
          walletAddress: wallet.publicKey?.toBase58(),
        }),
      })

      // Handle insufficient credits (402 Payment Required)
      if (response.status === 402) {
        const errorData = await response.json().catch(() => ({}))
        const required = errorData.required || (generationType === "video" ? 2 : 1)
        setError(`Insufficient credits. You need ${required} credits to generate ${generationType}. Current balance: ${currentPoints || 0}`)
        setLoading(false)
        setLoadingStep("")
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error("Backend error:", errorData)
        throw new Error(errorData.error || `Failed to start ${generationType} generation`)
      }

      const videoData = await response.json()
      console.log("Generation response:", videoData)

      // Update remaining credits if provided by backend
      if (videoData.remainingCredits !== undefined && onCreditsUpdate) {
        onCreditsUpdate(videoData.remainingCredits)
      }

      // Expect jobId for SSE listening
      const jobId = videoData.jobId || videoData.id
      if (!jobId) {
        throw new Error(`No job ID received from backend`)
      }

      // Set up WebSocket listener for real-time updates
      setupWebSocketListener(jobId, videoData.title || title)
    } catch (err: any) {
      console.error("Generation failed:", err)
      if (err.message?.includes("Wallet not connected")) {
        setError("Please connect your wallet to generate videos")
      } else if (err.message?.includes("insufficient funds")) {
        setError("Insufficient SOL balance for payment")
      } else {
        setError("Failed to generate video. Please try again.")
      }
      setLoading(false)
      // Close WS if open
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      // Clear polling
      if (pollingRef.current) {
        clearTimeout(pollingRef.current)
        pollingRef.current = null
      }
    } finally {
      // Loading state is managed by SSE event handlers for async generation
    }
  }

  const setupWebSocketListener = (jobId: string, videoTitle: string) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    const wsUrl = backendBaseUrl.replace(/^http/, 'ws') + '/ws'

    wsRef.current = new WebSocket(wsUrl)

    wsRef.current.onopen = () => {
      console.log('WebSocket connected')
      wsRef.current?.send(JSON.stringify({ action: 'subscribe', jobId }))
    }

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('WebSocket message:', data)

        if (data.type === 'progress') {
          setProgressPct(data.progress || 0)
          setLoadingStep(`${data.progress || 0}% - ${data.message || 'Processing...'}`)
        } else if (data.type === 'completed') {
          const contentId = data.videoId || data.audioId
          if (!contentId) {
            setError("No content ID received")
            setLoading(false)
            setLoadingStep("")
            return
          }
          const contentUrl = generationType === "audio" 
            ? `${backendBaseUrl}/api/audio/${contentId}` 
            : `${backendBaseUrl}/api/videos/job/${contentId}`
          setProgressPct(100) // Show 100% before completing
          onVideoGenerated(contentUrl, videoTitle || title)
          setSuccess('Completed!')
          setScript("")
          setProgressPct(0)
          setLoading(false)
          setLoadingStep("")
          wsRef.current?.close()
          wsRef.current = null
        } else if (data.type === 'error') {
          setError(`Error: ${data.error}`)
          setProgressPct(0)
          setLoading(false)
          setLoadingStep("")
          wsRef.current?.close()
          wsRef.current = null
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err)
      }
    }

    wsRef.current.onclose = () => {
      console.log('WebSocket closed')
      wsRef.current = null
      // If still loading and no polling active, start polling as fallback
      if (loading && !pollingRef.current) {
        startPolling(jobId, videoTitle)
      }
    }

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error)
      wsRef.current?.close()
      wsRef.current = null
      // Start polling as fallback
      if (loading && !pollingRef.current) {
        startPolling(jobId, videoTitle)
      }
    }
  }

  const startPolling = (jobId: string, videoTitle: string) => {
    const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    const endpoint = generationType === "audio" ? "/api/audio/status" : "/api/videos/job/status"

    const poll = async () => {
      try {
        const response = await fetch(`${backendBaseUrl}${endpoint}/${jobId}`)
        if (response.ok) {
          const data = await response.json()
          
          if (data.progress !== undefined) {
            setProgressPct(data.progress)
            setLoadingStep(`${data.progress}% - ${data.message || 'Processing...'}`)
          }

          if (data.status === 'completed') {
            const contentId = data.videoId || data.audioId || jobId
            const contentUrl = generationType === "audio" 
              ? `${backendBaseUrl}/api/audio/${contentId}` 
              : `${backendBaseUrl}/api/videos/job/${contentId}`
            setProgressPct(100) // Show 100% before completing
            onVideoGenerated(contentUrl, videoTitle || title)
            setSuccess('Completed!')
            setScript("")
            setProgressPct(0)
            setLoading(false)
            setLoadingStep("")
            if (pollingRef.current) {
              clearTimeout(pollingRef.current)
              pollingRef.current = null
            }
            return
          } else if (data.status === 'error' || data.status === 'failed') {
            setError(`Error: ${data.error || 'Generation failed'}`)
            setProgressPct(0)
            setLoading(false)
            setLoadingStep("")
            if (pollingRef.current) {
              clearTimeout(pollingRef.current)
              pollingRef.current = null
            }
            return
          }
        }
      } catch (err) {
        console.error('Polling error:', err)
      }

      // Continue polling if still loading
      if (loading) {
        pollingRef.current = setTimeout(poll, 2000)
      }
    }

    poll()
  }

  const estimateVideoLength = (text: string) => {
    const words = text.trim().split(/\s+/).length
    const avgWordsPerMinute = 150
    const minutes = Math.ceil(words / avgWordsPerMinute)
    return minutes
  }

  const getScriptQuality = (text: string) => {
    const wordCount = text.trim().split(/\s+/).length
    if (wordCount < 50) return { quality: "Too short", color: "text-red-400" }
    if (wordCount < 150) return { quality: "Good", color: "text-amber-400" }
    if (wordCount < 500) return { quality: "Excellent", color: "text-violet-400" }
    return { quality: "Very long", color: "text-blue-400" }
  }

  const scriptQuality = getScriptQuality(script)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Helper CTA: show when no sources, no current video, and user hasn't typed anything yet */}
      {(!videosLength || videosLength === 0) && !hasCurrentVideo && !script.trim() && (
        <div className="border border-slate-800 rounded-lg p-6 text-center text-slate-400">
          <div className="text-sm font-medium mb-2">Add a source to get started</div>
          <div className="text-xs mb-4">Upload documents or import a repository to feed the assistant.</div>
          <div className="flex flex-col items-center justify-center space-y-3">
            <button
              type="button"
              onClick={onUploadClick}
              className="px-6 py-3 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition font-medium"
            >
              Upload a source
            </button>
            <div className="text-sm text-slate-400">or</div>
            <button
              type="button"
              onClick={onImportRepo}
              className="px-4 py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800/60"
            >
              Import repository
            </button>
          </div>
        </div>
      )}

      {/* Generation type control moved to the right sidebar */}

      {/* Script Input */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor="script" className="block text-sm font-semibold text-white">
            Tutorial Script
          </label>
          <div className="flex items-center space-x-4 text-xs">
            {script.trim() && (
              <>
                <span className="text-gray-400">~{estimateVideoLength(script)} min video</span>
                <span className={`${scriptQuality.color} font-medium`}>{scriptQuality.quality}</span>
              </>
            )}
          </div>
        </div>
        <textarea
          id="script"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          placeholder="Enter your tutorial script here. Explain your code, concepts, or step-by-step instructions that you want to turn into a video tutorial..."
          rows={12}
          className="w-full px-4 py-4 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all duration-200 resize-vertical backdrop-blur-sm"
          disabled={loading}
        />
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>
            {script.length} characters •{" "}
            {
              script
                .trim()
                .split(/\s+/)
                .filter((word) => word.length > 0).length
            }{" "}
            words
          </span>
          {script.length > 5000 && (
            <span className="text-amber-400 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" />
              Very long script may take more time to process
            </span>
          )}
        </div>
      </div>

      {/* Generation Button */}
      <button
        type="submit"
        disabled={loading || !script.trim()}
        className={`relative overflow-hidden w-full py-4 px-6 rounded-xl font-semibold text-base flex items-center justify-center space-x-3 ${loading ? "bg-gray-700/50 cursor-not-allowed" : generationType === "video" ? "bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600" : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"} text-white shadow-lg hover:shadow-xl transform transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 border ${generationType === "video" ? "border-violet-600/20" : "border-purple-500/20"}`}
      >
        {loading ? (
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent" />
              <span>Generating Your {generationType === "video" ? "Video" : "Audio"}...</span>
            </div>
            {loadingStep && <span className="text-sm text-violet-200">{loadingStep}</span>}
            <div className="w-full max-w-xs">
              <div className="w-full bg-gray-600/50 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-violet-400 to-indigo-400 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <div className="text-xs text-center text-violet-300 mt-1">{progressPct}% complete</div>
            </div>
          </div>
        ) : (
          <>
            <Zap className="w-6 h-6" />
            <span>Generate {generationType === "video" ? "Tutorial Video" : "Audio Narration"} ({generationType === "video" ? "2" : "1"} credits)</span>
            <ArrowRight className="w-6 h-6" />
          </>
        )}
      </button>

      {/* Status Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-sm">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-sm">
          <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
          <span className="text-violet-400">{success}</span>
        </div>
      )}
    </form>
  )
}

// Enhanced Wallet Connect Component
const WalletConnect: React.FC<{ onConnect: () => void }> = ({ onConnect }) => {
  const { connected, connecting } = useWallet()

  if (connected) {
    onConnect()
    return null
  }

  return (
    <div className="space-y-6">
      {connecting && (
        <div className="bg-violet-600/10 border border-violet-600/30 rounded-xl p-4 flex items-center space-x-3 backdrop-blur-sm">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-violet-600 border-t-transparent"></div>
          <span className="text-white">Connecting to wallet...</span>
        </div>
      )}

      <div className="flex justify-center">
        <WalletMultiButton style={{
          background: "linear-gradient(to right, rgb(124, 58, 202), rgb(79, 70, 229))",
          borderRadius: "0.75rem",
          fontWeight: "600",
          padding: "0.75rem 1.5rem",
          fontSize: "1rem",
          transition: "all 200ms",
          transform: "scale(1)",
        }} />
      </div>

      {/* Security Features */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-5 h-5 text-violet-400" />
            <h4 className="font-semibold text-white">Secure Connection</h4>
          </div>
          <p className="text-sm text-gray-400">
            Your wallet connection is encrypted and secure. We never store your private keys.
          </p>
        </div>

        <div className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-2">
            <Zap className="w-5 h-5 text-violet-400" />
            <h4 className="font-semibold text-white">Fast & Easy</h4>
          </div>
          <p className="text-sm text-gray-400">
            Connect in seconds and start generating videos immediately. No complex setup required.
          </p>
        </div>
      </div>
    </div>
  )
}

// Main WeaveIt App Component
export default function WeaveItApp() {
  const { connected, disconnect, publicKey } = useWallet()
  const router = useRouter()
  const [currentVideo, setCurrentVideo] = useState<{ url: string; title: string } | null>(null)
  const [videos, setVideos] = useState<Array<{
    [x: string]: string; id: string; title: string; url: string; createdAt: string 
}>>([])
  const [loadingVideos, setLoadingVideos] = useState(false)
  const [points, setPoints] = useState<number | null>(null)
  const [trialExpiresAt, setTrialExpiresAt] = useState<string | null>(null)
  const [generationType, setGenerationType] = useState<"video" | "audio">("video")
  const { connection } = useConnection();
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const [success, setSuccess] = useState("");
  const [loadingStep, setLoadingStep] = useState("");

  // Project state
    const [projectName, setProjectName] = useState("Untitled Project")
    const [isEditingName, setIsEditingName] = useState(false)
  
    // Content state - merged upload + script
    const [content, setContent] = useState("")
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string; type: string; content?: string }[]>([])
    const [selectedSource, setSelectedSource] = useState<{ name: string; content: string } | null>(null)
    const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([])
  
    // Impromptu question state
    const [impromptuQuestion, setImpromptuQuestion] = useState("")
    const [impromptuMode, setImpromptuMode] = useState<"audio" | "video">("video")
    const [impromptuLoading, setImpromptuLoading] = useState(false)
  
    // Import state
    const [importUrl, setImportUrl] = useState("")
    const [importLoading, setImportLoading] = useState(false)
    const [importError, setImportError] = useState("")
    const [importSuccess, setImportSuccess] = useState("")
  
    // Generation state
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [backendError, setBackendError] = useState<string | null>(null)

  // Fetch user's videos and audio when wallet connects
  useEffect(() => {
    const fetchUserContent = async () => {
      if (!connected || !publicKey) {
        setVideos([])
        setPoints(null)
        setTrialExpiresAt(null)
        return
      }

      setLoadingVideos(true)
      try {
        const walletAddress = publicKey.toBase58()

        // Fetch content from centralized lib helper
        try {
          // @ts-ignore - dynamic import of local lib helper
          const backendModule = await import("../../lib/backend")
          const data = await backendModule.fetchUserContent(walletAddress)
          console.log("Fetched content:", data)

          const backendBaseUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001").replace(/\/$/, "")

          // Transform backend response to match our content format
          const fetchedContent = (data?.content || []).map((item: any) => ({
            id: item.id,
            title: item.title,
            url: `${backendBaseUrl}${item.url}`,
            createdAt: item.created_at,
            contentType: item.content_type,
          }))

          console.log("Transformed content:", fetchedContent)
          setVideos(fetchedContent)

          // Fetch points using centralized helper from same module
          try {
            const pointsData = await backendModule.fetchUserPoints(walletAddress)
            setPoints(typeof pointsData.points === 'number' ? pointsData.points : null)
            setTrialExpiresAt(pointsData.trial_expires_at || pointsData.trial_expires_at || null)
          } catch (err) {
            console.debug('Failed to fetch points:', err)
            setPoints(null)
            setTrialExpiresAt(null)
          }
        } catch (err) {
          console.error("Failed to fetch content:", err)
          // Don't clear videos on error - user may have had content loaded before
          // Only set to empty if this is the initial load
        }
      } catch (error) {
        console.error("Error fetching content:", error)
      } finally {
        setLoadingVideos(false)
      }
    }

    fetchUserContent()
  }, [connected, publicKey])

  const handleConnect = () => {
    // Connection is handled by the wallet adapter
  }

  const handleDisconnect = () => {
    disconnect()
    setCurrentVideo(null)
  }

  const handleVideoGenerated = (videoUrl: string, title: string) => {
    console.log("Content generated with URL:", videoUrl)
    
    // Extract content ID from URL (works for both /api/videos/ and /api/audio/)
    const contentIdMatch = videoUrl.match(/\/api\/(?:videos|audio)\/([a-f0-9-]+)/i)
    const contentId = contentIdMatch ? contentIdMatch[1] : `local-${Date.now()}`
    
    const newContent = {
      id: contentId,
      title,
      url: videoUrl,
      createdAt: new Date().toISOString(),
    }
    
    // Avoid duplicates - check if content already exists
    setVideos((prev) => {
      const existingIndex = prev.findIndex(v => v.id === contentId)
      if (existingIndex >= 0) {
        // Update existing content
        const updated = [...prev]
        updated[existingIndex] = newContent
        return updated
      }
      // Add new content at the beginning
      return [newContent, ...prev]
    })
    
    setCurrentVideo({ url: videoUrl, title })
    console.log("Current content set to:", { url: videoUrl, title })
  }

  // File input ref for uploads
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const unifiedTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const removeFile = (index: number) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index));
  };

  const handleSelectSource = (file: any) => {
    setSelectedSource(file);
  };

  const handleContentChange = (value: string) => {
    setContent(value);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append('files', f))
      const resp = await fetch(getBackendUrl('/api/upload'), {
        method: 'POST',
        body: form,
      })
      if (!resp.ok) {
        console.error('Upload failed', resp.statusText)
        return
      }
      const data = await resp.json()
      // Expect backend to return { url, title }
      const uploaded = data[0] || data
      if (uploaded && uploaded.url) {
        handleVideoGenerated(uploaded.url, uploaded.title || 'Uploaded')
      }
    } catch (err) {
      console.error('Upload error', err)
    } finally {
      // reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // const handleImportRepo = async () => {
  //   const repoUrl = window.prompt('Enter repository URL to import (e.g. https://github.com/user/repo)')
  //   if (!repoUrl) return
  //   try {
  //     const resp = await fetch(getBackendUrl('/api/import-repo'), {
  //       method: 'POST',
  //       headers: { 'Content-Type': 'application/json' },
  //       body: JSON.stringify({ repo: repoUrl }),
  //     })
  //     if (!resp.ok) {
  //       console.error('Import failed', await resp.text())
  //       return
  //     }
  //     const data = await resp.json()
  //     // If backend returns created content, open or add it
  //     if (data?.url) {
  //       handleVideoGenerated(data.url, data.title || 'Imported repo')
  //     } else {
  //       // Notify user import started
  //       console.log('Repository import started')
  //     }
  //   } catch (err) {
  //     console.error('Import error', err)
  //   }
  // }
  // Import repo handler
    const handleImportRepo = async () => {
      if (!importUrl.trim()) {
        setImportError("Please enter a repository or documentation URL")
        return
      }
  
      setImportLoading(true)
      setImportError("")
      setImportSuccess("")
  
      try {
        // Detect URL type
        const detection = detectURLType(importUrl)
  
        if (detection.type === "unknown") {
          setImportError("Direct docs extraction not supported yet. Paste a GitHub repo instead.")
          setImportLoading(false)
          return
        }
  
        // Parse GitHub URL
        const parsed = parseGitHubURL(detection.url)
        if (!parsed) {
          setImportError("Invalid GitHub repository URL. Use format: https://github.com/owner/repo")
          setImportLoading(false)
          return
        }
  
        // Fetch and extract content
        const files = await extractGitHubContent(parsed.owner, parsed.repo)
  
        if (files.length === 0) {
          setImportError("No supported files found in this repository")
          setImportLoading(false)
          return
        }
  
        // Combine files into sources
        const sources = combineImportedFiles(files, detection.url)
  
        // Add to uploaded files
        setUploadedFiles((prev) => [...prev, ...sources])
  
        // Show success message
        let successMsg = `Repository imported successfully! (${files.length} files)`
        if (detection.message) {
          successMsg = detection.message + ` Imported ${files.length} files.`
        }
        setImportSuccess(successMsg)
  
        // Clear input
        setImportUrl("")
  
        // Clear success message after 5 seconds
        setTimeout(() => setImportSuccess(""), 5000)
      } catch (err) {
        console.error("Import error:", err)
        const errorMsg =
          err instanceof Error && err.message.includes("Rate limit")
            ? "GitHub API rate limit exceeded. Please try again in a few minutes."
            : err instanceof Error
              ? err.message
              : "Unable to extract content from this source"
        setImportError(errorMsg)
      } finally {
        setImportLoading(false)
      }
    }
    
    // Impromptu question generation
  const handleImpromptuGenerate = async (mode: "audio" | "video") => {
    if (!impromptuQuestion.trim()) return;

    // Use unified content source
    const previewContent = content.trim() || uploadedFiles.map((f) => f.content || "").filter(Boolean).join("\n\n");

    if (!previewContent.trim()) {
      setError("No content available to answer questions about");
      return;
    }

    if (!publicKey) {
      setError("Please connect your wallet");
      return;
    }

    setImpromptuLoading(true);
    setImpromptuMode(mode);
    setError("");

    setTimeout(() => {
      setImpromptuLoading(false);
      setImpromptuQuestion("");
      const newVideo = {
        id: Date.now().toString(),
        title: impromptuQuestion.slice(0, 30) + "...",
        url: "https://example.com/video.mp4",
        type: mode,
        createdAt: new Date().toISOString()
      };
      setVideos([newVideo, ...videos]);
      setCurrentVideo({ url: newVideo.url, title: newVideo.title });
    }, 2000);
  };

  const handleGenerate = async () => {
    // Determine content source
    const scriptContent = content.trim() || uploadedFiles.map((f) => f.content || "").filter(Boolean).join("\n\n");
    
    if (!scriptContent) {
      setError("Please add content or sources");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!publicKey) {
        throw new Error("Wallet not connected");
      }

      setLoadingStep("Generating " + generationType + "...");

      // Auto-generate title from first 50 chars of content
      const autoTitle = scriptContent.slice(0, 50).trim() + (scriptContent.length > 50 ? "..." : "");

      const endpoint = generationType === "audio" ? "/api/generate/audio" : "/api/generate";
      const backendBaseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
      
      const response = await fetch(`${backendBaseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script: scriptContent,
          prompt: impromptuQuestion.trim() || null,
          walletAddress: publicKey?.toBase58(),
        }),
      });

      if (response.status === 402) {
        const errorData = await response.json().catch(() => ({}));
        const required = errorData.required || (generationType === "video" ? 2 : 1);
        setError(`Insufficient credits. You need ${required} credits. Current: ${points || 0}`);
        setLoading(false);
        setLoadingStep("");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to start ${generationType} generation`);
      }

      const { jobId, title } = await response.json();

      // Connect to WebSocket for real-time updates
      const ws = new WebSocket('ws://localhost:3001')
      let wsConnected = false

      ws.onopen = () => {
        wsConnected = true
        ws.send(JSON.stringify({ action: 'subscribe', jobId }))
      }

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.type === 'progress') {
          setProgressPct(data.progress || 0)
          setLoadingStep(`${data.progress}% - ${data.message}`)
        } else if (data.type === 'completed') {
          const contentId = data.videoId || data.audioId
          if (!contentId) {
            setError("No content ID received")
            setLoading(false)
            setLoadingStep("")
            return
          }
          const contentUrl = generationType === "audio" 
            ? `${backendBaseUrl}/api/audio/${contentId}` 
            : `${backendBaseUrl}/api/videos/job/${contentId}`
          setProgressPct(100) // Show 100% before completing
          handleVideoGenerated(contentUrl, title)
          setSuccess('Completed!')
          setProgressPct(0)
          setLoading(false)
          setLoadingStep("")
          ws.close()
        } else if (data.type === 'error') {
          setError(`Error: ${data.error}`)
          setProgressPct(0)
          setLoading(false)
          setLoadingStep("")
          ws.close()
        }
      }

      ws.onerror = () => {
        // No fallback polling, rely on webhooks
      }

      // No fallback polling, rely on webhooks
    } catch (err: any) {
      setError(err.message || "Generation failed");
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const estimateVideoLength = (text: string) => {
    const words = text.trim().split(/\s+/).length;
    const avgWordsPerMinute = 150;
    return Math.ceil(words / avgWordsPerMinute);
  };

  // Wallet not connected - show connect prompt
  if (!connected) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Connect Wallet to Access Studio</h1>
          <p className="text-slate-400 max-w-md">
            Connect your Solana wallet to start creating AI-powered videos and audio content.
          </p>
          <WalletMultiButton style={{
            background: "linear-gradient(to right, rgb(124, 58, 202), rgb(79, 70, 229))",
            borderRadius: "0.75rem",
            fontWeight: "600",
            padding: "0.75rem 1.5rem",
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Header - Fixed */}
      <header className="flex-shrink-0 bg-slate-900/70 backdrop-blur-sm border-b border-slate-800 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => startTransition(() => router.push('/'))} className="text-sm text-slate-400 hover:text-white">
            ← Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-500 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            {isEditingName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingName(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingName(false)}
                className="bg-transparent border-b border-violet-500 text-lg font-semibold focus:outline-none"
                autoFocus
              />
            ) : (
              <button onClick={() => setIsEditingName(true)} className="text-lg font-semibold hover:text-violet-400">
                {projectName}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right text-sm">
            <div className="text-slate-300">
              {publicKey?.toString().slice(0, 4)}...{publicKey?.toString().slice(-4)}
            </div>
            <div className="text-xs text-violet-400">Credits: {points ?? "—"}</div>
          </div>
          <button onClick={handleDisconnect} className="p-2 rounded-lg border border-slate-700 hover:bg-slate-800">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {backendError && (
        <div className="bg-red-600/10 border-t border-b border-red-500/20 text-red-300 text-sm px-4 py-2">
          {backendError}
        </div>
      )}

      {/* Main 3-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Sources */}
        <aside className="w-72 flex-shrink-0 border-r border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold">Sources</span>
              <button onClick={() => fileInputRef.current?.click()} className="p-1.5 rounded-lg hover:bg-slate-800">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2 px-3 rounded-lg border border-dashed border-slate-600 text-sm text-slate-400 hover:border-violet-500 hover:text-violet-400 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add sources
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              multiple
              accept=".txt,.md,.json,.csv,.pdf,.docx"
            />

            <div className="mt-3 pt-3 border-t border-slate-700">
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !importLoading) {
                      handleImportRepo();
                    }
                  }}
                  placeholder="Paste repo or docs URL"
                  className="flex-1 px-2 py-2 bg-slate-900/50 border border-slate-700 rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  disabled={importLoading}
                />
                <button
                  onClick={handleImportRepo}
                  disabled={importLoading || !importUrl.trim()}
                  className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-xs font-medium text-white transition"
                >
                  {importLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Upload className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Import Status Messages */}
              {importError && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2 mb-2">
                  {importError}
                </div>
              )}
              {importSuccess && (
                <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded p-2 mb-2">
                  {importSuccess}
                </div>
              )}
            </div>
          </div>

          {uploadedFiles.length > 0 && (
            <div className="px-4 py-2 border-b border-slate-800">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input type="checkbox" className="rounded bg-slate-700 border-slate-600" />
                Select all sources
              </label>
            </div>
          )}

          {/* Uploaded Files List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {uploadedFiles.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Saved sources will appear here</p>
                <p className="text-xs mt-1">Upload PDFs, text files, or documents</p>
              </div>
            ) : (
              uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSource(file)}
                  className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                    selectedSource?.name === file.name
                      ? "bg-violet-600/20 border border-violet-500/50"
                      : "bg-slate-800/50 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-violet-400 flex-shrink-0" />
                    <span className="text-sm truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="p-1 hover:bg-slate-700 rounded"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Center Panel - Unified Content */}
        <main className="flex-1 flex flex-col bg-slate-950">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold">Chat</span>
            <button className="p-1.5 rounded-lg hover:bg-slate-800">
              <Settings className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              {/* Unified Canvas - Content Area */}
              <div className="flex-1 overflow-y-auto mb-4 min-h-[300px] p-4 bg-slate-900/10 border border-slate-700/50 rounded-xl">
                {content.trim().length === 0 && uploadedFiles.length === 0 ? (
                  <div className="h-full relative">
                    <textarea
                      ref={unifiedTextareaRef}
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder=""
                      className="w-full h-full min-h-[300px] max-h-[80vh] bg-transparent p-6 text-white placeholder-transparent resize-none focus:outline-none"
                    />

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
                      <div className="text-lg text-slate-500 mb-4 select-none">Start typing your script here...</div>
                      <div className="text-sm text-slate-400 select-none">Paste your script or add sources from the left panel</div>
                    </div>
                  </div>
                ) : content.trim().length > 0 ? (
                  <div className="flex flex-col h-full">
                    <label className="block text-sm font-semibold text-white mb-2">Your Script</label>
                    <textarea
                      value={content}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder="Start typing your script here..."
                      className="w-full flex-1 bg-transparent border border-slate-800/40 rounded-xl p-3 text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 overflow-auto"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Source Content</label>
                    <pre className="whitespace-pre-wrap text-sm text-slate-300 bg-transparent p-3 rounded w-full">{uploadedFiles.map((f) => f.content || "").filter(Boolean).join("\n\n") || "(No extractable text)"}</pre>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="mb-4 p-3 bg-violet-600/10 border border-violet-600/30 rounded-lg flex items-center gap-2 text-violet-400 text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              {/* Question Bar + Impromptu Generation */}
              <div className="flex items-center gap-2 p-3 bg-slate-900/80 rounded-xl border border-slate-700 mb-4">
                <input
                  type="text"
                  value={impromptuQuestion}
                  onChange={(e) => setImpromptuQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && impromptuQuestion.trim() && !impromptuLoading) {
                      handleImpromptuGenerate("audio");
                    }
                  }}
                  placeholder="Ask a question about the content..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder-slate-500"
                  disabled={impromptuLoading}
                />
                <button
                  onClick={() => {
                    setImpromptuMode("audio");
                    handleImpromptuGenerate("audio");
                  }}
                  disabled={!impromptuQuestion.trim() || impromptuLoading}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 transition"
                >
                  {impromptuLoading && impromptuMode === "audio" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Mic className="w-3 h-3" />
                  )}
                  Audio
                </button>
                <button
                  onClick={() => {
                    setImpromptuMode("video");
                    handleImpromptuGenerate("video");
                  }}
                  disabled={!impromptuQuestion.trim() || impromptuLoading}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 transition"
                >
                  {impromptuLoading && impromptuMode === "video" ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Video className="w-3 h-3" />
                  )}
                  Video
                </button>
              </div>

              {/* Bottom Action Bar - Main Generation */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-700">
                <div className="text-xs text-slate-500 flex items-center gap-3">
                  {uploadedFiles.length > 0 && <span>{uploadedFiles.length} source(s)</span>}
                  {script.trim().length > 0 && (
                    <span>
                      ~{estimateVideoLength(script)} min video
                    </span>
                  )}
                </div>
                <button
                  onClick={handleGenerate}
                  disabled={loading || (content.trim().length === 0 && uploadedFiles.length === 0)}
                  className={`px-6 py-3 rounded-xl font-semibold flex items-center gap-2 transition ${
                    loading
                      ? "bg-gray-700/50 cursor-not-allowed"
                      : generationType === "video"
                        ? "bg-gradient-to-r from-violet-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600"
                        : "bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {loadingStep}
                    </>
                  ) : (
                    <>
                      {generationType === "video" ? <Video className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      Generate ({generationType === "video" ? 2 : 1} credits)
                    </>
                  )}
                </button>

                {loading && loadingStep && (
                  <div className="w-full mt-3">
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-violet-600 to-indigo-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${parseInt(loadingStep.split('%')[0]) || 0}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-slate-400 mt-1 text-center">
                      {loadingStep.split(' - ')[1] || loadingStep}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel - Studio Output */}
        <aside className="w-80 flex-shrink-0 border-l border-slate-800 bg-slate-900/50 flex flex-col">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="font-semibold">Studio</span>
          </div>

          <div className="p-4 border-b border-slate-800">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setGenerationType("audio")}
                className={`flex items-center gap-2 p-3 rounded-lg text-sm transition ${
                  generationType === "audio"
                    ? "bg-violet-600/20 border border-violet-500/50 text-violet-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Audio</span>
              </button>
              <button
                onClick={() => setGenerationType("video")}
                className={`flex items-center gap-2 p-3 rounded-lg text-sm transition ${
                  generationType === "video"
                    ? "bg-violet-600/20 border border-violet-500/50 text-violet-300"
                    : "bg-slate-800 hover:bg-slate-700 text-slate-300"
                }`}
              >
                <Film className="w-4 h-4" />
                <span>Video</span>
              </button>
            </div>
          </div>

          {currentVideo && (
            <div className="p-4 border-b border-slate-800">
              <VideoDisplay
                videoUrl={currentVideo.url}
                title={currentVideo.title}
                onClose={() => setCurrentVideo(null)}
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-xs text-slate-500 mb-3">Generated Content</div>
            {loadingVideos ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-violet-500" />
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50 text-violet-400" />
                <p className="text-sm text-violet-400">Studio output will be saved here</p>
                <p className="text-xs mt-2">
                  After adding sources, generate content!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {videos.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setCurrentVideo({ url: v.url, title: v.title })}
                    className="w-full p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-left transition"
                  >
                    <div className="flex items-center gap-2">
                      {v.type === "video" ? (
                        <Film className="w-4 h-4 text-violet-400" />
                      ) : (
                        <Mic className="w-4 h-4 text-pink-400" />
                      )}
                      <span className="text-sm font-medium truncate">{v.title || "Untitled"}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{new Date(v.createdAt).toLocaleDateString()}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-800">
            <button className="w-full py-2 px-3 rounded-lg border border-slate-600 text-sm text-slate-400 hover:border-violet-500 hover:text-violet-400 flex items-center justify-center gap-2">
              <FileText className="w-4 h-4" /> Add note
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

function StudioCard({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center gap-3 p-4 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition group">
      <div className="text-slate-400 group-hover:text-slate-300 transition">{icon}</div>
      <span className="text-xs font-medium text-slate-300">{label}</span>
    </button>
  )
}