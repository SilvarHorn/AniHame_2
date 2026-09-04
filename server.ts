import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index"; // Import the Express app
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Trust the reverse proxy (required for rate limiting behind proxies like Cloud Run/Nginx)
  app.set("trust proxy", 1);

  // Security Middleware
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false,
    referrerPolicy: false,
  }));
  app.use(cors());

  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 2000, // limit each IP to 2000 requests per windowMs
    validate: { xForwardedForHeader: false }, // suppress reverse-proxy header warnings
  });
  app.use("/api", limiter);

  // Mount the API routes
  app.use(apiApp);

  // Serve static public assets directly (e.g. favicons, logo.svg)
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { maxAge: '1y' }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
