const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

let port = Number(process.env.FRONTEND_PORT) || 3000;

const HOST = '0.0.0.0';
const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 3001;

const root = __dirname;
const updatedImg = path.join(root, 'assets', 'image (2).jpg');
const assetsImg = path.join(root, 'assets', 'images.png');
const targetLogoJpg = path.join(root, 'ministry-logo.jpg');
const targetLogoPng = path.join(root, 'ministry-logo.png');
try {
  if (fs.existsSync(updatedImg)) {
    fs.copyFileSync(updatedImg, assetsImg);
    fs.copyFileSync(updatedImg, targetLogoJpg);
    fs.copyFileSync(updatedImg, targetLogoPng);
    fs.copyFileSync(updatedImg, path.join(root, 'image.jpg'));
  } else if (fs.existsSync(assetsImg)) {
    fs.copyFileSync(assetsImg, targetLogoJpg);
    fs.copyFileSync(assetsImg, targetLogoPng);
    fs.copyFileSync(assetsImg, path.join(root, 'image.jpg'));
  }
} catch (e) {}

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};


// Find laptop IPv4 address
function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
}


const server = http.createServer((request, response) => {

  // ================================
  // API PROXY
  // ================================
  // Browser:
  // http://10.20.212.81:3000/api/...
  //
  // Forward internally to:
  // http://127.0.0.1:3001/api/...
  // ================================

  if (request.url.startsWith('/api/')) {

    const options = {
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: request.url,
      method: request.method,
      headers: request.headers
    };

    const proxyRequest = http.request(options, (proxyResponse) => {

      response.writeHead(
        proxyResponse.statusCode,
        proxyResponse.headers
      );

      proxyResponse.pipe(response);
    });


    proxyRequest.on('error', (error) => {

      console.error('❌ Backend connection error:', error.message);

      response.writeHead(502, {
        'Content-Type': 'application/json'
      });

      response.end(JSON.stringify({
        error: 'Backend API is not available'
      }));

    });


    request.pipe(proxyRequest);

    return;
  }


  // ================================
  // STATIC FRONTEND FILES
  // ================================

  const requestedPath =
    decodeURIComponent(request.url.split('?')[0]);

  let relativePath =
    requestedPath === '/'
      ? '/index.html'
      : requestedPath;

  let filePath =
    path.resolve(root, `.${relativePath}`);


  // Security check
  if (!filePath.startsWith(root + path.sep)) {

    response.writeHead(403);

    response.end('Forbidden');

    return;
  }


  fs.readFile(filePath, (error, content) => {

    if (!error) {

      response.writeHead(200, {
        'Content-Type':
          contentTypes[path.extname(filePath)]
          || 'application/octet-stream'
      });

      response.end(content);

      return;
    }


    // React SPA fallback
    if (error.code === 'ENOENT') {

      if (relativePath.includes('logo') || relativePath.endsWith('.jpg') || relativePath.endsWith('.png')) {
        const logoImgPath = fs.existsSync(updatedImg) ? updatedImg : (fs.existsSync(assetsImg) ? assetsImg : path.join(root, '..', 'image.jpg'));
        if (fs.existsSync(logoImgPath)) {
          try { fs.copyFileSync(logoImgPath, targetLogoJpg); fs.copyFileSync(logoImgPath, filePath); } catch(e){}
          fs.readFile(logoImgPath, (err2, imgContent) => {
            if (!err2) {
              const ext = path.extname(logoImgPath);
              response.writeHead(200, { 'Content-Type': contentTypes[ext] || 'image/jpeg' });
              response.end(imgContent);
              return;
            }
          });
          return;
        }
      }

      const indexPath =
        path.join(root, 'index.html');

      fs.readFile(indexPath, (indexError, indexContent) => {

        if (indexError) {

          response.writeHead(404);

          response.end('Not found');

          return;
        }

        response.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8'
        });

        response.end(indexContent);

      });

      return;
    }


    response.writeHead(500);

    response.end('Server error');

  });

});


function startServer(p) {

  server.listen(p, HOST, () => {

    console.log('');
    console.log('===========================================');
    console.log(' MWCA GRIEVANCE MANAGEMENT SYSTEM');
    console.log('===========================================');

    console.log(`✅ Local:   http://localhost:${p}`);

    const ips = getNetworkIPs();

    ips.forEach(ip => {

      console.log(
        `✅ Network: http://${ip}:${p}`
      );

    });

    console.log(
      `✅ Backend: http://${BACKEND_HOST}:${BACKEND_PORT}`
    );

    console.log('===========================================');
    console.log('');

  });

}


server.on('error', (err) => {

  if (err.code === 'EADDRINUSE') {

    console.log(
      `⚠️ Port ${port} is already in use.`
    );

    console.log(
      `⚠️ Retrying on port ${port + 2}...`
    );

    port = port + 2;

    startServer(port);

  } else {

    console.error(
      '❌ Server error:',
      err
    );

  }

});


startServer(port);