#!/usr/bin/env node
// BentoPDF static file server (CommonJS)
// Serves the built Vite app over HTTPS with COOP/COEP headers for WASM support

'use strict';

var https = require('https');
var http = require('http');
var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..', 'var', 'www', 'bentopdf');
var PORT = process.env.PORT || 9080;

var MIME_TYPES = {
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
  '.data': 'application/octet-stream',
};

// COOP/COEP headers for SharedArrayBuffer/WASM support
var CROSS_ORIGIN_HEADERS = {
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'cross-origin',
};

// Extensions that get COOP/COEP (matching original nginx config)
var COEP_EXTENSIONS = ['.html', '.js', '.mjs', '.css', '.wasm', '.woff', '.woff2', '.ttf', '.eot', '.otf', '.data'];

// Base security headers for all responses
var BASE_SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
};

function getHeaders(ext, cacheControl) {
  var headers = {
    'Cache-Control': cacheControl,
  };

  var key;
  for (key in BASE_SECURITY_HEADERS) {
    headers[key] = BASE_SECURITY_HEADERS[key];
  }

  // Add COOP/COEP for extensions that need SharedArrayBuffer
  if (COEP_EXTENSIONS.indexOf(ext) !== -1) {
    for (key in CROSS_ORIGIN_HEADERS) {
      headers[key] = CROSS_ORIGIN_HEADERS[key];
    }
  }

  return headers;
}

function serveFile(res, filePath, statusCode) {
  statusCode = statusCode || 200;
  var ext = path.extname(filePath).toLowerCase();
  var contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Handle pre-compressed .gz files for wasm/data
  var gzPath = filePath + '.gz';
  if ((ext === '.wasm' || ext === '.data') && fs.existsSync(gzPath)) {
    var gzHeaders = getHeaders(ext, 'public, immutable, max-age=31536000');
    gzHeaders['Content-Type'] = contentType;
    gzHeaders['Content-Encoding'] = 'gzip';
    gzHeaders['Vary'] = 'Accept-Encoding';
    res.writeHead(statusCode, gzHeaders);
    fs.createReadStream(gzPath).pipe(res);
    return;
  }

  if (!fs.existsSync(filePath)) {
    serve404(res);
    return;
  }

  var cacheControl;
  if (ext === '.html') {
    cacheControl = 'public, must-revalidate, max-age=300';
  } else if (['.js', '.mjs', '.css', '.wasm', '.woff', '.woff2'].indexOf(ext) !== -1) {
    cacheControl = 'public, immutable, max-age=31536000';
  } else if (['.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp'].indexOf(ext) !== -1) {
    cacheControl = 'public, immutable, max-age=31536000';
  } else if (ext === '.json') {
    cacheControl = 'public, must-revalidate, max-age=604800';
  } else if (ext === '.pdf') {
    cacheControl = 'public, immutable, max-age=31536000';
  } else {
    cacheControl = 'public, max-age=3600';
  }

  var finalHeaders = getHeaders(ext, cacheControl);
  finalHeaders['Content-Type'] = contentType;
  res.writeHead(statusCode, finalHeaders);
  fs.createReadStream(filePath).pipe(res);
}

function serve404(res) {
  var notFound = path.join(ROOT, '404.html');
  if (fs.existsSync(notFound)) {
    serveFile(res, notFound, 404);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
  }
}

function handleRequest(req, res) {
  var urlPath = req.url.split('?')[0];
  var filePath = path.join(ROOT, urlPath);

  // Security: prevent directory traversal
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Index fallback
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  // Try exact file, then .html extension, then SPA index fallback
  if (fs.existsSync(filePath)) {
    serveFile(res, filePath);
  } else if (fs.existsSync(filePath + '.html')) {
    serveFile(res, filePath + '.html');
  } else {
    var indexFallback = path.join(ROOT, 'index.html');
    if (fs.existsSync(indexFallback)) {
      serveFile(res, indexFallback);
    } else {
      serve404(res);
    }
  }
}

// Try HTTPS if cert/key are available, fall back to HTTP
var tlsCert = process.env.TLS_CERT;
var tlsKey = process.env.TLS_KEY;

if (tlsCert && tlsKey && fs.existsSync(tlsCert) && fs.existsSync(tlsKey)) {
  var options = {
    cert: fs.readFileSync(tlsCert),
    key: fs.readFileSync(tlsKey),
  };
  https.createServer(options, handleRequest).listen(PORT, function() {
    console.log('BentoPDF server (HTTPS) running at https://localhost:' + PORT);
  });
} else {
  console.warn('WARNING: No TLS cert/key found. Running HTTP (WASM features may not work on LAN).');
  http.createServer(handleRequest).listen(PORT, function() {
    console.log('BentoPDF server (HTTP) running at http://localhost:' + PORT);
  });
}
