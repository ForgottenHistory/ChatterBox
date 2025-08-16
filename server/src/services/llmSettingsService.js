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
  // Get existing settings or create if none exist
  let existingSettings = await prisma.lLMSetting.findFirst()
  
  if (existingSettings) {
    // Update existing settings
    return await prisma.lLMSetting.update({
      where: { id: existingSettings.id },
      data: settingsData
    })
  } else {
    // Create new settings
    return await prisma.lLMSetting.create({
      data: settingsData
    })
  }
}

export const getFormattedLLMSettings = async () => {
  const settings = await getLLMSettings()
  
  // Return only the settings data without metadata
  return {
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