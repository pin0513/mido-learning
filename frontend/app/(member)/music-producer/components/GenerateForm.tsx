'use client'

import { useEffect } from 'react'
import { AnalysisResult } from '../hooks/useMusicProducer'

const KEYS = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C#', 'Eb', 'F#', 'Ab', 'Bb']
const STYLES = [
  { value: 'pop', label: 'Pop' },
  { value: 'ballad', label: 'Ballad' },
  { value: 'cpop', label: 'C-Pop' },
]

interface GenerateFormProps {
  analysis: AnalysisResult | null
  engines: Array<{ name: string; version: string; description: string }>
  onGenerate: (opts: {
    key: string
    bpm: number
    style: string
    bars: number
    engine: string
    recording_id?: string
  }) => void
  isGenerating?: boolean
  values: {
    key: string
    bpm: number
    style: string
    bars: number
    engine: string
  }
  onChange: (values: {
    key: string
    bpm: number
    style: string
    bars: number
    engine: string
  }) => void
}

export function GenerateForm({
  analysis,
  engines,
  onGenerate,
  isGenerating,
  values,
  onChange,
}: GenerateFormProps) {
  // Sync from analysis result
  useEffect(() => {
    if (analysis) {
      onChange({
        ...values,
        key: analysis.key || values.key,
        bpm: Math.round(analysis.bpm) || values.bpm,
      })
    }
  }, [analysis])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onGenerate({
      ...values,
      recording_id: analysis?.recording_id,
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">🎼 Music Settings</h2>
      {analysis && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          🎵 Analyzed: Key of {analysis.key}, {Math.round(analysis.bpm)} BPM
          {analysis.confidence > 0 && ` (confidence ${Math.round(analysis.confidence * 100)}%)`}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Key</label>
            <select
              value={values.key}
              onChange={e => onChange({ ...values, key: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">BPM</label>
            <input
              type="number"
              min={60}
              max={200}
              value={values.bpm}
              onChange={e => onChange({ ...values, bpm: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
          <div className="flex gap-2 flex-wrap">
            {STYLES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange({ ...values, style: s.value })}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
                  values.style === s.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bars: {values.bars}
          </label>
          <input
            type="range"
            min={4}
            max={32}
            step={4}
            value={values.bars}
            onChange={e => onChange({ ...values, bars: Number(e.target.value) })}
            className="w-full accent-blue-500"
          />
        </div>

        {engines.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Engine (Advanced)</label>
            <select
              value={values.engine}
              onChange={e => onChange({ ...values, engine: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {engines.map(e => (
                <option key={e.name} value={e.name}>{e.description || e.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          disabled={isGenerating}
          className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition"
        >
          {isGenerating ? 'Generating...' : '🎵 Generate Music'}
        </button>
      </form>
    </div>
  )
}
