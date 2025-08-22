// API endpoint for retrieving leaderboard data

import { NextApiRequest, NextApiResponse } from 'next';
import { 
  getHallOfFame, 
  getTodaysBest, 
  getAIBenchmarks, 
  getScatterData 
} from '@/lib/database';

// Simple in-memory cache for leaderboard data
let cachedData: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Set CORS headers
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res);
  
  // Log incoming request
  console.log(`📊 [${new Date().toISOString()}] ${req.method} /api/leaderboard`);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handled CORS preflight request');
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    console.log(`❌ Method ${req.method} not allowed`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Check cache first
    const now = Date.now();
    const cacheAge = now - cacheTimestamp;
    if (cachedData && cacheAge < CACHE_DURATION) {
      console.log(`💰 Serving leaderboard from cache (age: ${Math.round(cacheAge / 1000)}s)`);
      return res.status(200).json(cachedData);
    }
    
    // Fetch fresh data from database
    console.log('🔄 Fetching fresh leaderboard data from database...');
    const [hallOfFame, todaysBest, aiBenchmarks, scatterData] = await Promise.all([
      getHallOfFame(),
      getTodaysBest(),
      getAIBenchmarks(),
      getScatterData(150) // Get 150 recent runs for scatter plot
    ]);
    
    // Build response
    const leaderboardData = {
      hall_of_fame: hallOfFame,
      todays_best: todaysBest,
      ai_benchmarks: aiBenchmarks,
      scatter_data: scatterData,
      cache_timestamp: new Date().toISOString(),
      total_entries: {
        hall_of_fame: hallOfFame.length,
        todays_best: todaysBest.length,
        ai_benchmarks: aiBenchmarks.length,
        scatter_points: scatterData.length
      }
    };
    
    console.log('✅ Successfully fetched leaderboard data:', {
      hallOfFameEntries: hallOfFame.length,
      todaysEntries: todaysBest.length,
      aiBenchmarks: aiBenchmarks.length,
      scatterPoints: scatterData.length
    });
    
    // Update cache
    cachedData = leaderboardData;
    cacheTimestamp = now;
    
    return res.status(200).json(leaderboardData);
    
  } catch (error) {
    console.error('💥 API Error in /api/leaderboard:', error);
    console.error('Stack trace:', (error as Error).stack);
    
    // If we have cached data, serve it even if it's stale
    if (cachedData) {
      console.log('⚠️  Serving stale cache due to database error');
      return res.status(200).json({
        ...cachedData,
        warning: 'Data may be outdated due to temporary service issues'
      });
    }
    
    // Don't expose internal errors to client
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}

// Helper function to clear cache (useful for testing)
export function clearLeaderboardCache() {
  cachedData = null;
  cacheTimestamp = 0;
}