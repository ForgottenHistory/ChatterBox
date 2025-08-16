import prisma from '../db/client.js'

export const getTemplateSettings = async () => {
  // Get the first (and only) template settings record
  let settings = await prisma.templateSettings.findFirst()
  
  // If no settings exist, create default ones
  if (!settings) {
    settings = await prisma.templateSettings.create({
      data: {} // Uses default values from schema
    })
  }
  
  return settings
}

export const updateTemplateSettings = async (settingsData) => {
  try {
    console.log('Saving template settings:', settingsData)
    
    // Get existing settings or create if none exist
    let existingSettings = await prisma.templateSettings.findFirst()
    
    if (existingSettings) {
      // Update existing settings
      return await prisma.templateSettings.update({
        where: { id: existingSettings.id },
        data: settingsData
      })
    } else {
      // Create new settings
      return await prisma.templateSettings.create({
        data: settingsData
      })
    }
  } catch (error) {
    console.error('Error in updateTemplateSettings:', error)
    throw error
  }
}

export const getFormattedTemplateSettings = async () => {
  const settings = await getTemplateSettings()
  
  // Return only the settings data without metadata
  return {
    prompt_template: settings.prompt_template
  }
}