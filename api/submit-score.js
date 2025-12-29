import { kv } from '@vercel/kv';

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

async function checkRateLimit(ip) {
  const rateLimitKey = `ratelimit:${ip}`;
  const now = Date.now();
  const windowMs = 10000;
  const maxRequests = 3;

  const existing = await kv.get(rateLimitKey);
  
  if (!existing) {
    await kv.set(rateLimitKey, {
      count: 1,
      timestamps: [now]
    }, { px: windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  const validTimestamps = existing.timestamps.filter(ts => now - ts < windowMs);
  
  if (validTimestamps.length >= maxRequests) {
    const oldestTimestamp = Math.min(...validTimestamps);
    const waitTime = Math.ceil((windowMs - (now - oldestTimestamp)) / 1000);
    return { 
      allowed: false, 
      remaining: 0,
      waitTime 
    };
  }

  validTimestamps.push(now);
  await kv.set(rateLimitKey, {
    count: validTimestamps.length,
    timestamps: validTimestamps
  }, { px: windowMs });

  return { allowed: true, remaining: maxRequests - validTimestamps.length };
}

export async function POST(request) {
  try {
    const ip = getClientIp(request);
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return Response.json({ 
        error: '提交过于频繁，请稍后再试',
        waitTime: rateLimit.waitTime 
      }, { status: 429 });
    }

    const { userId, score, game } = await request.json();
    const gameType = game || 'snake';

    if (!userId || score === undefined) {
      return Response.json({ error: 'Missing userId or score' }, { status: 400 });
    }

    const timestamp = Date.now();
    const key = `${gameType}:${userId}`;
    const leaderboardKey = `${gameType}:leaderboard`;

    const existing = await kv.get(key);
    const existingScore = existing ? existing.score : 0;

    if (score > existingScore) {
      await kv.set(key, { userId, score, timestamp });

      await kv.zadd(leaderboardKey, {
        score: score,
        member: userId
      });
    }

    return Response.json({ 
      success: true, 
      score: Math.max(score, existingScore),
      remaining: rateLimit.remaining
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
