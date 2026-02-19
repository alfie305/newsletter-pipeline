import { useState } from 'react';
import type { Topic } from '../types';

interface TopicPillsProps {
  topics: Topic[];
  onAdd: (text: string) => void;
  onToggle: (id: number, enabled: boolean) => void;
  onDelete: (id: number) => void;
}

export function TopicPills({ topics, onAdd, onToggle, onDelete }: TopicPillsProps) {
  const [newTopicText, setNewTopicText] = useState('');
  const [isAddingTopic, setIsAddingTopic] = useState(false);

  const handleAddTopic = () => {
    if (newTopicText.trim()) {
      onAdd(newTopicText.trim());
      setNewTopicText('');
      setIsAddingTopic(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTopic();
    } else if (e.key === 'Escape') {
      setNewTopicText('');
      setIsAddingTopic(false);
    }
  };

  return (
    <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] mb-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Custom Topics</h3>
        <button
          onClick={() => setIsAddingTopic(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-xl hover:shadow-glow transition-all font-medium"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Topic</span>
        </button>
      </div>

      {isAddingTopic && (
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={newTopicText}
            onChange={(e) => setNewTopicText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="e.g., SpaceX Starship developments"
            className="flex-1 px-4 py-2 bg-[#2a2a2a] border border-[#333333] rounded-xl text-white placeholder-[#6b7280] focus:outline-none focus:border-[#E8995C] transition-colors"
            autoFocus
          />
          <button
            onClick={handleAddTopic}
            disabled={!newTopicText.trim()}
            className="px-4 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-xl font-medium hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Add
          </button>
          <button
            onClick={() => {
              setNewTopicText('');
              setIsAddingTopic(false);
            }}
            className="px-4 py-2 bg-[#2a2a2a] text-[#9ca3af] rounded-xl hover:bg-[#333333] transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {topics.length === 0 ? (
          <div className="text-center py-8 w-full">
            <p className="text-[#6b7280] text-sm">No custom topics yet</p>
            <p className="text-[#9ca3af] text-xs mt-1">Add topics to customize your newsletter discovery</p>
          </div>
        ) : (
          topics.map(topic => (
            <div
              key={topic.id}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full border transition-all cursor-pointer
                ${topic.enabled
                  ? 'bg-gradient-to-r from-[#E8995C]/20 to-[#D4915F]/20 border-[#E8995C] text-white'
                  : 'bg-[#2a2a2a] border-[#333333] text-[#9ca3af]'
                }
                hover:scale-105
              `}
              onClick={() => onToggle(topic.id, !topic.enabled)}
            >
              <span className={`w-2 h-2 rounded-full ${topic.enabled ? 'bg-[#E8995C]' : 'bg-[#6b7280]'}`} />
              <span className="text-sm font-medium">{topic.text}</span>
              {topic.enabled && <span className="text-xs">⚡</span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete topic "${topic.text}"?`)) {
                    onDelete(topic.id);
                  }
                }}
                className="ml-2 text-[#9ca3af] hover:text-[#ef4444] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
