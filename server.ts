import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import apiApp from "./api/index"; // Import the Express app

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // The app is normally deployed behind a reverse proxy (for example Vercel).
  // Trust only the first proxy so request IP based protections remain meaningful.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((_req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      "Cross-Origin-Opener-Policy": "same-origin",
    });
    next();
  });

  // Mount the API routes
  app.use(apiApp);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use((_req, res, next) => {
      res.set(
        "Content-Security-Policy",
        "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; " +
          "script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; " +
          "connect-src 'self'; frame-src https://megaplay.buzz https://vidsrc2.ru https:"
      );
      next();
    });
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
