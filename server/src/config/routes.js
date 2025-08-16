import usersRouter from '../routes/users.js'
import uploadRouter from '../routes/upload.js'
import settingsRouter from '../routes/settings.js'
import { getRoot, getChannels, getChannelMessages } from '../handlers/apiHandler.js'

export const setupRoutes = (app) => {
  // Basic routes
  app.get('/', getRoot)
  app.get('/api/channels', getChannels)
  app.get('/api/channels/:channelId/messages', getChannelMessages)

  // Module routes
  app.use('/api', usersRouter)
  app.use('/api/upload', uploadRouter)
  app.use('/api/settings', settingsRouter)
}