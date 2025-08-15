import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seed() {
  try {
    console.log('🌱 Seeding database...')

    // Create default channel
    const generalChannel = await prisma.channel.create({
      data: {
        name: 'general',
        description: 'General discussion'
      }
    })

    console.log('✅ Created general channel')

    // Create some bots
    const chatBotAlpha = await prisma.user.create({
      data: {
        username: 'ChatBot Alpha',
        isBot: true,
        systemPrompt: 'You are a friendly and helpful AI assistant.',
        personality: 'Enthusiastic and encouraging',
        triggerInterval: 5 // 5 minutes
      }
    })

    console.log('✅ Created ChatBot Alpha')

    const chatBotBeta = await prisma.user.create({
      data: {
        username: 'ChatBot Beta',
        isBot: true,
        systemPrompt: 'You are a thoughtful AI that asks interesting questions.',
        personality: 'Curious and philosophical',
        triggerInterval: 7 // 7 minutes
      }
    })

    console.log('✅ Created ChatBot Beta')

    console.log('✅ Database seeded successfully!')
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  }
}

seed()
  .then(() => {
    console.log('Seed completed')
  })
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })