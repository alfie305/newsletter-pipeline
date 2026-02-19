interface LoadingVisualizationsProps {
  isVisible: boolean;
  currentStage?: string;
  stageMessage?: string;
  currentStageIndex?: number;
}

export function LoadingVisualizations({
  isVisible,
  currentStage,
  stageMessage,
  currentStageIndex = 0
}: LoadingVisualizationsProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="relative">
        {/* Floating Astronaut */}
        <div className="w-48 h-48 animate-float">
          <div className="relative">
            {/* Helmet */}
            <div className="w-32 h-32 bg-gradient-to-br from-[#B8B8B8] to-[#9ca3af] rounded-full mx-auto border-4 border-[#4A4A4A]">
              <div className="w-20 h-16 bg-[#1a1a1a] rounded-lg mt-6 mx-auto" />
            </div>
            {/* Body */}
            <div className="w-24 h-32 bg-gradient-to-br from-[#E8995C] to-[#D4915F] rounded-2xl mx-auto -mt-2 relative">
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-[#E8995C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              {/* Arms */}
              <div className="absolute top-6 -left-3 w-6 h-16 bg-gradient-to-br from-[#E8995C] to-[#D4915F] rounded-full transform -rotate-12" />
              <div className="absolute top-6 -right-3 w-6 h-16 bg-gradient-to-br from-[#E8995C] to-[#D4915F] rounded-full transform rotate-12" />
            </div>
            {/* Legs */}
            <div className="flex justify-center gap-2 -mt-1">
              <div className="w-8 h-14 bg-gradient-to-br from-[#E8995C] to-[#D4915F] rounded-xl" />
              <div className="w-8 h-14 bg-gradient-to-br from-[#E8995C] to-[#D4915F] rounded-xl" />
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mt-8">
          <h3 className="text-2xl font-bold text-white mb-2">
            {currentStage ? `${currentStage.charAt(0).toUpperCase() + currentStage.slice(1)}...` : 'Launching Pipeline...'}
          </h3>
          <p className="text-[#9ca3af]">
            {stageMessage || 'Preparing your space newsletter'}
          </p>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i <= currentStageIndex
                  ? 'bg-[#E8995C]'
                  : 'bg-[#2a2a2a]'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
