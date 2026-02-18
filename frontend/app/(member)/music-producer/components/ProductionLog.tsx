'use client'

interface LogStep {
  member: string
  icon: string
  action: string
  result: string
}

interface ProductionLogProps {
  steps: LogStep[]
  status: string
  progress: number
}

export function ProductionLog({ steps, status, progress }: ProductionLogProps) {
  if (steps.length === 0 && status === 'pending') return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">🎬 Production Log</h2>

      {/* Progress bar */}
      <div className="w-full bg-gray-100 rounded-full h-2 mb-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-lg flex-shrink-0">{step.icon}</span>
            <div>
              <span className="font-medium text-gray-700">{step.member}</span>
              <span className="text-gray-400 mx-1">&middot;</span>
              <span className="text-gray-600">{step.action}</span>
              {step.result && (
                <p className="text-gray-500 text-xs mt-0.5">{step.result}</p>
              )}
            </div>
          </div>
        ))}

        {status === 'processing' && (
          <div className="flex items-center gap-2 text-blue-500 text-sm pt-1">
            <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
            Generating...
          </div>
        )}
      </div>
    </div>
  )
}
