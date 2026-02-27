import { useQuery } from '@tanstack/react-query';
import { statisticsApi } from '../services/api';

export interface CityStats {
  city: string;
  subscriber_count: number;
  percentage: number;
}

export interface CityStatistics {
  total_cities: number;
  total_subscribers: number;
  top_cities: CityStats[];
}

export function useCityStatistics(limit: number = 10) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['city-statistics', limit],
    queryFn: async () => {
      const response = await statisticsApi.getCities(limit);
      return response.data as CityStatistics;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 20000, // Consider stale after 20 seconds
  });

  return {
    statistics: data,
    isLoading,
    error,
    refetch,
  };
}
