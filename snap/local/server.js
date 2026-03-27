#!/usr/bin/env node
// BentoPDF static file server
// Serves the built Vite app with required COOP/COEP headers for WASM support

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'var', 'www', 'bentopdf');
const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.otf': 'font/otf',
  '.pdf': 'application/pdf',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

const SECURITY_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
};

function serveFile(res, filePath, statusCode = 200) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Handle pre-compressed .gz files for wasm/data
  const gzPath = filePath + '.gz';
  if (['.wasm', '.data'].includes(ext) && fs.existsSync(gzPath)) {
    res.writeHead(statusCode, {
      'Content-Type': contentType,
      'Content-Encoding': 'gzip',
      'Vary': 'Accept-Encoding',
      'Cache-Control': 'public, immutable, max-age=31536000',
      ...SECURITY_HEADERS,
    });
    fs.createReadStream(gzPath).pipe(res);
    return;
  }

  if (!fs.existsSync(filePath)) {
    serve404(res);
    return;
  }

  const cacheControl = ['.html'].includes(ext)
    ? 'public, must-revalidate, max-age=300'
    : ['.js', '.mjs', '.css', '.wasm', '.woff', '.woff2'].includes(ext)
    ? 'public, immutable, max-age=31536000'
    : 'public, max-age=3600';

  res.writeHead(statusCode, {
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
    ...SECURITY_HEADERS,
  });
  fs.createReadStream(filePath).pipe(res);
}

function serve404(res) {
  const notFound = path.join(ROOT, '404.html');
  if (fs.existsSync(notFound)) {
    serveFile(res, notFound, 404);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Normalise path
  let filePath = path.join(ROOT, urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Index fallback
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Try exact file, then .html extension, then index.html, then 404
  if (fs.existsSync(filePath)) {
    serveFile(res, filePath);
  } else if (fs.existsSync(filePath + '.html')) {
    serveFile(res, filePath + '.html');
  } else {
    // SPA fallback for i18n routes → try /index.html
    const indexFallback = path.join(ROOT, 'index.html');
    if (fs.existsSync(indexFallback)) {
      serveFile(res, indexFallback);
    } else {
      serve404(res);
    }
  }
});

server.listen(PORT, () => {
  console.log(`BentoPDF server running at http://localhost:${PORT}`);
});
