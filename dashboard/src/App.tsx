import { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useSources } from './hooks/useSources';
import { useTopics } from './hooks/useTopics';
import { usePipeline } from './hooks/usePipeline';
import { useStylePresets } from './hooks/useStylePresets';
import { Header } from './components/Header';
import { StatusCards } from './components/StatusCards';
import { SourceSegmentCards } from './components/SourceSegmentCards';
import { TopicPills } from './components/TopicPills';
import { PipelineVisualization } from './components/PipelineVisualization';
import { LoadingVisualizations } from './components/LoadingVisualizations';
import { SourcesModal } from './components/SourcesModal';
import { PromptEditor } from './components/PromptEditor';
import { StylePresetsManager } from './components/StylePresetsManager';

const queryClient = new QueryClient();

type View = 'dashboard' | 'prompts' | 'styles';

function Dashboard() {
  const { sources, createSource, updateSource, deleteSource, isLoading: sourcesLoading } = useSources();
  const { topics, createTopic, updateTopic, deleteTopic } = useTopics();
  const { isRunning, stages, currentEditionId, execute } = usePipeline();
  const { activePreset } = useStylePresets();

  const [lastRunTime, setLastRunTime] = useState<string | undefined>(undefined);
  const [isSourcesModalOpen, setIsSourcesModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // Update last run time when pipeline completes
  useEffect(() => {
    if (!isRunning && currentEditionId) {
      setLastRunTime('just now');
    }
  }, [isRunning, currentEditionId]);

  const handleExecute = () => {
    const enabledTopics = topics.filter(t => t.enabled).map(t => t.text);
    execute(
      enabledTopics.length > 0 ? enabledTopics : undefined,
      activePreset?.id
    );
  };

  const handleAddTopic = (text: string) => {
    createTopic(text);
  };

  const handleToggleTopic = (id: number, enabled: boolean) => {
    updateTopic({ id, updates: { enabled } });
  };

  const handleDeleteTopic = (id: number) => {
    deleteTopic(id);
  };

  // Get current stage index and details for loading animation
  const currentStageIndex = stages.findIndex(s => s.status === 'in_progress');
  const currentStage = currentStageIndex >= 0 ? stages[currentStageIndex] : undefined;

  // Calculate pipeline status
  const pipelineStatus = isRunning ? 'running' : stages.some(s => s.status === 'failed') ? 'error' : 'ready';
  const activeSources = sources.filter(s => s.enabled).length;
  const enabledTopics = topics.filter(t => t.enabled).length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header />

      {/* Navigation Tabs */}
      <div className="border-b border-[#2a2a2a]">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex gap-6">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`px-4 py-4 font-medium transition-all border-b-2 ${
                currentView === 'dashboard'
                  ? 'border-[#E8995C] text-white'
                  : 'border-transparent text-[#9ca3af] hover:text-white'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setCurrentView('prompts')}
              className={`px-4 py-4 font-medium transition-all border-b-2 ${
                currentView === 'prompts'
                  ? 'border-[#E8995C] text-white'
                  : 'border-transparent text-[#9ca3af] hover:text-white'
              }`}
            >
              ✨ Prompts
            </button>
            <button
              onClick={() => setCurrentView('styles')}
              className={`px-4 py-4 font-medium transition-all border-b-2 ${
                currentView === 'styles'
                  ? 'border-[#E8995C] text-white'
                  : 'border-transparent text-[#9ca3af] hover:text-white'
              }`}
            >
              🎨 Image Styles
            </button>
          </div>
        </div>
      </div>

      {currentView === 'dashboard' ? (
        <main className="max-w-7xl mx-auto px-8 py-8">
          <StatusCards
            pipelineStatus={pipelineStatus}
            activeSources={activeSources}
            totalSources={sources.length}
            customTopics={enabledTopics}
            lastRun={lastRunTime}
            onSourcesClick={() => setIsSourcesModalOpen(true)}
          />

          <SourceSegmentCards
            sources={sources}
            onSegmentClick={(segment) => {
              if (segment === 'new') {
                // Open modal to add new segment
                setIsSourcesModalOpen(true);
              } else {
                // Open modal filtered to specific segment
                setIsSourcesModalOpen(true);
              }
            }}
          />

          <TopicPills
            topics={topics}
            onAdd={handleAddTopic}
            onToggle={handleToggleTopic}
            onDelete={handleDeleteTopic}
          />

          <PipelineVisualization
            stages={stages}
            isRunning={isRunning}
            currentEditionId={currentEditionId}
            onExecute={handleExecute}
          />
        </main>
      ) : currentView === 'prompts' ? (
        <PromptEditor />
      ) : (
        <StylePresetsManager />
      )}

      <SourcesModal
        isOpen={isSourcesModalOpen}
        onClose={() => setIsSourcesModalOpen(false)}
        sources={sources}
        onCreate={createSource}
        onUpdate={updateSource}
        onDelete={deleteSource}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Dashboard />
    </QueryClientProvider>
  );
}

export default App;
