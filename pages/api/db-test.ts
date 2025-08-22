// Simple endpoint to test database connection

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🔍 Database connection test started');
  
  // Log environment variables
  console.log('Environment variables check:', {
    NODE_ENV: process.env.NODE_ENV,
    POSTGRES_URL: process.env.POSTGRES_URL ? '✅ Present (length: ' + process.env.POSTGRES_URL.length + ')' : '❌ Missing',
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING ? '✅ Present' : '❌ Missing',
    DATABASE_URL: process.env.DATABASE_URL ? '✅ Present' : '❌ Missing',
  });
  
  try {
    // Try a simple query
    console.log('📡 Attempting database connection...');
    const result = await sql`SELECT NOW() as current_time, version() as postgres_version`;
    
    console.log('✅ Database connection successful!');
    console.log('Query result:', result.rows[0]);
    
    return res.status(200).json({
      success: true,
      message: 'Database connection successful',
      data: result.rows[0],
      env_check: {
        NODE_ENV: process.env.NODE_ENV,
        has_postgres_url: !!process.env.POSTGRES_URL,
        has_database_url: !!process.env.DATABASE_URL,
      }
    });
    
  } catch (error) {
    console.error('💥 Database connection failed:', error);
    
    return res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: (error as Error).message,
      env_check: {
        NODE_ENV: process.env.NODE_ENV,
        has_postgres_url: !!process.env.POSTGRES_URL,
        has_database_url: !!process.env.DATABASE_URL,
      }
    });
  }
}