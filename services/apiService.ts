
import { ApiResponse, PredictionResponse, Fixture } from '../types';

const API_BASE_URL = 'https://v3.football.api-sports.io';
const FOOTBALL_API_KEY = 'ea7e8a05b9a488c38470487ae51ef460';

const getHeaders = () => ({
  'x-apisports-key': FOOTBALL_API_KEY,
  'Accept': 'application/json',
});

/**
 * Cache helper pro localStorage
 */
const cache = {
  get: <T>(key: string): T | null => {
    const item = localStorage.getItem(key);
    if (!item) return null;
    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  },
  set: <T>(key: string, data: T): void => {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

/**
 * Načte predikce s využitím localStorage cache. 
 * Pokud data nejsou v cache, zavolá API a uloží výsledek.
 */
export async function getPredictions(fixtureId: number): Promise<PredictionResponse | null> {
  const cacheKey = `pred_${fixtureId}`;
  const cachedData = cache.get<PredictionResponse>(cacheKey);
  
  if (cachedData) {
    return cachedData;
  }

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

/**
 * Načte zápasy pro konkrétní datum. 
 * Používá localStorage pro uložení celého dne k úspoře API volání.
 */
export async function getFixtures(date: string): Promise<Fixture[]> {
  const cacheKey = `fixtures_${date}`;
  const cachedData = cache.get<Fixture[]>(cacheKey);

  if (cachedData) {
    return cachedData;
  }

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

/**
 * Načte statistiky týmu pro konkrétní ligu a sezónu.
 */
export async function getTeamStatistics(teamId: number, leagueId: number, season: number): Promise<any> {
  const cacheKey = `stats_${teamId}_${leagueId}_${season}`;
  const cachedData = cache.get<any>(cacheKey);

  if (cachedData) return cachedData;

  try {
    const response = await fetch(`${API_BASE_URL}/teams/statistics?league=${leagueId}&season=${season}&team=${teamId}`, {
      headers: getHeaders()
    });
    const data = await response.json();
    if (data.response) {
      cache.set(cacheKey, data.response);
      return data.response;
    }
  } catch (error) {
    console.error("Failed to fetch team statistics:", error);
  }
  return null;
}
