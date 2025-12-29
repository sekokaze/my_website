import { kv } from '@vercel/kv';

export async function GET() {
  try {
    const leaderboardKey = 'snake:leaderboard';

    const topScores = await kv.zrange(leaderboardKey, 0, 9, {
      rev: true,
      withScores: true
    });

    const leaderboard = [];
    for (let i = 0; i < topScores.length; i += 2) {
      const userId = topScores[i];
      const score = topScores[i + 1];
      const userData = await kv.get(`snake:${userId}`);
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
