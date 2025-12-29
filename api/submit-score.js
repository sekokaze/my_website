import { kv } from '@vercel/kv';

export async function POST(request) {
  try {
    const { userId, score } = await request.json();

    if (!userId || score === undefined) {
      return Response.json({ error: 'Missing userId or score' }, { status: 400 });
    }

    const timestamp = Date.now();
    const key = `snake:${userId}`;
    const leaderboardKey = 'snake:leaderboard';

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
