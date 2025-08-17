import { useState, useRef } from 'react'
import Button from '../ui/Button'
import ErrorMessage from '../ui/ErrorMessage'
import LoadingSpinner from '../ui/LoadingSpinner'
import LLMParametersTab from './LLMParametersTab'
import TemplateVariablesTab from './TemplateVariablesTab'
import { useSettings } from '../../hooks/useSettings'

function SettingsModal({ onClose }) {
  const scrollRef = useRef(null)
  const [activeTab, setActiveTab] = useState('parameters')
  const settingsHook = useSettings()

  const scrollToTop = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0
    }
  }

  // Pass scrollToTop to child components that might need it
  const enhancedSettingsHook = {
    ...settingsHook,
    scrollToTop
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div ref={scrollRef} className="bg-[#2F3136] rounded-lg p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-[#FFFFFF] text-xl font-bold">LLM Settings</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#40444B] mb-6">
          <button
            onClick={() => setActiveTab('parameters')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'parameters'
                ? 'border-[#5865F2] text-[#FFFFFF]'
                : 'border-transparent text-[#B9BBBE] hover:text-[#FFFFFF]'
            }`}
          >
            LLM Parameters
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'templates'
                ? 'border-[#5865F2] text-[#FFFFFF]'
                : 'border-transparent text-[#B9BBBE] hover:text-[#FFFFFF]'
            }`}
          >
            Template Variables
          </button>
        </div>

        {/* Global Loading/Error Messages */}
        {settingsHook.loading && (
          <div className="mb-4">
            <LoadingSpinner text="Saving settings..." />
          </div>
        )}

        <ErrorMessage message={settingsHook.error} className="mb-4" />
        
        {settingsHook.saveSuccess && (
          <div className="bg-[#57F287] text-black p-3 rounded-lg text-sm mb-4">
            Settings saved successfully!
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'parameters' && (
          <LLMParametersTab 
            settingsHook={enhancedSettingsHook}
            onClose={onClose}
          />
        )}

        {activeTab === 'templates' && (
          <TemplateVariablesTab 
            settingsHook={enhancedSettingsHook}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  )
}

export default SettingsModal