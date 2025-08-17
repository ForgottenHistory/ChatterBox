import cors from 'cors'
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const setupMiddleware = (app) => {
  // Basic middleware
  app.use(cors())
  app.use(express.json())

  // Serve static files (avatars)
  app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))
}