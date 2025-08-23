// Database utility module for Vercel Postgres

import { sql } from '@vercel/postgres';
import { RunRecord, LeaderboardEntry, ClickLog } from '@/types/database';

// Connection helper - Vercel Postgres handles connection pooling automatically
export async function query(text: string, params: any[] = []) {
  try {
    console.log('🔗 Executing database query...');
    console.log('Environment check:', {
      POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Present' : '❌ Missing',
      NODE_ENV: process.env.NODE_ENV
    });
    const result = await sql.query(text, params);
    console.log(`✅ Query executed successfully (${result.rows.length} rows)`);
    return result;
  } catch (error) {
    console.error('💥 Database query error:', error);
    console.error('Connection string available:', !!process.env.POSTGRES_URL);
    throw error;
  }
}

// Initialize database schema
export async function initializeDatabase() {
  try {
    // Create runs table
    await sql`
      CREATE TABLE IF NOT EXISTS runs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(20),
        speed_score DECIMAL(5,2) NOT NULL,
        performance_score DECIMAL(5,2) NOT NULL,
        total_hits INT NOT NULL,
        avg_accuracy DECIMAL(5,2) NOT NULL,
        best_accuracy DECIMAL(5,2) NOT NULL,
        final_radius INT NOT NULL,
        duration_ms INT NOT NULL,
        avg_time_per_hit_ms INT NOT NULL,
        click_logs JSONB NOT NULL,
        badges TEXT[] DEFAULT '{}',
        is_ai BOOLEAN DEFAULT false,
        ai_model VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        ip_hash VARCHAR(64),
        user_agent TEXT
      )
    `;

    // Create indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_speed_score ON runs(speed_score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_performance_score ON runs(performance_score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_created_at ON runs(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_username ON runs(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_is_ai ON runs(is_ai)`;

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

// Insert a new run record
export async function insertRun(run: Omit<RunRecord, 'id' | 'created_at'>): Promise<number> {
  try {
    const result = await sql`
      INSERT INTO runs (
        username, speed_score, performance_score, total_hits, 
        avg_accuracy, best_accuracy, final_radius, duration_ms, 
        avg_time_per_hit_ms, click_logs, badges, is_ai, ai_model, 
        ip_hash, user_agent
      ) VALUES (
        ${run.username || null},
        ${run.speed_score},
        ${run.performance_score},
        ${run.total_hits},
        ${run.avg_accuracy},
        ${run.best_accuracy},
        ${run.final_radius},
        ${run.duration_ms},
        ${run.avg_time_per_hit_ms},
        ${JSON.stringify(run.click_logs)},
        ${run.badges},
        ${run.is_ai},
        ${run.ai_model || null},
        ${run.ip_hash || null},
        ${run.user_agent || null}
      ) RETURNING id
    `;

    return result.rows[0].id;
  } catch (error) {
    console.error('Error inserting run:', error);
    throw error;
  }
}

// Get hall of fame (top 10 all-time by performance score)
export async function getHallOfFame(): Promise<LeaderboardEntry[]> {
  try {
    const result = await sql`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY performance_score DESC) as rank,
        username,
        speed_score,
        performance_score,
        total_hits,
        avg_accuracy,
        created_at,
        badges,
        is_ai,
        ai_model
      FROM runs 
      WHERE is_ai = false
      ORDER BY performance_score DESC 
      LIMIT 10
    `;

    return result.rows.map(row => ({
      rank: row.rank,
      username: row.username || 'Anonymous',
      speed_score: parseFloat(row.speed_score),
      performance_score: parseFloat(row.performance_score),
      total_hits: row.total_hits,
      avg_accuracy: parseFloat(row.avg_accuracy),
      created_at: row.created_at,
      badges: row.badges || [],
      is_ai: row.is_ai,
      ai_model: row.ai_model
    }));
  } catch (error) {
    console.error('Error getting hall of fame:', error);
    throw error;
  }
}

// Get today's best (last 24 hours)
export async function getTodaysBest(): Promise<LeaderboardEntry[]> {
  try {
    const result = await sql`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY performance_score DESC) as rank,
        username,
        speed_score,
        performance_score,
        total_hits,
        avg_accuracy,
        created_at,
        badges,
        is_ai,
        ai_model
      FROM runs 
      WHERE is_ai = false 
        AND created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY performance_score DESC 
      LIMIT 10
    `;

    return result.rows.map(row => ({
      rank: row.rank,
      username: row.username || 'Anonymous',
      speed_score: parseFloat(row.speed_score),
      performance_score: parseFloat(row.performance_score),
      total_hits: row.total_hits,
      avg_accuracy: parseFloat(row.avg_accuracy),
      created_at: row.created_at,
      badges: row.badges || [],
      is_ai: row.is_ai,
      ai_model: row.ai_model
    }));
  } catch (error) {
    console.error('Error getting today\'s best:', error);
    throw error;
  }
}

// Get AI benchmarks
export async function getAIBenchmarks(): Promise<LeaderboardEntry[]> {
  try {
    const result = await sql`
      SELECT 
        ROW_NUMBER() OVER (ORDER BY performance_score DESC) as rank,
        username,
        speed_score,
        performance_score,
        total_hits,
        avg_accuracy,
        created_at,
        badges,
        is_ai,
        ai_model
      FROM runs 
      WHERE is_ai = true
      ORDER BY performance_score DESC
    `;

    return result.rows.map(row => ({
      rank: row.rank,
      username: row.username || row.ai_model || 'AI',
      speed_score: parseFloat(row.speed_score),
      performance_score: parseFloat(row.performance_score),
      total_hits: row.total_hits,
      avg_accuracy: parseFloat(row.avg_accuracy),
      created_at: row.created_at,
      badges: row.badges || [],
      is_ai: row.is_ai,
      ai_model: row.ai_model
    }));
  } catch (error) {
    console.error('Error getting AI benchmarks:', error);
    throw error;
  }
}

// Get scatter plot data (sample of recent runs)
export async function getScatterData(limit: number = 100): Promise<Array<{
  x: number;
  y: number;
  type: 'human' | 'ai';
  model?: string;
  username?: string;
}>> {
  try {
    const result = await sql`
      SELECT 
        speed_score,
        performance_score,
        is_ai,
        ai_model,
        username
      FROM runs 
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;

    return result.rows.map(row => ({
      x: parseFloat(row.speed_score),
      y: parseFloat(row.performance_score),
      type: row.is_ai ? 'ai' : 'human',
      model: row.ai_model,
      username: row.username // Keep null as null, don't convert to 'Anonymous'
    }));
  } catch (error) {
    console.error('Error getting scatter data:', error);
    throw error;
  }
}

// Calculate percentile for a given score
export async function calculatePercentile(score: number, metric: 'speed' | 'performance'): Promise<number> {
  try {
    const field = metric === 'speed' ? 'speed_score' : 'performance_score';
    
    // Get total count of human players
    const totalResult = await sql`
      SELECT COUNT(*) as count 
      FROM runs 
      WHERE is_ai = false
    `;
    
    const totalCount = parseInt(totalResult.rows[0].count);
    
    if (totalCount === 0) return 100; // First player gets 100th percentile
    
    // Get count of players with lower scores
    const lowerResult = await sql.query(
      `SELECT COUNT(*) as lower_count 
       FROM runs 
       WHERE is_ai = false AND ${field} < $1`,
      [score]
    );
    
    const lowerCount = parseInt(lowerResult.rows[0].lower_count);
    
    return Math.round((lowerCount / totalCount) * 100);
  } catch (error) {
    console.error('Error calculating percentile:', error);
    throw error;
  }
}

// Get current rank for a score
export async function getCurrentRank(score: number, metric: 'speed' | 'performance'): Promise<number> {
  try {
    const field = metric === 'speed' ? 'speed_score' : 'performance_score';
    
    const result = await sql.query(
      `SELECT COUNT(*) + 1 as rank 
       FROM runs 
       WHERE is_ai = false AND ${field} > $1`,
      [score]
    );
    
    return parseInt(result.rows[0].rank);
  } catch (error) {
    console.error('Error calculating rank:', error);
    throw error;
  }
}

// Get AI comparison deltas
export async function getAIComparisons(speedScore: number, performanceScore: number): Promise<Record<string, { speed: number, performance: number }>> {
  try {
    const result = await sql`
      SELECT ai_model, speed_score, performance_score 
      FROM runs 
      WHERE is_ai = true AND ai_model IS NOT NULL
    `;

    const comparisons: Record<string, { speed: number, performance: number }> = {};
    
    for (const ai of result.rows) {
      const modelKey = ai.ai_model.toLowerCase().replace(/[^a-z0-9]/g, '_');
      comparisons[modelKey] = {
        speed: Math.round(speedScore - parseFloat(ai.speed_score)),
        performance: Math.round(performanceScore - parseFloat(ai.performance_score))
      };
    }
    
    return comparisons;
  } catch (error) {
    console.error('Error getting AI comparisons:', error);
    throw error;
  }
}