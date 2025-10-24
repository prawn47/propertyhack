// Fix: Implement the SettingsPanel component to resolve module errors.
import React from 'react';
import type { UserSettings } from '../types';

interface SettingsPanelProps {
  settings: UserSettings;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings }) => {
  return (
    <div className="bg-base-100 p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-content">AI Persona & Strategy</h2>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between">
          <span className="font-medium text-content-secondary">Tone of Voice:</span>
          <span className="text-right text-content">{settings.toneOfVoice}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-content-secondary">Industry:</span>
          <span className="text-right text-content">{settings.industry}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-content-secondary">Position:</span>
          <span className="text-right text-content">{settings.position}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-content-secondary">Audience:</span>
          <span className="text-right text-content line-clamp-1">{settings.audience}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium text-content-secondary">Post Goal:</span>
          <span className="text-right text-content">{settings.postGoal}</span>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;
