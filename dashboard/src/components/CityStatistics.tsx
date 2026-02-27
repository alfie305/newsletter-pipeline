import { useCityStatistics } from '../hooks/useCityStatistics';

export function CityStatistics() {
  const { statistics, isLoading, error } = useCityStatistics(10);

  if (isLoading) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-[#2a2a2a] rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-[#2a2a2a] rounded w-1/2 mb-2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#1a1a1a] border border-red-900/30 rounded-lg p-6">
        <p className="text-red-400 text-sm">Failed to load city statistics</p>
      </div>
    );
  }

  if (!statistics || statistics.total_cities === 0) {
    return (
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🏙️</span>
          <h3 className="text-lg font-semibold text-white">Subscriber Cities</h3>
        </div>
        <p className="text-gray-400 text-sm">No subscriber data available yet</p>
      </div>
    );
  }

  return (
    <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-6 hover:border-[#E8995C]/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🏙️</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Subscriber Cities</h3>
            <p className="text-sm text-gray-400">
              {statistics.total_cities} unique {statistics.total_cities === 1 ? 'city' : 'cities'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            {statistics.total_subscribers.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">total subscribers</p>
        </div>
      </div>

      {/* City List */}
      <div className="space-y-3">
        {statistics.top_cities.map((city, index) => (
          <div
            key={city.city}
            className="flex items-center justify-between p-3 bg-[#0a0a0a] rounded-lg border border-[#2a2a2a] hover:border-[#E8995C]/20 transition-colors"
          >
            {/* Rank + City Name */}
            <div className="flex items-center gap-3 flex-1">
              <span className="text-xs font-mono text-gray-500 w-6 text-center">
                #{index + 1}
              </span>
              <span className="text-sm font-medium text-white">{city.city}</span>
            </div>

            {/* Count + Percentage */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-400">
                {city.subscriber_count.toLocaleString()}
              </span>
              <div className="w-16 text-right">
                <span className="text-xs font-semibold text-[#E8995C]">
                  {city.percentage}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-24 h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden ml-3">
              <div
                className="h-full bg-gradient-to-r from-[#E8995C] to-[#f4a460] rounded-full transition-all duration-500"
                style={{ width: `${city.percentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Footer Note */}
      {statistics.total_cities > statistics.top_cities.length && (
        <p className="text-xs text-gray-500 mt-4 text-center">
          Showing top {statistics.top_cities.length} of {statistics.total_cities} cities
        </p>
      )}
    </div>
  );
}
