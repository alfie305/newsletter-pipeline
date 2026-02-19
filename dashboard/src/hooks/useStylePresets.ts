import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { StylePreset } from '../types';

const API_URL = 'http://localhost:3000/api/style-presets';

export function useStylePresets() {
  const queryClient = useQueryClient();

  const { data: presets, isLoading } = useQuery({
    queryKey: ['style-presets'],
    queryFn: async () => {
      const response = await axios.get<{ presets: StylePreset[] }>(API_URL);
      return response.data.presets;
    },
  });

  const { data: activePreset } = useQuery({
    queryKey: ['style-presets', 'active'],
    queryFn: async () => {
      const response = await axios.get<{ preset: StylePreset | null }>(`${API_URL}/active`);
      return response.data.preset;
    },
  });

  const setActiveMutation = useMutation({
    mutationFn: async (presetId: string) => {
      await axios.put(`${API_URL}/active`, { preset_id: presetId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const response = await axios.post(API_URL, data);
      return response.data.preset;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] });
    },
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ presetId, file }: { presetId: string; file: File }) => {
      const formData = new FormData();
      formData.append('image', file);
      await axios.post(`${API_URL}/${presetId}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] });
    },
  });

  const deleteImageMutation = useMutation({
    mutationFn: async ({ presetId, imageIndex }: { presetId: string; imageIndex: number }) => {
      await axios.delete(`${API_URL}/${presetId}/images/${imageIndex}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (presetId: string) => {
      await axios.delete(`${API_URL}/${presetId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['style-presets'] });
    },
  });

  return {
    presets: presets || [],
    activePreset,
    isLoading,
    setActive: setActiveMutation.mutateAsync,
    create: createMutation.mutateAsync,
    uploadImage: uploadImageMutation.mutateAsync,
    deleteImage: deleteImageMutation.mutateAsync,
    delete: deleteMutation.mutateAsync,
  };
}
