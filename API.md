# Click Accuracy Game API Documentation

## Base URL
```
https://your-domain.vercel.app/api
```

## Endpoints

### POST /api/runs
Submit a new game run to the leaderboard.

#### Request Body
```json
{
  "username": "player123", // Optional, max 20 characters
  "stats": {
    "totalHits": 15,
    "avgAccuracy": 0.847,
    "bestAccuracy": 0.995,
    "finalRadius": 12,
    "durationMs": 24750
  },
  "click_logs": [
    {
      "t": 1500,        // Timestamp from game start
      "cx": 245.7,      // Click X coordinate  
      "cy": 332.1,      // Click Y coordinate
      "tx": 248.0,      // Target center X
      "ty": 330.0,      // Target center Y
      "r": 25,          // Target radius
      "d": 2.8,         // Distance from center
      "hit": true,      // Hit or miss
      "a": 0.89         // Accuracy (0-1)
    }
    // ... more click logs
  ],
  "badges": ["sharpshooter", "speed_demon"] // Optional
}
```

#### Response
```json
{
  "success": true,
  "id": 12345,
  "scores": {
    "speed": 87.3,
    "performance": 78.1
  },
  "rankings": {
    "speed": {
      "rank": 23,
      "percentile": 85
    },
    "performance": {
      "rank": 15,
      "percentile": 92
    }
  },
  "vs_ai": {
    "chatgpt_4": {
      "speed": 9,
      "performance": -4
    },
    "claude": {
      "speed": 15,
      "performance": -10
    }
  }
}
```

#### Anti-Spam Protection
- **Input Validation**: All fields are strictly validated
- **Game Logic Validation**: Impossible scores are rejected
- **Consistency Checks**: Stats must match click logs
- **Timing Analysis**: Sub-100ms per hit is flagged as bot-like
- **IP Tracking**: Privacy-compliant IP hashing for abuse detection

### GET /api/leaderboard
Retrieve leaderboard data and scatter plot information.

#### Response
```json
{
  "hall_of_fame": [
    {
      "rank": 1,
      "username": "ProGamer",
      "speed_score": 94.2,
      "performance_score": 89.7,
      "total_hits": 28,
      "avg_accuracy": 0.94,
      "created_at": "2024-01-15T10:30:00Z",
      "badges": ["perfectionist", "marathon_runner"]
    }
  ],
  "todays_best": [
    // Same structure as hall_of_fame
  ],
  "ai_benchmarks": [
    {
      "rank": 1,
      "username": "Claude",
      "speed_score": 72.1,
      "performance_score": 88.5,
      "is_ai": true,
      "ai_model": "Claude"
    }
  ],
  "scatter_data": [
    {
      "x": 87.3,           // Speed score
      "y": 78.1,           // Performance score
      "type": "human",     // "human" | "ai"
      "username": "Player1",
      "model": null        // AI model name if type is "ai"
    }
  ],
  "cache_timestamp": "2024-01-15T10:35:22Z",
  "total_entries": {
    "hall_of_fame": 10,
    "todays_best": 8,
    "ai_benchmarks": 4,
    "scatter_points": 150
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": "Error message description",
  "message": "Detailed error (development only)"
}
```

### Common Error Codes
- **400**: Invalid input data or impossible scores
- **405**: Method not allowed
- **500**: Internal server error

## Validation Rules

### Username
- Optional field
- Max 20 characters
- Alphanumeric + basic symbols only
- HTML/script tags stripped

### Game Stats
- `totalHits`: 0-1000
- `avgAccuracy`: 0-1.0
- `bestAccuracy`: 0-1.0
- `finalRadius`: 1-200 pixels  
- `durationMs`: 0-3,600,000 (1 hour max)
- Minimum 100ms per hit (anti-bot)

### Click Logs
- Must match totalHits count
- Max 1 miss allowed
- Coordinates within reasonable bounds
- Timestamps must be sequential

### Badges
- Must be from predefined list
- Max 10 badges per submission

## Caching
- Leaderboard data cached for 5 minutes
- Stale cache served during database issues
- Cache automatically invalidated on new submissions