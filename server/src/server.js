import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Vite dev server
    methods: ["GET", "POST"]
  }
})

// Middleware
app.use(cors())
app.use(express.json())

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'ChatterBox Server is running!' })
})

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  // Handle message sending
  socket.on('send_message', (data) => {
    console.log('Message received:', data)
    // Broadcast to all clients
    io.emit('new_message', {
      id: Date.now(),
      author: data.author || 'Anonymous',
      content: data.content,
      timestamp: new Date().toLocaleTimeString(),
      isBot: false
    })
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})