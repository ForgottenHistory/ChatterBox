import express from 'express'
import { createUser, createBot, getUserById, getAllBots, updateUser } from '../services/userService.js'
import prisma from '../db/client.js'

const router = express.Router()

// Create human user
router.post('/users', async (req, res) => {
  try {
    const { username, email, password, avatar, bio } = req.body
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' })
    }

    const userData = {
      username,
      email: email || null,
      password: password || null, // Will hash later when we add auth
      avatar: avatar || null,
      bio: bio || null,
      isBot: false,
      isOnline: true
    }

    const user = await createUser(userData)
    res.status(201).json({ 
      id: user.id, 
      username: user.username, 
      avatar: user.avatar,
      bio: user.bio,
      isBot: user.isBot,
      isOnline: user.isOnline 
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Username already exists' })
    }
    res.status(500).json({ error: 'Failed to create user' })
  }
})

// Create bot
router.post('/bots', async (req, res) => {
  try {
    const { 
      username, 
      avatar, 
      bio,
      systemPrompt, 
      personality, 
      triggerInterval,
      creator_notes,
      tags,
      creator,
      character_version
    } = req.body
    
    if (!username) {
      return res.status(400).json({ error: 'Bot username is required' })
    }

    const botData = {
      username,
      avatar: avatar || null,
      bio: bio || null,
      systemPrompt: systemPrompt || 'You are a helpful AI assistant.',
      personality: personality || null,
      triggerInterval: triggerInterval || 10, // Default 10 minutes
      isBot: true,
      isActive: true,
      isOnline: true
    }

    const bot = await createBot(botData)
    res.status(201).json({
      id: bot.id,
      username: bot.username,
      avatar: bot.avatar,
      bio: bot.bio,
      systemPrompt: bot.systemPrompt,
      personality: bot.personality,
      triggerInterval: bot.triggerInterval,
      isBot: bot.isBot,
      isActive: bot.isActive,
      isOnline: bot.isOnline
    })
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Bot username already exists' })
    }
    res.status(500).json({ error: 'Failed to create bot' })
  }
})

// Get all users (humans and bots)
router.get('/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        isBot: true,
        isOnline: true,
        isActive: true,
        createdAt: true
      }
    })
    res.json(users)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// Get all bots only
router.get('/bots', async (req, res) => {
  try {
    const bots = await getAllBots()
    res.json(bots.map(bot => ({
      id: bot.id,
      username: bot.username,
      avatar: bot.avatar,
      bio: bot.bio,
      systemPrompt: bot.systemPrompt,
      personality: bot.personality,
      triggerInterval: bot.triggerInterval,
      isActive: bot.isActive,
      isOnline: bot.isOnline,
      lastMessageAt: bot.lastMessageAt
    })))
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bots' })
  }
})

// Update user/bot
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updateData = req.body

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.id
    delete updateData.createdAt
    delete updateData.updatedAt

    const updatedUser = await updateUser(id, updateData)
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      avatar: updatedUser.avatar,
      bio: updatedUser.bio,
      isBot: updatedUser.isBot,
      isOnline: updatedUser.isOnline,
      isActive: updatedUser.isActive
    })
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' })
  }
})

export default router