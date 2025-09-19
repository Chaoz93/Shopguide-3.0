import express from 'express';
import serveStatic from 'serve-static';
import path from 'node:path';
import fs from 'node:fs';
import process from 'node:process';
import open from 'open';

const DEFAULT_PORT = 5173;
// Explicit MIME overrides for a few extensions that older environments mis-detect.
const MIME_OVERRIDES = new Map([
  ['.js', 'text/javascript'],
  ['.mjs', 'text/javascript'],
  ['.json', 'application/json'],
  ['.wasm', 'application/wasm']
]);

// Lightweight CLI parsing so we can accept --port, --root and --open flags.
function parseArgs(argv) {
  const options = { open: true };

  const takeOptionValue = (index, inlineValue) => {
    if (inlineValue !== undefined && inlineValue.length > 0) {
      return { value: inlineValue, nextIndex: index };
    }
    const candidate = argv[index + 1];
    if (candidate === undefined || candidate.startsWith('-')) {
      return { value: undefined, nextIndex: index };
    }
    return { value: candidate, nextIndex: index + 1 };
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === '--') {
      break;
    }

    if (arg.startsWith('--')) {
      const [name, inlineValue] = arg.includes('=') ? arg.split('=', 2) : [arg, undefined];
      switch (name) {
        case '--port': {
          const { value, nextIndex } = takeOptionValue(i, inlineValue);
          i = nextIndex;
          if (value === undefined) {
            console.warn('Ignoring --port without a value.');
            break;
          }
          const parsedPort = Number.parseInt(value, 10);
          if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
            options.port = parsedPort;
          } else {
            console.warn(`Ignoring invalid --port value: ${value}`);
          }
          break;
        }
        case '--root': {
          const { value, nextIndex } = takeOptionValue(i, inlineValue);
          i = nextIndex;
          if (value === undefined) {
            console.warn('Ignoring --root without a value.');
            break;
          }
          options.root = value;
          break;
        }
        case '--open': {
          const { value, nextIndex } = takeOptionValue(i, inlineValue);
          i = nextIndex;
          if (value === undefined) {
            options.open = true;
            break;
          }
          options.open = value !== 'false';
          break;
        }
        case '--no-open':
          options.open = false;
          break;
        default:
          break;
      }
      continue;
    }

    if (arg === '-p') {
      const { value, nextIndex } = takeOptionValue(i, undefined);
      i = nextIndex;
      if (value === undefined) {
        console.warn('Ignoring -p without a value.');
        continue;
      }
      const parsedPort = Number.parseInt(value, 10);
      if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
        options.port = parsedPort;
      } else {
        console.warn(`Ignoring invalid -p value: ${value}`);
      }
    }
  }

  return options;
}

// Try to locate a reasonable SPA fallback file so we can serve index routes.
function resolveFallback(rootDir) {
  const candidates = ['index.html', '3-1-7.html', 'V3-1-7.html'];
  for (const candidate of candidates) {
    const absolute = path.join(rootDir, candidate);
    try {
      if (fs.statSync(absolute).isFile()) {
        return { file: candidate, absolute };
      }
    } catch (error) {
      // ignore
    }
  }
  return null;
}

async function start() {
  const args = parseArgs(process.argv.slice(2));
  const rawEnvPort = process.env.PORT;
  const envPort = rawEnvPort !== undefined ? Number.parseInt(rawEnvPort, 10) : undefined;
  if (rawEnvPort !== undefined && (!Number.isInteger(envPort) || envPort <= 0 || envPort > 65535)) {
    console.warn(`Ignoring invalid PORT environment value: ${rawEnvPort}`);
  }
  const port = Number.isInteger(args.port) ? args.port : Number.isInteger(envPort) ? envPort : DEFAULT_PORT;

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error('Invalid port number.');
    process.exit(1);
  }

  // Determine which directory to serve (defaults to the current working directory).
  const rootDir = path.resolve(args.root ?? process.cwd());
  let rootStats;
  try {
    rootStats = fs.statSync(rootDir);
  } catch (error) {
    console.error(`Root directory "${rootDir}" does not exist or is not accessible.`);
    process.exit(1);
  }

  if (!rootStats.isDirectory()) {
    console.error(`Root path "${rootDir}" is not a directory.`);
    process.exit(1);
  }

  const fallback = resolveFallback(rootDir);

  if (!fallback) {
    console.warn('Warning: No SPA fallback HTML file found (expected index.html). Requests to non-file routes will return 404.');
  } else if (fallback.file !== 'index.html') {
    console.warn(`SPA fallback file "${fallback.file}" found. Consider renaming it to index.html for consistency.`);
  }

  const app = express();
  app.disable('x-powered-by');

  // Dev-friendly CORS headers – allow localhost with any port.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] ?? '*');
    }

    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }

    next();
  });

  // Simple request logging with latency information.
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - started;
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Serve static assets from the chosen root directory.
  app.use(
    serveStatic(rootDir, {
      index: false,
      fallthrough: true,
      setHeaders: (res, filePath) => {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.html') {
          res.setHeader('Cache-Control', 'no-store');
        }
        const overrideType = MIME_OVERRIDES.get(ext);
        if (overrideType) {
          res.setHeader('Content-Type', overrideType);
        }
      }
    })
  );

  // SPA fallback – any GET/HEAD request that didn't match a file serves index.html (or closest match).
  if (fallback) {
    app.get('*', (req, res, next) => {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        next();
        return;
      }
      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(fallback.absolute, err => {
        if (err) {
          next(err);
        }
      });
    });
  }

  // Final 404 handler for requests we don't recognise.
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  // Express error-handling middleware with guard for headers already sent.
  app.use((err, req, res, next) => {
    console.error('Error handling request', err);
    if (res.headersSent) {
      next(err);
      return;
    }
    res.status(500).send('Internal Server Error');
  });

  // Launch the HTTP server.
  const server = app.listen(port, async () => {
    const address = server.address();
    const host = typeof address === 'string' ? address : `http://localhost:${address.port}`;
    console.log(`Serving ${rootDir}`);
    if (fallback) {
      console.log(`SPA fallback file: ${fallback.file}`);
    }
    console.log(`Listening on ${host}`);

    // Optionally open the default browser once the server is ready.
    if (args.open) {
      const url = `http://localhost:${port}`;
      try {
        await open(url);
      } catch (error) {
        console.error('Failed to open browser automatically:', error);
      }
    }
  });

  // Gracefully shut down on Ctrl+C or kill.
  const signals = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down...`);
      server.close(() => {
        process.exit(0);
      });
    });
  }
}

start().catch(error => {
  console.error('Failed to start dev server:', error);
  process.exit(1);
});
