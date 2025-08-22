// Database migration script

// Load environment variables from .env file
require('dotenv').config();

const { sql } = require('@vercel/postgres');

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Debug: Check if environment variables are loaded
    if (process.env.POSTGRES_URL) {
      console.log('✅ POSTGRES_URL found');
    } else {
      console.error('❌ POSTGRES_URL not found in environment variables');
      console.log('Available env vars:', Object.keys(process.env).filter(key => key.startsWith('POSTGRES')));
      process.exit(1);
    }

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

    console.log('✅ Created runs table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_speed_score ON runs(speed_score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_performance_score ON runs(performance_score DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_created_at ON runs(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_username ON runs(username)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_is_ai ON runs(is_ai)`;

    console.log('✅ Created indexes');

    // Insert AI benchmark data
    const aiBenchmarks = [
      {
        model: 'ChatGPT-4',
        speedScore: 78.5,
        performanceScore: 82.3,
        totalHits: 18,
        avgAccuracy: 0.91,
        bestAccuracy: 0.98,
        finalRadius: 8,
        durationMs: 24000,
        avgTimePerHitMs: 1333,
        clickLogs: []
      },
      {
        model: 'ChatGPT-3.5',
        speedScore: 85.2,
        performanceScore: 65.8,
        totalHits: 15,
        avgAccuracy: 0.88,
        bestAccuracy: 0.95,
        finalRadius: 12,
        durationMs: 18000,
        avgTimePerHitMs: 1200,
        clickLogs: []
      },
      {
        model: 'Claude',
        speedScore: 72.1,
        performanceScore: 88.5,
        totalHits: 20,
        avgAccuracy: 0.94,
        bestAccuracy: 0.99,
        finalRadius: 6,
        durationMs: 28000,
        avgTimePerHitMs: 1400,
        clickLogs: []
      },
      {
        model: 'Average Human',
        speedScore: 65.0,
        performanceScore: 60.0,
        totalHits: 12,
        avgAccuracy: 0.75,
        bestAccuracy: 0.89,
        finalRadius: 18,
        durationMs: 20000,
        avgTimePerHitMs: 1667,
        clickLogs: []
      }
    ];

    for (const benchmark of aiBenchmarks) {
      await sql`
        INSERT INTO runs (
          username, speed_score, performance_score, total_hits, 
          avg_accuracy, best_accuracy, final_radius, duration_ms, 
          avg_time_per_hit_ms, click_logs, is_ai, ai_model
        ) VALUES (
          ${benchmark.model},
          ${benchmark.speedScore},
          ${benchmark.performanceScore},
          ${benchmark.totalHits},
          ${benchmark.avgAccuracy},
          ${benchmark.bestAccuracy},
          ${benchmark.finalRadius},
          ${benchmark.durationMs},
          ${benchmark.avgTimePerHitMs},
          ${JSON.stringify(benchmark.clickLogs)},
          true,
          ${benchmark.model}
        )
        ON CONFLICT DO NOTHING
      `;
    }

    console.log('✅ Inserted AI benchmark data');
    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };