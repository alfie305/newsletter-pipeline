import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { generationModelsApi } from '../services/api';

export interface GenerationModelOption {
  id: string;
  name: string;
  description: string;
  pricing: {
    text_input: string;
    text_output: string;
    image_output: string;
  };
  tier: 'standard' | 'pro' | 'premium';
}

export interface GenerationModelsConfig {
  active_model: string;
  available_models: GenerationModelOption[];
  last_updated: string;
}

export function useGenerationModels() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['generation-models'],
    queryFn: async () => {
      const response = await generationModelsApi.getConfig();
      return response.data as GenerationModelsConfig;
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: (modelId: string) => generationModelsApi.setActive(modelId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['generation-models'] });
    },
  });

  return {
    config: data,
    activeModel: data?.active_model,
    availableModels: data?.available_models || [],
    isLoading,
    error,
    setActive: setActiveMutation.mutate,
    setActiveAsync: setActiveMutation.mutateAsync,
  };
}
