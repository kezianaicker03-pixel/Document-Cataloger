import express from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import {
  getCatalogerStatus,
  scanAndCatalogFolder,
  uploadAndCatalogInvoice,
  resetProcessedCache,
  getAuditLogs,
} from './server/catalogerEngine.js';
import {
  getOrCreateInvoiceTrackerSpreadsheet,
  readInvoiceTrackerRows,
} from './server/googleWorkspaceService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max file size
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Determine OAuth Client ID
  let oAuthClientId = process.env.GOOGLE_CLIENT_ID || '';
  if (!oAuthClientId) {
    try {
      const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(configPath)) {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (configData.oAuthClientId) {
          oAuthClientId = configData.oAuthClientId;
        }
      }
    } catch (e) {
      console.warn('Could not read firebase-applet-config.json:', e);
    }
  }
  if (!oAuthClientId) {
    oAuthClientId = '966397355862-3rntfannckf67lukq2qvik2ts18al262.apps.googleusercontent.com';
  }

  // Middleware to extract Google Bearer token
  const requireGoogleAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized. Please connect your Google account with Drive and Sheets permissions.',
      });
    }
    (req as any).googleAccessToken = authHeader.split(' ')[1];
    next();
  };

  // --- API Routes ---
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Document Cataloger', timestamp: new Date().toISOString() });
  });

  app.get('/api/auth/config', (req, res) => {
    res.json({
      clientId: oAuthClientId,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
      ],
    });
  });

  app.get('/api/status', requireGoogleAuth, async (req, res) => {
    try {
      const token = (req as any).googleAccessToken;
      const status = await getCatalogerStatus(token);
      res.json(status);
    } catch (err: any) {
      console.error('Error fetching cataloger status:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch status' });
    }
  });

  app.post('/api/scan', requireGoogleAuth, async (req, res) => {
    try {
      const token = (req as any).googleAccessToken;
      const result = await scanAndCatalogFolder(token);
      res.json(result);
    } catch (err: any) {
      console.error('Error scanning folder:', err);
      res.status(500).json({ error: err.message || 'Failed to scan folder' });
    }
  });

  app.post('/api/upload', requireGoogleAuth, upload.single('file'), async (req, res) => {
    try {
      const token = (req as any).googleAccessToken;
      if (!req.file) {
        return res.status(400).json({ error: 'No invoice document provided for upload.' });
      }

      const invoice = await uploadAndCatalogInvoice(
        token,
        req.file.originalname,
        req.file.mimetype,
        req.file.buffer
      );

      res.json({ success: true, invoice });
    } catch (err: any) {
      console.error('Error uploading invoice:', err);
      res.status(500).json({ error: err.message || 'Failed to upload and catalog invoice' });
    }
  });

  app.get('/api/sheet-data', requireGoogleAuth, async (req, res) => {
    try {
      const token = (req as any).googleAccessToken;
      const sheet = await getOrCreateInvoiceTrackerSpreadsheet(token, 'Invoice Tracker');
      const data = await readInvoiceTrackerRows(token, sheet.id);
      res.json({
        sheetId: sheet.id,
        sheetTitle: sheet.name,
        webViewLink: sheet.webViewLink,
        headers: data.headers,
        rows: data.rows,
      });
    } catch (err: any) {
      console.error('Error fetching sheet rows:', err);
      res.status(500).json({ error: err.message || 'Failed to fetch sheet rows' });
    }
  });

  app.post('/api/reset-cache', requireGoogleAuth, (req, res) => {
    resetProcessedCache();
    res.json({ success: true, message: 'Catalog cache reset successfully.' });
  });

  app.get('/api/logs', requireGoogleAuth, (req, res) => {
    res.json({ logs: getAuditLogs() });
  });

  // --- Vite Dev or Production Static Files ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Document Cataloger server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
