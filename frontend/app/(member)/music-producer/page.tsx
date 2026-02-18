'use client'

import { useState, useCallback, useEffect } from 'react'
import { RecorderCard } from './components/RecorderCard'
import { GenerateForm } from './components/GenerateForm'
import { PlayerCard } from './components/PlayerCard'
import { ProductionLog } from './components/ProductionLog'
import { useMusicProducer } from './hooks/useMusicProducer'

export default function MusicProducerPage() {
  const {
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
  } = useMusicProducer()

  const [formValues, setFormValues] = useState({
    key: 'C',
    bpm: 120,
    style: 'pop',
    bars: 8,
    engine: 'theory_v1',
  })

  useEffect(() => {
    fetchEngines()
  }, [fetchEngines])

  const handleRecordingComplete = useCallback(async (blob: Blob) => {
    try {
      await uploadRecording(blob)
    } catch (err) {
      console.error('Upload failed:', err)
    }
  }, [uploadRecording])

  const handleGenerate = useCallback(async (opts: typeof formValues & { recording_id?: string }) => {
    try {
      await startGeneration(opts)
    } catch (err) {
      console.error('Generation failed:', err)
      alert('Generation failed. Please try again.')
    }
  }, [startGeneration])

  const isCompleted = taskStatus?.status === 'completed'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🎵 Music Producer</h1>
          <p className="text-gray-500">Hum your melody, and AI will arrange it for you</p>
        </div>

        <div className="space-y-6">
          {/* Step 1: Record */}
          <RecorderCard
            onRecordingComplete={handleRecordingComplete}
            isUploading={isUploading}
          />

          {/* Step 2: Generate */}
          <GenerateForm
            analysis={analysisResult}
            engines={engines}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            values={formValues}
            onChange={setFormValues}
          />

          {/* Step 3: Production Log */}
          {taskStatus && (
            <ProductionLog
              steps={taskStatus.production_log || []}
              status={taskStatus.status}
              progress={taskStatus.progress}
            />
          )}

          {/* Step 4: Player */}
          {isCompleted && taskId && (
            <PlayerCard
              taskId={taskId}
              hasAudio={taskStatus?.has_audio ?? false}
              getDownloadUrl={getDownloadUrl}
            />
          )}

          {/* Error */}
          {taskStatus?.status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700">
              Generation failed: {taskStatus.error || 'Unknown error'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
