import { useState } from 'react';
import { useStylePresets } from '../hooks/useStylePresets';
import { useGenerationModels } from '../hooks/useGenerationModels';

export function StylePresetsManager() {
  const { presets, activePreset, setActive, create, uploadImage, deleteImage, delete: deletePreset } = useStylePresets();
  const { activeModel, availableModels, setActive: setActiveModel } = useGenerationModels();
  const [isCreating, setIsCreating] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'standard': return '#10b981'; // green
      case 'pro': return '#3b82f6';      // blue
      case 'premium': return '#a855f7';  // purple
      default: return '#6b7280';
    }
  };

  const handleCreate = async () => {
    if (!newPresetName.trim()) return;
    await create({ name: newPresetName, description: newPresetDesc });
    setIsCreating(false);
    setNewPresetName('');
    setNewPresetDesc('');
  };

  const handleFileUpload = async (presetId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await uploadImage({ presetId, file });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-8 py-8">
      {/* Generation Model Selector */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="text-lg font-semibold text-white">Image Generation Model</h3>
            <p className="text-sm text-gray-400">
              Choose the AI model for generating newsletter section images
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {availableModels.map((model) => (
            <button
              key={model.id}
              onClick={() => setActiveModel(model.id)}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                activeModel === model.id
                  ? 'border-[#E8995C] bg-[#E8995C]/10'
                  : 'border-[#2a2a2a] bg-[#0a0a0a] hover:border-[#E8995C]/50'
              }`}
            >
              {/* Header Row */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{activeModel === model.id ? '✓' : '○'}</span>
                  <div>
                    <h4 className="font-semibold text-white">{model.name}</h4>
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${getTierColor(model.tier)}20`,
                        color: getTierColor(model.tier),
                      }}
                    >
                      {model.tier.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#E8995C]">
                    {model.pricing.image_output}
                  </p>
                  <p className="text-xs text-gray-500">per image</p>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-400 mb-2 ml-8">{model.description}</p>

              {/* Pricing Details */}
              <div className="flex gap-4 text-xs text-gray-500 ml-8">
                <span>Input: {model.pricing.text_input}</span>
                <span>Output: {model.pricing.text_output}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Image Style Presets</h1>
        <p className="text-[#9ca3af]">
          Upload reference images to maintain consistent visual styling across all newsletter images
        </p>
      </div>

      {/* Create New Preset Button */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          className="mb-6 px-4 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-xl font-medium hover:shadow-glow transition-all"
        >
          + Create New Style Preset
        </button>
      ) : (
        <div className="bg-[#1a1a1a] rounded-2xl p-6 border border-[#2a2a2a] mb-6">
          <h3 className="text-white font-semibold mb-4">Create New Style Preset</h3>
          <input
            placeholder="Preset name (e.g., Professional Real Estate)"
            value={newPresetName}
            onChange={e => setNewPresetName(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white mb-3 focus:outline-none focus:border-[#E8995C]"
          />
          <textarea
            placeholder="Description (optional)"
            value={newPresetDesc}
            onChange={e => setNewPresetDesc(e.target.value)}
            className="w-full px-4 py-2 bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg text-white mb-3 focus:outline-none focus:border-[#E8995C]"
            rows={2}
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={!newPresetName.trim()}
              className="px-4 py-2 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-lg disabled:opacity-50"
            >
              Create
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#333333]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Presets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {presets.map(preset => (
          <div
            key={preset.id}
            className={`bg-[#1a1a1a] rounded-2xl p-6 border transition-all ${
              activePreset?.id === preset.id
                ? 'border-[#E8995C] shadow-glow'
                : 'border-[#2a2a2a] hover:border-[#333333]'
            }`}
          >
            {/* Preset Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-white">{preset.name}</h3>
                  {activePreset?.id === preset.id && (
                    <span className="text-xs px-2 py-0.5 bg-[#E8995C] text-white rounded-full">
                      Active
                    </span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-sm text-[#9ca3af]">{preset.description}</p>
                )}
              </div>
              <button
                onClick={() => deletePreset(preset.id)}
                className="text-[#6b7280] hover:text-[#ef4444] transition-colors"
                title="Delete preset"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Style Description */}
            {preset.style_description && (
              <div className="bg-[#0a0a0a] rounded-lg p-3 mb-4">
                <p className="text-xs text-[#6b7280] mb-1">AI-Analyzed Style:</p>
                <p className="text-sm text-[#9ca3af] italic">{preset.style_description}</p>
              </div>
            )}

            {/* Reference Images */}
            <div className="mb-4">
              <p className="text-xs text-[#6b7280] mb-2">Reference Images ({preset.reference_images.length}/3):</p>
              <div className="grid grid-cols-3 gap-2">
                {preset.reference_images.map((img, index) => (
                  <div key={index} className="relative group aspect-video bg-[#0a0a0a] rounded-lg overflow-hidden">
                    <img
                      src={`http://localhost:3000/data/${img}`}
                      alt={`Reference ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => deleteImage({ presetId: preset.id, imageIndex: index })}
                      className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                    >
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                {preset.reference_images.length < 3 && (
                  <label className="aspect-video bg-[#0a0a0a] border-2 border-dashed border-[#2a2a2a] hover:border-[#E8995C] rounded-lg cursor-pointer flex items-center justify-center transition-colors">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => handleFileUpload(preset.id, e)}
                      className="hidden"
                    />
                    <svg className="w-8 h-8 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </label>
                )}
              </div>
            </div>

            {/* Set Active Button */}
            {activePreset?.id !== preset.id && (
              <button
                onClick={() => setActive(preset.id)}
                disabled={preset.reference_images.length === 0}
                className="w-full px-4 py-2 bg-[#2a2a2a] text-white rounded-lg font-medium hover:bg-[#333333] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Set as Active Style
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Empty State */}
      {presets.length === 0 && !isCreating && (
        <div className="bg-[#1a1a1a] rounded-2xl p-12 border border-[#2a2a2a] text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#E8995C] to-[#D4915F] flex items-center justify-center text-3xl">
            🎨
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No Style Presets Yet</h3>
          <p className="text-[#9ca3af] mb-6">
            Create your first style preset by uploading reference images to maintain consistent visual styling
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-6 py-3 bg-gradient-to-r from-[#E8995C] to-[#D4915F] text-white rounded-xl font-medium hover:shadow-glow transition-all"
          >
            Create First Preset
          </button>
        </div>
      )}
    </div>
  );
}
