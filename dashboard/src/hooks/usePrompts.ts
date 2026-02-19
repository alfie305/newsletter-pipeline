import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { PromptsData } from '../types';

const API_URL = 'http://localhost:3000/api/prompts';

export function usePrompts() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['prompts'],
    queryFn: async () => {
      const response = await axios.get<PromptsData>(API_URL);
      return response.data.prompts;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const response = await axios.put(`${API_URL}/${name}`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });

  return {
    prompts: data || {},
    isLoading,
    error,
    updatePrompt: (name: string, content: string) =>
      updateMutation.mutateAsync({ name, content }),
    isUpdating: updateMutation.isPending,
  };
}
