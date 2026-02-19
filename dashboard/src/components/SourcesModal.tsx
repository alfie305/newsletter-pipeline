import { useState } from 'react';
import type { Source } from '../types';

interface SourcesModalProps {
  isOpen: boolean;
  onClose: () => void;
  sources: Source[];
  onUpdate: (updates: { id: number; updates: Partial<Source> }) => void;
  onDelete: (id: number) => void;
  onCreate: (source: Omit<Source, 'id' | 'added_at'>) => void;
}

interface AddSourceFormProps {
  onSubmit: (source: Omit<Source, 'id' | 'added_at'>) => void;
  onCancel: () => void;
}

function AddSourceForm({ onSubmit, onCancel }: AddSourceFormProps) {
  const [form, setForm] = useState({
    name: '',
    url: '',
    type: 'RSS' as 'RSS' | 'Web' | 'API',
    category: '',
    segment: 'Real Estate',
    enabled: true,
    notes: ''
  });

  const handleSubmit = () => {
    if (form.name.trim() && form.url.trim() && form.category.trim() && form.segment.trim()) {
      onSubmit(form);
    }
  };

  return (
    <div className="bg-[#2a2a2a] rounded-xl p-4 mb-4">
      <h3 className="text-white font-semibold mb-3">Add New Source</h3>
      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Name (e.g., Redfin)"
          value={form.name}
          onChange={e => setForm({...form, name: e.target.value})}
          className="px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:border-[#E8995C]"
        />
        <input
          placeholder="URL"
          value={form.url}
          onChange={e => setForm({...form, url: e.target.value})}
          className="px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:border-[#E8995C]"
        />
        <select
          value={form.type}
          onChange={e => setForm({...form, type: e.target.value as 'RSS' | 'Web' | 'API'})}
          className="px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:border-[#E8995C]"
        >
          <option value="RSS">RSS</option>
          <option value="Web">Web</option>
          <option value="API">API</option>
        </select>
        <input
          placeholder="Category (e.g., Market Research)"
          value={form.category}
          onChange={e => setForm({...form, category: e.target.value})}
          className="px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:border-[#E8995C]"
        />
        <select
          value={form.segment}
          onChange={e => setForm({...form, segment: e.target.value})}
          className="px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white focus:outline-none focus:border-[#E8995C]"
        >
          <option value="Real Estate">🏠 Real Estate</option>
          <option value="AI News">🤖 AI News</option>
        </select>
        <input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={e => setForm({...form, notes: e.target.value})}
          className="px-3 py-2 bg-[#333333] border border-[#444444] rounded-lg text-white placeholder-[#6b7280] focus:outline-none focus:border-[#E8995C]"
        />
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={handleSubmit}
          disabled={!form.name.trim() || !form.url.trim() || !form.category.trim() || !form.segment.trim()}
          className="px-4 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-lg font-medium hover:shadow-glow disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          Add Source
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-[#333333] text-white rounded-lg font-medium hover:bg-[#444444] transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SourcesModal({ isOpen, onClose, sources, onUpdate, onDelete, onCreate }: SourcesModalProps) {
  const [isAddingSource, setIsAddingSource] = useState(false);
  const [segmentFilter, setSegmentFilter] = useState<string>('all');

  if (!isOpen) return null;

  // Get unique segments
  const segments = Array.from(new Set(sources.map(s => s.segment || 'Other')));

  // Filter sources by segment
  const filteredSources = segmentFilter === 'all'
    ? sources
    : sources.filter(s => s.segment === segmentFilter);

  const handleCreate = (source: Omit<Source, 'id' | 'added_at'>) => {
    onCreate(source);
    setIsAddingSource(false);
  };

  const handleDelete = (source: Source) => {
    if (confirm(`Delete source "${source.name}"?\n\nThis will remove it from your pipeline configuration.`)) {
      onDelete(source.id);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#1a1a1a] rounded-2xl p-8 border border-[#2a2a2a] max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white">Manage Sources</h2>
            <p className="text-sm text-[#9ca3af] mt-1">
              Add, edit, or remove news sources for pipeline discovery
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Segment Filter Tabs */}
        <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setSegmentFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              segmentFilter === 'all'
                ? 'bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white'
                : 'bg-[#2a2a2a] text-[#9ca3af] hover:bg-[#333333]'
            }`}
          >
            All Sources ({sources.length})
          </button>
          {segments.map(segment => {
            const count = sources.filter(s => s.segment === segment).length;
            const icon = segment === 'Real Estate' ? '🏠' : segment === 'AI News' ? '🤖' : '📰';
            return (
              <button
                key={segment}
                onClick={() => setSegmentFilter(segment)}
                className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                  segmentFilter === segment
                    ? 'bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white'
                    : 'bg-[#2a2a2a] text-[#9ca3af] hover:bg-[#333333]'
                }`}
              >
                <span>{icon}</span>
                {segment} ({count})
              </button>
            );
          })}
        </div>

        {/* Add Source Button */}
        {!isAddingSource && (
          <button
            onClick={() => setIsAddingSource(true)}
            className="mb-4 px-4 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-xl font-medium hover:shadow-glow transition-all flex items-center gap-2 self-start"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Source
          </button>
        )}

        {/* Add Source Form */}
        {isAddingSource && (
          <AddSourceForm
            onSubmit={handleCreate}
            onCancel={() => setIsAddingSource(false)}
          />
        )}

        {/* Sources List */}
        <div className="flex-1 overflow-y-auto">
          {filteredSources.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[#6b7280] mb-2">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-[#9ca3af] font-medium">
                {segmentFilter === 'all' ? 'No sources configured' : `No sources in ${segmentFilter}`}
              </p>
              <p className="text-[#6b7280] text-sm mt-1">
                {segmentFilter === 'all' ? 'Add your first source to get started' : 'Add sources to this segment'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSources.map(source => (
                <div
                  key={source.id}
                  className="bg-[#2a2a2a] rounded-xl p-4 flex items-start justify-between hover:bg-[#333333] transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium text-white">{source.name}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#10b981]/20 text-[#10b981] rounded border border-[#10b981]/30 flex items-center gap-1">
                        {source.segment === 'Real Estate' && '🏠'}
                        {source.segment === 'AI News' && '🤖'}
                        {source.segment}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-[#E8995C]/20 text-[#E8995C] rounded border border-[#E8995C]/30">
                        {source.category}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-[#B8B8B8]/20 text-[#B8B8B8] rounded border border-[#B8B8B8]/30">
                        {source.type}
                      </span>
                    </div>
                    <div className="text-sm text-[#9ca3af] break-all">{source.url}</div>
                    {source.notes && (
                      <div className="text-xs text-[#6b7280] mt-1 italic">{source.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={source.enabled}
                        onChange={(e) => onUpdate({ id: source.id, updates: { enabled: e.target.checked } })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-[#333333] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-[#E8995C] peer-checked:to-[#D4915F]"></div>
                    </label>
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(source)}
                      className="text-[#9ca3af] hover:text-[#ef4444] transition-colors"
                      title="Delete source"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
