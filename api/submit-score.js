import { kv } from '@vercel/kv';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const game = searchParams.get('game') || 'snake';
  
  try {
    const leaderboardKey = `${game}:leaderboard`;

    const topScores = await kv.zrange(leaderboardKey, 0, 9, {
      rev: true,
      withScores: true
    });

    const leaderboard = [];
    for (let i = 0; i < topScores.length; i += 2) {
      const userId = topScores[i];
      const score = topScores[i + 1];
      const userData = await kv.get(`${game}:${userId}`);
      leaderboard.push({
        rank: Math.floor(i / 2) + 1,
        userId,
        score,
        timestamp: userData?.timestamp || 0
      });
    }

    return Response.json({ leaderboard });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
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

    return Response.json({ success: true, score: Math.max(score, existingScore) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
