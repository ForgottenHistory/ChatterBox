import TemplateVariables from './TemplateVariables'

function TemplateVariablesTab({ settingsHook, onClose }) {
  const { 
    templateSettings, 
    setTemplateSettings, 
    saveTemplateSettings, 
    loading,
    scrollToTop 
  } = settingsHook

  const handleSave = async () => {
    const success = await saveTemplateSettings()
    if (success) {
      scrollToTop()
    }
  }

  return (
    <TemplateVariables
      settings={templateSettings}
      onSettingsChange={setTemplateSettings}
      onSave={handleSave}
      loading={loading}
    />
  )
}

export default TemplateVariablesTab