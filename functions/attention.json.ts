// Serves the cron-aggregated attention snapshot from KV as edge-cached
// JSON. The read path never touches D1; if KV is unbound or empty the
// frontend simply falls back to editorial weights.

interface Env {
  CACHE?: KVNamespace
}

const EMPTY = JSON.stringify({ generatedAt: null, conferences: {} })

export const onRequestGet: PagesFunction<Env> = async (ctx) => {
  const body = (await ctx.env.CACHE?.get('attention')) ?? EMPTY
  return new Response(body, {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // cron refreshes every 3h; let the edge absorb virtually all reads
      'cache-control': 'public, max-age=600, s-maxage=3600',
    },
  })
}
