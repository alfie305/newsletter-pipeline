import type { Source } from '../types';

interface SourceSegmentCardsProps {
  sources: Source[];
  onSegmentClick: (segment: string) => void;
}

export function SourceSegmentCards({ sources, onSegmentClick }: SourceSegmentCardsProps) {
  // Handle empty or undefined sources
  if (!sources || sources.length === 0) {
    return (
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-white mb-4">Source Segments</h3>
        <div className="text-center py-8 text-[#9ca3af]">
          No source segments yet. Add sources to get started.
        </div>
      </div>
    );
  }

  // Group sources by segment
  const segments = sources.reduce((acc, source) => {
    const segment = source.segment || 'Other';
    if (!acc[segment]) {
      acc[segment] = { total: 0, active: 0 };
    }
    acc[segment].total++;
    if (source.enabled) {
      acc[segment].active++;
    }
    return acc;
  }, {} as Record<string, { total: number; active: number }>);

  // Segment icons and colors
  const segmentStyles: Record<string, { icon: string; color: string; gradientFrom: string; gradientTo: string }> = {
    'Real Estate': {
      icon: '🏠',
      color: '#10b981',
      gradientFrom: '#10b981',
      gradientTo: '#059669',
    },
    'AI News': {
      icon: '🤖',
      color: '#8b5cf6',
      gradientFrom: '#8b5cf6',
      gradientTo: '#7c3aed',
    },
    'Other': {
      icon: '📰',
      color: '#B8B8B8',
      gradientFrom: '#B8B8B8',
      gradientTo: '#9ca3af',
    },
  };

  return (
    <div className="mb-8">
      <h3 className="text-lg font-semibold text-white mb-4">Source Segments</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(segments).map(([segment, stats]) => {
          const style = segmentStyles[segment] || segmentStyles['Other'];
          const activePercentage = stats.total > 0 ? Math.round((stats.active / stats.total) * 100) : 0;

          return (
            <div
              key={segment}
              onClick={() => onSegmentClick(segment)}
              className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] hover:border-[#E8995C] transition-colors cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-[#9ca3af] group-hover:text-white transition-colors">
                  {segment}
                </h4>
                <div className="w-10 h-10 rounded-full bg-[#2a2a2a] flex items-center justify-center text-2xl">
                  {style.icon}
                </div>
              </div>

              <div className="text-3xl font-bold text-white mb-2">{stats.active}</div>

              <div className="flex items-center gap-2 mb-3">
                <div className="h-1 flex-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${activePercentage}%`,
                      background: `linear-gradient(to right, ${style.gradientFrom}, ${style.gradientTo})`,
                    }}
                  />
                </div>
                <span className="text-sm text-[#9ca3af]">{activePercentage}%</span>
              </div>

              <div className="text-xs text-[#6b7280] flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                {stats.active} of {stats.total} active · Click to manage
              </div>
            </div>
          );
        })}

        {/* Add new segment card */}
        <div
          onClick={() => onSegmentClick('new')}
          className="bg-[#1a1a1a] rounded-2xl p-6 border border-dashed border-[#2a2a2a] hover:border-[#E8995C] transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[180px] group"
        >
          <div className="w-12 h-12 rounded-full bg-[#2a2a2a] group-hover:bg-[#333333] flex items-center justify-center mb-3 transition-colors">
            <svg className="w-6 h-6 text-[#9ca3af] group-hover:text-[#E8995C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <span className="text-sm font-medium text-[#9ca3af] group-hover:text-white transition-colors">
            Add New Segment
          </span>
        </div>
      </div>
    </div>
  );
}
