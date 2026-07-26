// ---------------------------------------------------------------------------
// Same-origin dev reverse proxy for V Welfare local development.
//
// Why this exists:
//   middleware.ts sets a strict Content-Security-Policy whose `connect-src`
//   only allows `'self'` and `https://*.supabase.co`. That is correct for the
//   deployed app (which points at a hosted Supabase project), but it blocks the
//   browser from talking to a LOCAL Supabase stack at http://127.0.0.1:54321.
//
//   To develop against local Supabase WITHOUT editing the app's security code,
//   this proxy serves everything from a single origin (http://localhost:3000):
//     * /auth/v1/*, /rest/v1/*, /realtime/v1/*, /storage/v1/*, /functions/v1/*,
//       /graphql/v1/* and /pg/*  ->  Supabase (Kong @ 127.0.0.1:54321)
//     * everything else          ->  Next.js dev server (@ 127.0.0.1:3001)
//   Because the Supabase JS client is pointed at NEXT_PUBLIC_SUPABASE_URL=
//   http://localhost:3000, all its requests are same-origin and satisfy the CSP.
//
// Usage: node scripts/dev-proxy.mjs   (defaults below can be overridden by env)
// ---------------------------------------------------------------------------
import http from 'node:http'
import net from 'node:net'

const LISTEN_PORT = Number(process.env.PROXY_PORT || 3000)
const NEXT_PORT = Number(process.env.NEXT_PORT || 3001)
const SUPABASE_PORT = Number(process.env.SUPABASE_PORT || 54321)
const HOST = '127.0.0.1'

const SUPABASE_PREFIXES = [
  '/auth/v1/',
  '/rest/v1/',
  '/realtime/v1/',
  '/storage/v1/',
  '/functions/v1/',
  '/graphql/v1/',
  '/pg/',
]

function targetPortFor(url) {
  return SUPABASE_PREFIXES.some((p) => url.startsWith(p)) ? SUPABASE_PORT : NEXT_PORT
}

const server = http.createServer((req, res) => {
  const port = targetPortFor(req.url || '/')
  const proxyReq = http.request(
    { host: HOST, port, method: req.method, path: req.url, headers: req.headers },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )
  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'content-type': 'text/plain' })
    res.end(`Proxy error: ${err.message}`)
  })
  req.pipe(proxyReq)
})

// Forward WebSocket upgrades (Next.js HMR and Supabase Realtime).
server.on('upgrade', (req, socket, head) => {
  const port = targetPortFor(req.url || '/')
  const upstream = net.connect(port, HOST, () => {
    const headerLines = [`${req.method} ${req.url} HTTP/1.1`]
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      headerLines.push(`${req.rawHeaders[i]}: ${req.rawHeaders[i + 1]}`)
    }
    upstream.write(headerLines.join('\r\n') + '\r\n\r\n')
    if (head && head.length) upstream.write(head)
    socket.pipe(upstream)
    upstream.pipe(socket)
  })
  upstream.on('error', () => socket.destroy())
  socket.on('error', () => upstream.destroy())
})

server.listen(LISTEN_PORT, () => {
  console.log(`[dev-proxy] listening on http://localhost:${LISTEN_PORT}`)
  console.log(`[dev-proxy]   Supabase paths -> 127.0.0.1:${SUPABASE_PORT}`)
  console.log(`[dev-proxy]   everything else -> 127.0.0.1:${NEXT_PORT} (Next.js)`)
})
