'use client'

import { useState, useRef, useCallback } from 'react'

interface RecorderCardProps {
  onRecordingComplete: (blob: Blob) => void
  isUploading?: boolean
}

export function RecorderCard({ onRecordingComplete, isUploading }: RecorderCardProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [hasRecording, setHasRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setHasRecording(true)
        onRecordingComplete(blob)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(200)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1)
      }, 1000)
    } catch (err) {
      alert('Unable to access microphone. Please check your permissions.')
    }
  }, [onRecordingComplete])

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">🎙️ Hum Your Melody</h2>
      <p className="text-sm text-gray-500 mb-4">Record your humming, and AI will analyze pitch, rhythm, and generate music</p>

      <div className="flex flex-col items-center gap-4">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl transition-all
          ${isRecording ? 'bg-red-100 animate-pulse' : 'bg-gray-100'}`}>
          {isRecording ? '⏹️' : '🎤'}
        </div>

        {isRecording && (
          <span className="text-red-500 font-mono text-lg">{formatTime(recordingTime)}</span>
        )}

        <div className="flex gap-3">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isUploading}
              className="px-6 py-2 bg-red-500 text-white rounded-full font-medium hover:bg-red-600 disabled:opacity-50 transition"
            >
              Start Recording
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="px-6 py-2 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-700 transition"
            >
              Stop Recording
            </button>
          )}
        </div>

        {isUploading && (
          <div className="flex items-center gap-2 text-blue-500 text-sm">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            Analyzing audio...
          </div>
        )}

        {hasRecording && !isUploading && (
          <p className="text-green-600 text-sm">Recording complete, analyzed</p>
        )}
      </div>
    </div>
  )
}
