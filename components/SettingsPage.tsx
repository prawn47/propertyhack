import React from 'react';
import type { UserSettings } from '../types';

interface SettingsPageProps {
  settings: UserSettings;
  onChange: (newSettings: UserSettings) => void;
  onSave: (savedSettings: UserSettings) => void;
  onBack: () => void;
}

const timezones = [
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const englishVariants = [
    { value: 'American', label: 'American English' },
    { value: 'British', label: 'British English' },
    { value: 'Australian', label: 'Australian English' },
];

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onChange, onSave, onBack }) => {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    onChange({ ...settings, [e.target.name]: e.target.value });
  };

  const handleExampleChange = (index: number, value: string) => {
    const newExamples = [...settings.contentExamples];
    newExamples[index] = value;
    onChange({ ...settings, contentExamples: newExamples });
  };

  const addExample = () => {
    onChange({ ...settings, contentExamples: [...settings.contentExamples, ''] });
  };

  const removeExample = (index: number) => {
    const newExamples = settings.contentExamples.filter((_, i) => i !== index);
    onChange({ ...settings, contentExamples: newExamples });
  };

  return (
    <main className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-fade-in-up">
        <div className="bg-base-100 p-6 sm:p-8 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-content">User Settings</h1>
                <button 
                    onClick={onBack} 
                    className="text-sm font-semibold text-brand-primary hover:text-brand-secondary"
                >
                    &larr; Back to Dashboard
                </button>
            </div>
            
            <div className="space-y-8">
                <fieldset>
                    <legend className="text-lg font-semibold text-content border-b border-base-300 pb-2 mb-4">AI Persona</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="toneOfVoice" className="block text-sm font-medium text-content-secondary">Tone of Voice</label>
                            <input type="text" name="toneOfVoice" id="toneOfVoice" value={settings.toneOfVoice} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="industry" className="block text-sm font-medium text-content-secondary">Industry</label>
                            <input type="text" name="industry" id="industry" value={settings.industry} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                         <div>
                            <label htmlFor="position" className="block text-sm font-medium text-content-secondary">Position</label>
                            <input type="text" name="position" id="position" value={settings.position} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="englishVariant" className="block text-sm font-medium text-content-secondary">Language & Region</label>
                            <select name="englishVariant" id="englishVariant" value={settings.englishVariant} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                                {englishVariants.map(variant => <option key={variant.value} value={variant.value}>{variant.label}</option>)}
                            </select>
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-lg font-semibold text-content border-b border-base-300 pb-2 mb-4">Post Strategy</legend>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="audience" className="block text-sm font-medium text-content-secondary">Target Audience</label>
                            <input type="text" name="audience" id="audience" value={settings.audience} onChange={handleInputChange} placeholder="e.g., C-level executives" className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="postGoal" className="block text-sm font-medium text-content-secondary">Post Goal</label>
                            <input type="text" name="postGoal" id="postGoal" value={settings.postGoal} onChange={handleInputChange} placeholder="e.g., Drive engagement" className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                         <div className="md:col-span-2">
                            <label htmlFor="keywords" className="block text-sm font-medium text-content-secondary">Keywords to include</label>
                            <input type="text" name="keywords" id="keywords" value={settings.keywords} onChange={handleInputChange} placeholder="e.g., AI, SaaS, Go-to-Market" className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                        </div>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-lg font-semibold text-content border-b border-base-300 pb-2 mb-4">Content Examples</legend>
                    <p className="text-sm text-content-secondary mb-4">Provide examples of your writing style. The AI will learn from these to match your voice.</p>
                    <div className="space-y-4">
                        {settings.contentExamples.map((example, index) => (
                            <div key={index} className="flex items-start space-x-2">
                                <textarea
                                    value={example}
                                    onChange={(e) => handleExampleChange(index, e.target.value)}
                                    rows={4}
                                    className="flex-grow mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
                                    placeholder={`Example ${index + 1}`}
                                />
                                <button onClick={() => removeExample(index)} className="mt-1 p-2 text-content-secondary hover:text-red-600 hover:bg-red-100 rounded-full" aria-label={`Remove example ${index + 1}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </div>
                        ))}
                        <button onClick={addExample} className="text-sm font-semibold text-brand-primary hover:text-brand-secondary">
                            + Add another example
                        </button>
                    </div>
                </fieldset>

                <fieldset>
                    <legend className="text-lg font-semibold text-content border-b border-base-300 pb-2 mb-4 pt-2">Preferences</legend>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="timeZone" className="block text-sm font-medium text-content-secondary">Time Zone</label>
                        <select name="timeZone" id="timeZone" value={settings.timeZone} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm">
                        {timezones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="preferredTime" className="block text-sm font-medium text-content-secondary">Preferred Daily Prompt Time</label>
                        <input type="time" name="preferredTime" id="preferredTime" value={settings.preferredTime} onChange={handleInputChange} className="mt-1 block w-full px-3 py-2 bg-base-100 border border-base-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm" />
                    </div>
                    </div>
                </fieldset>
            </div>

            <div className="mt-8 pt-6 border-t border-base-300 flex justify-end">
                <button onClick={() => onSave(settings)} className="px-6 py-2 bg-brand-primary text-white font-semibold rounded-md hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-secondary transition-colors">
                    Save and Close
                </button>
            </div>
        </div>
    </main>
  );
};

export default SettingsPage;