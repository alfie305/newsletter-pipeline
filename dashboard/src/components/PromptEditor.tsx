import { useState } from 'react';
import { usePrompts } from '../hooks/usePrompts';

const PROMPT_INFO = {
  discovery: {
    title: 'Discovery Prompt',
    description: 'Perplexity Sonar search instructions for finding news stories',
    icon: '🔍',
    stage: 'Stage 1',
  },
  editorial: {
    title: 'Editorial Prompt',
    description: 'Claude instructions for curating and ranking stories',
    icon: '✍️',
    stage: 'Stage 3',
  },
  writing: {
    title: 'Writing Prompt',
    description: 'Claude Opus instructions for writing newsletter content',
    icon: '📝',
    stage: 'Stage 4',
  },
  image: {
    title: 'Image Prompt',
    description: 'Nano Banana (Gemini) instructions for generating images',
    icon: '🎨',
    stage: 'Stage 5',
  },
};

interface PromptCardProps {
  name: string;
  content: string;
  onSave: (name: string, content: string) => Promise<void>;
  isUpdating: boolean;
}

function PromptCard({ name, content, onSave, isUpdating }: PromptCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);
  const [isSaving, setIsSaving] = useState(false);

  const info = PROMPT_INFO[name as keyof typeof PROMPT_INFO];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(name, editedContent);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      alert('Failed to save prompt. Check console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] hover:border-[#E8995C] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8995C] to-[#D4915F] flex items-center justify-center text-2xl shadow-glow">
            {info.icon}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-white">{info.title}</h3>
              <span className="text-xs px-2 py-0.5 bg-[#2a2a2a] text-[#9ca3af] rounded-full">
                {info.stage}
              </span>
            </div>
            <p className="text-sm text-[#9ca3af]">{info.description}</p>
          </div>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#333333] transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full h-96 px-4 py-3 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl text-white font-mono text-sm focus:outline-none focus:border-[#E8995C] resize-none"
            spellCheck={false}
          />
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSave}
              disabled={isSaving || isUpdating}
              className="px-6 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-lg font-medium hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-6 py-2 bg-[#2a2a2a] text-white rounded-lg font-medium hover:bg-[#333333] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#2a2a2a]">
          <pre className="text-sm text-[#9ca3af] font-mono whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
            {content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function PromptEditor() {
  const { prompts, isLoading, updatePrompt, isUpdating } = usePrompts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#E8995C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9ca3af]">Loading prompts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Prompt Management</h1>
        <p className="text-[#9ca3af]">
          Edit AI prompts for each pipeline stage. Changes take effect on the next pipeline run.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-[#f59e0b]/10 border border-[#f59e0b]/30 rounded-xl p-4 mb-8 flex items-start gap-3">
        <svg className="w-6 h-6 text-[#f59e0b] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="text-[#f59e0b] font-semibold mb-1">Important</h3>
          <p className="text-[#9ca3af] text-sm">
            These prompts control how AI generates your newsletter. Make sure you understand the format requirements before editing. Changes are saved immediately to disk.
          </p>
        </div>
      </div>

      {/* Prompt Cards */}
      <div className="space-y-6">
        {Object.entries(prompts).map(([name, content]) => (
          <PromptCard
            key={name}
            name={name}
            content={content}
            onSave={updatePrompt}
            isUpdating={isUpdating}
          />
        ))}
      </div>
    </div>
  );
}
