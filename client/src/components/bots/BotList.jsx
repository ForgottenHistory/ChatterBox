import { useState, useEffect } from 'react'
import { useBot } from '../../contexts/BotContext'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

function BotList() {
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const { refreshTrigger } = useBot()

  useEffect(() => {
    fetchBots()
  }, [refreshTrigger]) // Refresh when trigger changes

  const fetchBots = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/bots')
      if (response.ok) {
        const botsData = await response.json()
        setBots(botsData)
      }
    } catch (error) {
      console.error('Failed to fetch bots:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-2">
        <div className="text-[#8E9297] text-xs font-semibold uppercase mb-2 px-2">
          AI Bots
        </div>
        <div className="text-[#72767D] text-sm px-2">Loading...</div>
      </div>
    )
  }

  return (
    <div className="p-2">
      <div className="text-[#8E9297] text-xs font-semibold uppercase mb-2 px-2 flex items-center justify-between">
        <span>AI Bots ({bots.length})</span>
      </div>
      
      {bots.length === 0 ? (
        <div className="text-[#72767D] text-sm px-2">No bots created yet</div>
      ) : (
        <div className="space-y-1">
          {bots.map(bot => (
            <div 
              key={bot.id}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#40444B] cursor-pointer group"
            >
              <Avatar 
                name={bot.username}
                avatar={bot.avatar}
                isBot={true}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[#B9BBBE] group-hover:text-[#FFFFFF] text-sm truncate">
                    {bot.username}
                  </span>
                  <Badge variant="bot" size="xs">BOT</Badge>
                </div>
                {bot.isActive ? (
                  <div className="text-[#57F287] text-xs">Active</div>
                ) : (
                  <div className="text-[#72767D] text-xs">Inactive</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BotList