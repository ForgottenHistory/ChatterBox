import { getMessagesByChannel } from '../services/messageService.js'
import prisma from '../db/client.js'

// Basic route
export const getRoot = (req, res) => {
  res.json({ message: 'ChatterBox Server is running!' })
}

// Get channels
export const getChannels = async (req, res) => {
  try {
    const channels = await prisma.channel.findMany()
    res.json(channels)
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch channels' })
  }
}

// Get messages for a channel
export const getChannelMessages = async (req, res) => {
  try {
    const messages = await getMessagesByChannel(req.params.channelId)
    res.json(messages.reverse()) // Reverse to show oldest first
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
}