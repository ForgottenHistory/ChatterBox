import { useState, useEffect } from 'react';
import { Bot } from '../types';

export const useBots = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapBotData = (bot: any): Bot => ({
    type: 'bot' as const,
    id: bot.id,
    username: bot.username,
    avatar: bot.avatar,
    avatarType: bot.avatarType || 'initials',
    status: bot.status || 'online',
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    personality: 'friendly',
    triggers: [],
    responses: [],
    responseChance: 1.0
  });

  const fetchBots = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('http://localhost:5000/api/bots');
      
      if (response.ok) {
        const botData = await response.json();
        setBots(botData.map(mapBotData));
      } else {
        setError('Failed to fetch bots');
      }
    } catch (error) {
      console.error('Error fetching bots:', error);
      setError('Failed to load bots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  return { bots, loading, error, refetch: fetchBots };
};