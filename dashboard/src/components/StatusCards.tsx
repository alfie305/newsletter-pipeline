interface StatusCardsProps {
  pipelineStatus: 'ready' | 'running' | 'error';
  activeSources: number;
  totalSources: number;
  customTopics: number;
  lastRun?: string;
  onSourcesClick: () => void;
}

export function StatusCards({
  pipelineStatus,
  activeSources,
  totalSources,
  customTopics,
  lastRun,
  onSourcesClick
}: StatusCardsProps) {
  const activePercentage = totalSources > 0 ? Math.round((activeSources / totalSources) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Pipeline Status Card */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] hover:border-[#E8995C] transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#9ca3af]">Pipeline Status</h3>
          <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#E8995C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-2 capitalize">
          {pipelineStatus === 'running' ? 'In Progress' : pipelineStatus === 'error' ? 'Error' : 'Ready'}
        </div>
        <div className="text-sm text-[#9ca3af]">
          {lastRun ? `Last run: ${lastRun}` : 'Never run'}
        </div>
      </div>

      {/* Sources Card */}
      <div
        onClick={onSourcesClick}
        className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] hover:border-[#B8B8B8] transition-colors cursor-pointer"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#9ca3af]">Active Sources</h3>
          <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#B8B8B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-2">{activeSources}</div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1 flex-1 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#E8995C] to-[#D4915F] transition-all duration-500"
              style={{width: `${activePercentage}%`}}
            />
          </div>
          <span className="text-sm text-[#9ca3af]">{activePercentage}%</span>
        </div>
        <div className="text-xs text-[#6b7280] flex items-center gap-1">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Click to manage sources
        </div>
      </div>

      {/* Topics Card */}
      <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] hover:border-[#10b981] transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-[#9ca3af]">Custom Topics</h3>
          <div className="w-8 h-8 rounded-full bg-[#2a2a2a] flex items-center justify-center">
            <svg className="w-4 h-4 text-[#B8B8B8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
        </div>
        <div className="text-3xl font-bold text-white mb-2">{customTopics}</div>
        <div className="text-sm text-[#10b981]">
          {customTopics > 0 ? `${customTopics} active` : 'None yet'}
        </div>
      </div>
    </div>
  );
}
