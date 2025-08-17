import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupMiddleware } from './config/middleware.js'
import { setupRoutes } from './config/routes.js'
import { handleConnection } from './handlers/socketHandler.js'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"]
  }
})

// Setup middleware
setupMiddleware(app)

// Setup routes
setupRoutes(app)

// Socket.io connection handling
io.on('connection', (socket) => handleConnection(socket, io))

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})