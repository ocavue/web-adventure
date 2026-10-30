// Serves `dist/` the way Cloudflare Pages does, so the e2e tests see production routing:
// `/foo` serves `/foo.html`, a folder redirects to its trailing slash and serves its `index.html`,
// `.html` URLs redirect to the pretty URL, and an unknown path serves `/404.html` with status 404.
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import { extname, join, normalize } from 'node:path'

const root = join(import.meta.dirname, '..', 'dist')
const port = Number(process.env.PORT ?? 4600)

if (!(await isFile(join(root, 'index.html')))) {
  console.error('dist/ is missing. Run `pnpm run build` first.')
  process.exit(1)
}

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.webmanifest': 'application/manifest+json',
}

async function isFile(path: string): Promise<boolean> {
  try {
    return (await stat(path)).isFile()
  } catch {
    return false
  }
}

/** Finds the file for a path, or a redirect target. */
async function resolve(pathname: string): Promise<{ file: string } | { redirect: string } | null> {
  // Cloudflare Pages does not serve its own config files.
  if (pathname === '/_headers' || pathname === '/_redirects') return null
  const path = normalize(join(root, pathname))
  if (!path.startsWith(root)) return null
  // HTML files redirect to their pretty URL: `/a/index.html` to `/a/`, `/b.html` to `/b`.
  if (pathname.endsWith('.html') && (await isFile(path))) {
    return { redirect: pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '') }
  }
  if (pathname.endsWith('/')) {
    const index = join(path, 'index.html')
    return (await isFile(index)) ? { file: index } : null
  }
  if (await isFile(path)) return { file: path }
  if (await isFile(path + '.html')) return { file: path + '.html' }
  if (await isFile(join(path, 'index.html'))) return { redirect: pathname + '/' }
  return null
}

createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const found = await resolve(decodeURIComponent(url.pathname))
    if (found && 'redirect' in found) {
      res.writeHead(308, { Location: found.redirect + url.search })
      res.end()
      return
    }
    const file = found?.file ?? join(root, '404.html')
    res.writeHead(found ? 200 : 404, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    })
    if (req.method === 'HEAD') res.end()
    else createReadStream(file).pipe(res)
  })()
}).listen(port, '127.0.0.1', () => {
  console.log(`Serving dist/ on http://127.0.0.1:${port}`)
})
