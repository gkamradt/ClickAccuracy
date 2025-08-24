// API endpoint for updating username on existing runs

import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';
import { validateUsername } from '@/lib/validation';
import { logger } from '@/utils/logger';

// Set CORS headers
function setCorsHeaders(res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  setCorsHeaders(res);
  
  // Log incoming request
  logger.log(`👤 [${new Date().toISOString()}] ${req.method} /api/runs/${req.query.id}/username`);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.log('✅ Handled CORS preflight request');
    return res.status(200).end();
  }
  
  // Only allow PATCH requests
  if (req.method !== 'PATCH') {
    logger.log(`❌ Method ${req.method} not allowed`);
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const runId = req.query.id as string;
    const { username } = req.body;
    
    logger.log('📝 Username update request:', { runId, username });
    
    // Validate run ID
    if (!runId || isNaN(Number(runId))) {
      logger.log('❌ Invalid run ID');
      return res.status(400).json({ error: 'Invalid run ID' });
    }
    
    // Validate username
    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      logger.log('❌ Username validation failed:', usernameValidation.error);
      return res.status(400).json({ error: usernameValidation.error });
    }
    
    // Check if run exists and get current data
    logger.log('🔍 Checking if run exists...');
    const existingRun = await sql`
      SELECT id, username, created_at 
      FROM runs 
      WHERE id = ${runId}
    `;
    
    if (existingRun.rows.length === 0) {
      logger.log('❌ Run not found');
      return res.status(404).json({ error: 'Run not found' });
    }
    
    const run = existingRun.rows[0];
    logger.log('✅ Run found:', { id: run.id, currentUsername: run.username });
    
    // Check if run is recent (within last 24 hours for security)
    const now = new Date();
    const runCreated = new Date(run.created_at);
    const hoursSinceCreation = (now.getTime() - runCreated.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceCreation > 24) {
      logger.log('❌ Run too old to update:', { hoursSinceCreation });
      return res.status(403).json({ error: 'Run is too old to update username' });
    }
    
    // Update the username
    logger.log('💾 Updating username in database...');
    await sql`
      UPDATE runs 
      SET username = ${username || null}
      WHERE id = ${runId}
    `;
    
    logger.log('✅ Username updated successfully');
    
    return res.status(200).json({
      success: true,
      message: 'Username updated successfully',
      runId: Number(runId),
      username: username || null,
      previousUsername: run.username
    });
    
  } catch (error) {
    logger.error('💥 API Error in username update:', error);
    logger.error('Stack trace:', (error as Error).stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  }
}