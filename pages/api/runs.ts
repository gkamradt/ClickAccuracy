// API endpoint for submitting game runs

import { NextApiRequest, NextApiResponse } from 'next';
import { 
  insertRun, 
  calculatePercentile, 
  getCurrentRank, 
  getAIComparisons 
} from '@/lib/database';
import { 
  validateUsername,
  validateGameStats,
  validateGameConsistency,
  validateClickLog,
  validateBadges,
  hashIP,
  sanitizeUserAgent
} from '@/lib/validation';
// Import centralized scoring utilities
import { calculateSpeedScore, calculatePerformanceScore } from '@/utils/scoring';
import { logger } from '@/utils/logger';

function getAverageTimePerHit(durationMs: number, totalHits: number): number {
  if (totalHits === 0) return 0;
  return Math.round(durationMs / totalHits);
}

// Set CORS headers
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res);
  
  // Log incoming request
  logger.log(`🎯 [${new Date().toISOString()}] ${req.method} /api/runs`);
  logger.log('Headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 100) + '...',
    'x-forwarded-for': req.headers['x-forwarded-for']
  });
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.log('✅ Handled CORS preflight request');
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    logger.log(`❌ Method ${req.method} not allowed`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { username, stats, click_logs, badges } = req.body;
    logger.log('📊 Received game data:', {
      username: username || 'Anonymous',
      totalHits: stats?.totalHits,
      avgAccuracy: stats?.avgAccuracy,
      durationMs: stats?.durationMs,
      clickLogsCount: click_logs?.length,
      badges: badges?.length || 0
    });
    
    // Validate input structure
    if (!stats || !click_logs) {
      logger.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({ error: 'Missing required fields: stats, click_logs' });
    }
    
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return res.status(400).json({ error: usernameValidation.error });
    }
    
    // Validate game statistics
    const statsValidation = validateGameStats(stats);
    if (!statsValidation.valid) {
      return res.status(400).json({ error: statsValidation.error });
    }
    
    // Validate click logs
    if (!Array.isArray(click_logs)) {
      return res.status(400).json({ error: 'click_logs must be an array' });
    }
    
    for (const log of click_logs) {
      const logValidation = validateClickLog(log);
      if (!logValidation.valid) {
        return res.status(400).json({ error: `Invalid click log: ${logValidation.error}` });
      }
    }
    
    // Cross-validate consistency between stats and logs
    const consistencyValidation = validateGameConsistency(stats, click_logs);
    if (!consistencyValidation.valid) {
      return res.status(400).json({ error: consistencyValidation.error });
    }
    
    // Validate badges if provided
    if (badges) {
      const badgesValidation = validateBadges(badges);
      if (!badgesValidation.valid) {
        return res.status(400).json({ error: badgesValidation.error });
      }
    }
    
    // Calculate enhanced scores
    const speedScore = calculateSpeedScore(stats.durationMs, stats.totalHits);
    const performanceScore = calculatePerformanceScore(stats.avgAccuracy, stats.totalHits);
    const avgTimePerHit = getAverageTimePerHit(stats.durationMs, stats.totalHits);
    
    // Get client information for tracking (privacy-compliant)
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
    const ipHash = hashIP(Array.isArray(clientIP) ? clientIP[0] : clientIP);
    const userAgent = sanitizeUserAgent(req.headers['user-agent']);
    
    // Store in database
    const runRecord = {
      username: username || null,
      speed_score: speedScore,
      performance_score: performanceScore,
      total_hits: stats.totalHits,
      avg_accuracy: stats.avgAccuracy,
      best_accuracy: stats.bestAccuracy,
      final_radius: stats.finalRadius,
      duration_ms: stats.durationMs,
      avg_time_per_hit_ms: avgTimePerHit,
      click_logs: click_logs,
      badges: badges || [],
      is_ai: false,
      ip_hash: ipHash,
      user_agent: userAgent
    };
    
    logger.log('💾 Inserting run into database...');
    const runId = await insertRun(runRecord);
    logger.log(`✅ Run inserted with ID: ${runId}`);
    
    logger.log('📈 Calculating rankings and comparisons...');
    // Calculate rank and percentile
    const [speedRank, performanceRank, speedPercentile, performancePercentile, aiComparisons] = await Promise.all([
      getCurrentRank(speedScore, 'speed'),
      getCurrentRank(performanceScore, 'performance'),
      calculatePercentile(speedScore, 'speed'),
      calculatePercentile(performanceScore, 'performance'),
      getAIComparisons(speedScore, performanceScore)
    ]);
    
    logger.log('🏆 Final results:', {
      runId,
      speedScore,
      performanceScore,
      speedRank,
      performanceRank,
      speedPercentile,
      performancePercentile
    });
    
    // Return results
    return res.status(200).json({
      success: true,
      id: runId,
      scores: {
        speed: speedScore,
        performance: performanceScore
      },
      rankings: {
        speed: {
          rank: speedRank,
          percentile: speedPercentile
        },
        performance: {
          rank: performanceRank,
          percentile: performancePercentile
        }
      },
      vs_ai: aiComparisons
    });
    
  } catch (error) {
    logger.error('💥 API Error in /api/runs:', error);
    logger.error('Stack trace:', (error as Error).stack);
    
    // Don't expose internal errors to client
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}