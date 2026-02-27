import axios from 'axios';
import type { Source, SourcesConfig, Topic, TopicsConfig, Edition } from '../types';

const API_BASE_URL = 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Sources API
export const sourcesApi = {
  getAll: () => api.get<SourcesConfig>('/sources'),
  create: (source: Omit<Source, 'id' | 'added_at' | 'enabled'>) =>
    api.post<Source>('/sources', source),
  update: (id: number, updates: Partial<Source>) =>
    api.put<Source>(`/sources/${id}`, updates),
  delete: (id: number) => api.delete(`/sources/${id}`),
};

// Topics API
export const topicsApi = {
  getAll: () => api.get<TopicsConfig>('/topics'),
  create: (text: string) => api.post<Topic>('/topics', { text }),
  update: (id: number, updates: Partial<Omit<Topic, 'id' | 'added_at'>>) =>
    api.put<Topic>(`/topics/${id}`, updates),
  delete: (id: number) => api.delete(`/topics/${id}`),
};

// Pipeline API
export const pipelineApi = {
  execute: (customTopics?: string[]) =>
    api.post('/pipeline/execute', { customTopics }),
  getStatus: () => api.get('/pipeline/status'),
};

// Editions API
export const editionsApi = {
  getAll: (limit = 10) => api.get<{ editions: Edition[]; count: number }>('/editions', {
    params: { limit },
  }),
  getById: (id: string) => api.get<Edition>(`/editions/${id}`),
  getHtml: (id: string) => api.get<string>(`/editions/${id}/html`, {
    responseType: 'text',
  }),
  getStageResult: (id: string, stage: string) =>
    api.get(`/editions/${id}/results/${stage}`),
};

// Statistics API
export const statisticsApi = {
  getCities: (limit: number = 10) => api.get('/statistics/cities', { params: { limit } }),
};

// Generation Models API
export const generationModelsApi = {
  getConfig: () => api.get('/generation-models'),
  setActive: (modelId: string) => api.put('/generation-models/active', { model_id: modelId }),
};

export default api;
