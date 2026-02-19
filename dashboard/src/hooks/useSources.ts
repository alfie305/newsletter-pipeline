import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sourcesApi } from '../services/api';
import type { Source } from '../types';

export function useSources() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => {
      const response = await sourcesApi.getAll();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (source: Omit<Source, 'id' | 'added_at' | 'enabled'>) =>
      sourcesApi.create(source),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Source> }) =>
      sourcesApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => sourcesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources'] });
    },
  });

  return {
    sources: data?.sources || [],
    categories: data?.categories || [],
    isLoading,
    error,
    createSource: createMutation.mutate,
    updateSource: updateMutation.mutate,
    deleteSource: deleteMutation.mutate,
  };
}
