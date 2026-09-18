const http = require('http');
const fs = require('fs');
const path = require('path');

let port = Number(process.env.FRONTEND_PORT) || 3000;
const root = __dirname;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8'
};

const server = http.createServer((request, response) => {
  const requestedPath = decodeURIComponent(request.url.split('?')[0]);
  const relativePath = requestedPath === '/' ? '/index.html' : requestedPath;
  const filePath = path.resolve(root, `.${relativePath}`);

  if (!filePath.startsWith(root + path.sep)) {
    response.writeHead(403);
    response.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Server error');
      return;
    }

    response.writeHead(200, {
      'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream'
    });
    response.end(content);
  });
});

function startServer(p) {
  server.listen(p, () => {
    console.log(`✅ Frontend running on http://localhost:${p}`);
    console.log('✅ Connected to backend API at http://localhost:3001');
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`⚠️ Port ${port} is already in use. Retrying on port ${port + 2}...`);
    port = port + 2;
    startServer(port);
  } else {
    console.error('❌ Server error:', err);
  }
});

startServer(port);
