import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ProgressEvent } from '../types';

interface Stage {
  name: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  message?: string;
}

export function usePipeline() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [stages, setStages] = useState<Stage[]>([
    { name: 'discovery', status: 'pending' },
    { name: 'crawl', status: 'pending' },
    { name: 'editorial', status: 'pending' },
    { name: 'writing', status: 'pending' },
    { name: 'images', status: 'pending' },
    { name: 'assembly', status: 'pending' },
  ]);
  const [currentEditionId, setCurrentEditionId] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io('http://localhost:3000');

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
    });

    newSocket.on('pipeline:progress', (event: ProgressEvent) => {
      console.log('Pipeline progress:', event);
      setStages((prev) =>
        prev.map((stage) =>
          stage.name === event.stage
            ? { ...stage, status: event.status, message: event.message }
            : stage
        )
      );
    });

    newSocket.on('pipeline:complete', (data: { editionId: string; status: string }) => {
      console.log('Pipeline complete:', data);
      setIsRunning(false);
      setCurrentEditionId(data.editionId);

      // Mark all stages as completed
      setStages((prev) =>
        prev.map((stage) => ({
          ...stage,
          status: 'completed' as const,
        }))
      );
    });

    newSocket.on('pipeline:error', (data: { error: string }) => {
      console.error('Pipeline error:', data);
      setIsRunning(false);
      alert(`Pipeline failed: ${data.error}`);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const execute = useCallback(
    (customTopics?: string[], stylePresetId?: string, includeCityMarkets?: boolean) => {
      if (!socket) {
        console.error('Socket not connected');
        return;
      }

      // Reset stages
      setStages((prev) =>
        prev.map((stage) => ({ ...stage, status: 'pending' as const, message: undefined }))
      );
      setIsRunning(true);
      setCurrentEditionId(null);

      socket.emit('pipeline:execute', { customTopics, stylePresetId, includeCityMarkets });
    },
    [socket]
  );

  return {
    isRunning,
    stages,
    currentEditionId,
    execute,
  };
}
