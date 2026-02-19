import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { topicsApi } from '../services/api';
import type { Topic } from '../types';

export function useTopics() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['topics'],
    queryFn: async () => {
      const response = await topicsApi.getAll();
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (text: string) => topicsApi.create(text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<Omit<Topic, 'id' | 'added_at'>> }) =>
      topicsApi.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => topicsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] });
    },
  });

  return {
    topics: data?.topics || [],
    isLoading,
    error,
    createTopic: createMutation.mutate,
    updateTopic: updateMutation.mutate,
    deleteTopic: deleteMutation.mutate,
  };
}
