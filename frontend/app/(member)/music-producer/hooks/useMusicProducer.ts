'use client'

import { useState, useCallback, useRef } from 'react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

export interface AnalysisResult {
  key: string
  scale: string
  bpm: number
  motif_notes?: number[]
  motif_rhythm?: number[]
  confidence: number
  recording_id?: string
}

export interface MusicTaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'not_found'
  progress: number
  production_log?: Array<{
    member: string
    icon: string
    action: string
    result: string
  }>
  has_audio: boolean
  files?: Record<string, string>
  error?: string
}

export interface GenerateOptions {
  key: string
  bpm: number
  style: string
  bars: number
  engine: string
  recording_id?: string
}

export function useMusicProducer() {
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<MusicTaskStatus | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [engines, setEngines] = useState<Array<{ name: string; version: string; description: string }>>([])
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const { getFirebaseAuth } = await import('@/lib/firebase')
    const auth = getFirebaseAuth()
    const token = await auth.currentUser?.getIdToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }, [])

  const uploadRecording = useCallback(async (blob: Blob) => {
    setIsUploading(true)
    try {
      const headers = await getAuthHeaders()
      const formData = new FormData()
      formData.append('file', blob, 'recording.webm')

      const res = await fetch(`${API_BASE}/api/music/upload-recording`, {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      const json = await res.json()
      const result = json.data as AnalysisResult
      setAnalysisResult(result)
      return result
    } finally {
      setIsUploading(false)
    }
  }, [getAuthHeaders])

  const fetchEngines = useCallback(async () => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE}/api/music/engines`, { headers })
      if (res.ok) {
        const data = await res.json()
        setEngines(data.data || [])
      }
    } catch {
      // ignore engine fetch failure
    }
  }, [getAuthHeaders])

  const startGeneration = useCallback(async (options: GenerateOptions) => {
    setIsGenerating(true)
    setTaskStatus(null)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_BASE}/api/music/generate`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      })

      if (!res.ok) throw new Error(`Generate failed: ${res.status}`)
      const json = await res.json()
      const id = json.data.task_id as string
      setTaskId(id)
      startPolling(id)
      return id
    } catch (err) {
      setIsGenerating(false)
      throw err
    }
  }, [getAuthHeaders])

  const startPolling = useCallback((id: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current)

    pollingRef.current = setInterval(async () => {
      try {
        const headers = await getAuthHeaders()
        const res = await fetch(`${API_BASE}/api/music/status/${id}`, { headers })
        if (!res.ok) return

        const json = await res.json()
        const status = json.data as MusicTaskStatus
        setTaskStatus(status)

        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(pollingRef.current!)
          pollingRef.current = null
          setIsGenerating(false)
        }
      } catch {
        // ignore polling errors
      }
    }, 1500)
  }, [getAuthHeaders])

  const getDownloadUrl = useCallback((id: string, fileType: string) => {
    return `${API_BASE}/api/music/download/${id}/${fileType}`
  }, [])

  return {
    analysisResult,
    taskId,
    taskStatus,
    isUploading,
    isGenerating,
    engines,
    uploadRecording,
    startGeneration,
    fetchEngines,
    getDownloadUrl,
  }
}
