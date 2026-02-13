
import { ApiResponse, PredictionResponse, Fixture } from '../types';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const FOOTBALL_API_KEY = 'ea7e8a05b9a488c38470487ae51ef460';

const getHeaders = () => ({
  'x-apisports-key': FOOTBALL_API_KEY,
  'Accept': 'application/json',
});

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const cache = {
  get: <T>(key: string): T | null => {
    const itemStr = localStorage.getItem(key);
    if (!itemStr) return null;
    try {
      const item = JSON.parse(itemStr) as CacheItem<T>;
      const now = new Date();
      
      // Calculate the most recent 6:00 UTC refresh point
      const lastRefresh = new Date(now);
      lastRefresh.setUTCHours(6, 0, 0, 0);
      
      // If current time is before 6:00 UTC today, the relevant refresh was yesterday at 6:00 UTC
      if (now.getUTCHours() < 6) {
        lastRefresh.setUTCDate(lastRefresh.getUTCDate() - 1);
      }

      // If data was cached BEFORE the last 6:00 UTC refresh, invalidate it
      if (item.timestamp < lastRefresh.getTime()) {
        localStorage.removeItem(key);
        return null;
      }
      return item.data;
    } catch {
      return null;
    }
  },
  set: <T>(key: string, data: T): void => {
    const item: CacheItem<T> = {
      data,
      timestamp: new Date().getTime(),
    };
    localStorage.setItem(key, JSON.stringify(item));
  }
};

export async function getPredictions(fixtureId: number): Promise<PredictionResponse | null> {
  const cacheKey = `pred_${fixtureId}`;
  const cachedData = cache.get<PredictionResponse>(cacheKey);
  if (cachedData) return cachedData;

  try {
    const response = await fetch(`${API_BASE_URL}/predictions?fixture=${fixtureId}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error("API Error");
    const data: ApiResponse<PredictionResponse> = await response.json();
    if (data.response && data.response.length > 0) {
      cache.set(cacheKey, data.response[0]);
      return data.response[0];
    }
  } catch (error) {
    console.error("Failed to fetch predictions:", error);
  }
  return null;
}

export async function getFixtures(date: string): Promise<Fixture[]> {
  const cacheKey = `fixtures_${date}`;
  const cachedData = cache.get<Fixture[]>(cacheKey);
  if (cachedData) return cachedData;

  try {
    const response = await fetch(`${API_BASE_URL}/fixtures?date=${date}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error("API Error");
    const data: ApiResponse<Fixture> = await response.json();
    const results = data.response || [];
    if (results.length > 0) {
      cache.set(cacheKey, results);
    }
    return results;
  } catch (error) {
    console.error("Failed to fetch fixtures:", error);
    return [];
  }
}

export async function getTeamStatistics(teamId: number, leagueId: number, season: number = 2025): Promise<any> {
  const cacheKey = `stats_${teamId}_${leagueId}_${season}`;
  const cachedData = cache.get<any>(cacheKey);
  
  if (cachedData && cachedData.fixtures?.played?.total > 0) return cachedData;

  const fetchStats = async (s: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/teams/statistics?league=${leagueId}&season=${s}&team=${teamId}`, {
        headers: getHeaders()
      });
      const data = await response.json();
      return data.response;
    } catch (error) {
      return null;
    }
  };

  let stats = await fetchStats(season);
  
  // Fallback to previous season only if current season (2025) has NO data at all
  if (!stats || !stats.fixtures || stats.fixtures.played.total === 0) {
    stats = await fetchStats(season - 1);
  }

  if (stats) {
    cache.set(cacheKey, stats);
  }
  return stats;
}
