import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { createMessage, getMessagesByChannel } from './services/messageService.js'
import { getUserByUsername } from './services/userService.js'
import prisma from './db/client.js'
import usersRouter from './routes/users.js'
import uploadRouter from './routes/upload.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

// Serve static files (avatars)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Routes
app.use('/api', usersRouter)
app.use('/api/upload', uploadRouter)

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'ChatterBox Server is running!' })
})

// Get channels
app.get('/api/channels', async (req, res) => {
  try {
    const channels = await prisma.channel.findMany()
    res.json(channels)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' })
  }
})

// Get messages for a channel
app.get('/api/channels/:channelId/messages', async (req, res) => {
  try {
    const messages = await getMessagesByChannel(req.params.channelId)
    res.json(messages.reverse()) // Reverse to show oldest first
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// Socket.io connection handling
io.on('connection', async (socket) => {
  console.log('User connected:', socket.id)

  // Send existing messages when user connects
  try {
    const generalChannel = await prisma.channel.findFirst({
      where: { name: 'general' }
    })
    
    if (generalChannel) {
      const messages = await getMessagesByChannel(generalChannel.id)
      socket.emit('load_messages', messages.reverse())
    }
  } catch (error) {
    console.error('Error loading messages:', error)
  }

  // Handle message sending
  socket.on('send_message', async (data) => {
    try {
      console.log('Message received:', data)
      
      // For now, create a temporary user if none exists
      let user = await getUserByUsername(data.author)
      if (!user) {
        user = await prisma.user.create({
          data: {
            username: data.author,
            isBot: false
          }
        })
      }

      // Get the general channel
      const generalChannel = await prisma.channel.findFirst({
        where: { name: 'general' }
      })

      // Save message to database
      const savedMessage = await createMessage({
        content: data.content,
        userId: user.id,
        channelId: generalChannel.id
      })

      // Format message for frontend
      const messageToSend = {
        id: savedMessage.id,
        author: savedMessage.user.username,
        avatar: savedMessage.user.avatar,
        content: savedMessage.content,
        timestamp: savedMessage.createdAt.toLocaleTimeString(),
        isBot: savedMessage.user.isBot
      }

      // Broadcast to all clients
      io.emit('new_message', messageToSend)
    } catch (error) {
      console.error('Error saving message:', error)
      socket.emit('error', { message: 'Failed to send message' })
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

const PORT = process.env.PORT || 3001

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})