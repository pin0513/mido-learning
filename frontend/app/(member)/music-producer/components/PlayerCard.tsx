'use client'

import { useRef, useState } from 'react'

interface PlayerCardProps {
  taskId: string
  hasAudio: boolean
  getDownloadUrl: (id: string, type: string) => string
}

export function PlayerCard({ taskId, hasAudio, getDownloadUrl }: PlayerCardProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const mp3Url = getDownloadUrl(taskId, 'mp3')
  const midiUrl = getDownloadUrl(taskId, 'midi')
  const accompMidiUrl = getDownloadUrl(taskId, 'midi_accomp')

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">🎵 Generated Result</h2>

      {hasAudio ? (
        <>
          <audio
            ref={audioRef}
            src={mp3Url}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
          <div className="flex items-center gap-4 mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 text-white flex items-center justify-center text-xl hover:from-blue-600 hover:to-purple-600 transition shadow-md"
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            <div>
              <p className="font-medium text-gray-800">Generated Music</p>
              <p className="text-sm text-gray-500">Click to play</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700 mb-2">Download</p>
            {[
              { label: '🎵 MP3 Audio', url: mp3Url },
              { label: '🎹 MIDI Melody', url: midiUrl },
              { label: '🎸 MIDI Accompaniment', url: accompMidiUrl },
            ].map(({ label, url }) => (
              <a
                key={url}
                href={url}
                download
                className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 transition"
              >
                {label}
                <span className="ml-auto text-gray-400">⬇️</span>
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🎼</div>
          <p>MIDI generated (no audio rendering)</p>
          <a
            href={midiUrl}
            download
            className="mt-3 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition"
          >
            Download MIDI
          </a>
        </div>
      )}
    </div>
  )
}
