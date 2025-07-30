import { useState, useEffect } from 'react';
import { Bot } from '../types';
import { useApi } from './useApi';

export const useBots = () => {
  const [bots, setBots] = useState<Bot[]>([]);
  const fetchBotsApi = useApi<Bot[]>('/bots', 'GET');

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
    const result = await fetchBotsApi.execute();
    if (result) {
      setBots(result.map(mapBotData));
    }
  };

  useEffect(() => {
    fetchBots();
  }, []);

  // Update bots when API data changes
  useEffect(() => {
    if (fetchBotsApi.data) {
      setBots(fetchBotsApi.data.map(mapBotData));
    }
  }, [fetchBotsApi.data]);

  return { 
    bots, 
    loading: fetchBotsApi.loading, 
    error: fetchBotsApi.error, 
    refetch: fetchBots 
  };
};