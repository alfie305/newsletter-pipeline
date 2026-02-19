interface Stage {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
  progress?: number;
}

interface PipelineVisualizationProps {
  stages: Stage[];
  isRunning: boolean;
  currentEditionId: string | null;
  onExecute: () => void;
}

export function PipelineVisualization({
  stages,
  isRunning,
  currentEditionId,
  onExecute
}: PipelineVisualizationProps) {
  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a]">
      <h3 className="text-lg font-semibold text-white mb-6">Pipeline Stages</h3>

      <div className="space-y-4 mb-8">
        {stages.map((stage, index) => (
          <div key={stage.name} className="relative">
            <div className="flex items-center gap-4">
              {/* Status Icon */}
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all
                ${stage.status === 'completed' ? 'bg-[#10b981] text-white' : ''}
                ${stage.status === 'in_progress' ? 'bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white animate-pulse' : ''}
                ${stage.status === 'failed' ? 'bg-[#ef4444] text-white' : ''}
                ${stage.status === 'pending' ? 'bg-[#2a2a2a] text-[#6b7280]' : ''}
              `}>
                {stage.status === 'completed' && '✓'}
                {stage.status === 'in_progress' && '●'}
                {stage.status === 'failed' && '✗'}
                {stage.status === 'pending' && (index + 1)}
              </div>

              {/* Stage Name and Progress */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium capitalize ${
                    stage.status === 'pending' ? 'text-[#6b7280]' : 'text-white'
                  }`}>
                    {stage.name}
                  </span>
                  {stage.status === 'in_progress' && stage.progress !== undefined && (
                    <span className="text-sm text-[#9ca3af]">{stage.progress}%</span>
                  )}
                </div>

                {/* Progress Bar */}
                {stage.status === 'in_progress' && stage.progress !== undefined && (
                  <div className="h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#E8995C] to-[#D4915F] transition-all duration-500"
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                )}

                {/* Message */}
                {stage.message && (
                  <p className="text-xs text-[#9ca3af] mt-1">{stage.message}</p>
                )}
              </div>
            </div>

            {/* Connector Line */}
            {index < stages.length - 1 && (
              <div className={`
                absolute left-5 top-10 w-0.5 h-4
                ${stage.status === 'completed' ? 'bg-[#10b981]' : 'bg-[#2a2a2a]'}
              `} />
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={onExecute}
          disabled={isRunning}
          className="flex-1 px-6 py-4 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-xl font-semibold text-lg hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isRunning ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Generating...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>🚀</span>
              Generate Newsletter
            </span>
          )}
        </button>

        {currentEditionId && (
          <button
            onClick={() => {
              // Open preview in new tab or modal
              const url = `/editions/${currentEditionId}`;
              window.open(`http://localhost:3000/api${url}/html`, '_blank');
            }}
            className="px-6 py-4 bg-[#2a2a2a] text-white rounded-xl font-semibold hover:bg-[#333333] transition-all"
          >
            Preview Latest
          </button>
        )}
      </div>
    </div>
  );
}
