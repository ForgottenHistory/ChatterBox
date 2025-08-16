import prisma from '../db/client.js'

export const getLLMSettings = async () => {
  // Get the first (and only) LLM settings record
  let settings = await prisma.lLMSetting.findFirst()
  
  // If no settings exist, create default ones
  if (!settings) {
    settings = await prisma.lLMSetting.create({
      data: {} // Uses default values from schema
    })
  }
  
  return settings
}

export const updateLLMSettings = async (settingsData) => {
  try {
    // Handle model data serialization
    const dataToSave = { ...settingsData }
    
    if (settingsData.model && typeof settingsData.model === 'object') {
      dataToSave.model_id = settingsData.model.id
      dataToSave.model_data = JSON.stringify(settingsData.model)
      delete dataToSave.model // Remove the object, keep serialized version
    }
    
    console.log('Saving LLM settings:', dataToSave)
    
    // Get existing settings or create if none exist
    let existingSettings = await prisma.lLMSetting.findFirst()
    
    if (existingSettings) {
      // Update existing settings
      return await prisma.lLMSetting.update({
        where: { id: existingSettings.id },
        data: dataToSave
      })
    } else {
      // Create new settings
      return await prisma.lLMSetting.create({
        data: dataToSave
      })
    }
  } catch (error) {
    console.error('Error in updateLLMSettings:', error)
    throw error
  }
}

export const getFormattedLLMSettings = async () => {
  const settings = await getLLMSettings()
  
  // Parse model data if it exists
  let model = null
  if (settings.model_data) {
    try {
      model = JSON.parse(settings.model_data)
    } catch (error) {
      console.warn('Failed to parse model data:', error)
    }
  }
  
  // Return only the settings data without metadata
  return {
    provider: settings.provider,
    model,
    system_prompt: settings.system_prompt,
    temperature: settings.temperature,
    top_p: settings.top_p,
    top_k: settings.top_k,
    frequency_penalty: settings.frequency_penalty,
    presence_penalty: settings.presence_penalty,
    repetition_penalty: settings.repetition_penalty,
    min_p: settings.min_p
  }
}