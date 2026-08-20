import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getSettings,
  updateSettings,
  getVouchers,
  getVoucherByIdOrTracking,
  createVoucher,
  updateVoucher,
  validateVoucher,
  batchValidateVouchers,
  deleteVoucher,
  batchUpdateStatus,
  batchDelete,
  getStats,
  seedInitialDataIfEmpty,
  getDatabaseExplorerData
} from './src/db/repository.ts';
import { createPool } from './src/db/index.ts';

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Seed default data if database is brand new
  seedInitialDataIfEmpty().catch(err => {
    console.warn('Seed database check notice:', err?.message || err);
  });

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', async (req: Request, res: Response) => {
    try {
      const stats = await getStats();
      res.json({
        status: 'ok',
        database: 'supabase-postgresql',
        time: new Date().toISOString(),
        totalVouchers: stats.totalVouchers
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Settings: GET
  app.get('/api/settings', async (req: Request, res: Response) => {
    try {
      const settings = await getSettings();
      res.json(settings);
    } catch (err: any) {
      console.error('API /api/settings GET error:', err);
      res.status(500).json({ error: 'Erreur lors de la lecture des paramètres' });
    }
  });

  // Settings: POST / PUT
  app.post('/api/settings', async (req: Request, res: Response) => {
    try {
      const updated = await updateSettings(req.body);
      res.json({ success: true, settings: updated });
    } catch (err: any) {
      console.error('API /api/settings POST error:', err);
      res.status(500).json({ error: 'Erreur lors de la mise à jour des paramètres' });
    }
  });

  // Vouchers: GET list (with optional query filter, search, sorting)
  app.get('/api/vouchers', async (req: Request, res: Response) => {
    try {
      const search = (req.query.q as string) || '';
      const status = req.query.status as string;
      const destination = req.query.destination as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const vouchers = await getVouchers({
        search,
        status,
        destination,
        startDate,
        endDate
      });

      res.json(vouchers);
    } catch (err: any) {
      console.error('API /api/vouchers GET error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement des bons' });
    }
  });

  // Vouchers: GET single by ID or trackingNumber
  app.get('/api/vouchers/:id', async (req: Request, res: Response) => {
    try {
      const idOrTracking = req.params.id;
      const voucher = await getVoucherByIdOrTracking(idOrTracking);
      if (!voucher) {
        res.status(404).json({ error: 'Bon non trouvé' });
        return;
      }
      res.json(voucher);
    } catch (err: any) {
      console.error('API /api/vouchers/:id error:', err);
      res.status(500).json({ error: 'Erreur lors du chargement du bon' });
    }
  });

  // Vouchers: POST create new voucher
  app.post('/api/vouchers', async (req: Request, res: Response) => {
    try {
      const result = await createVoucher(req.body);
      res.status(201).json({
        success: true,
        voucher: result.voucher,
        nextTrackingNumber: result.nextTrackingNumber
      });
    } catch (err: any) {
      console.error('API /api/vouchers POST error:', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la création du bon' });
    }
  });

  // Vouchers: PUT update existing voucher
  app.put('/api/vouchers/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const updated = await updateVoucher(id, req.body);
      res.json({ success: true, voucher: updated });
    } catch (err: any) {
      console.error('API /api/vouchers/:id PUT error:', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la mise à jour du bon' });
    }
  });

  // Vouchers: POST validate voucher (Amine validation workflow)
  app.post('/api/vouchers/:id/validate', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const { isValidated, validatedBy, validationNotes } = req.body;
      const updated = await validateVoucher(id, {
        isValidated: Boolean(isValidated),
        validatedBy: validatedBy || 'Amine',
        validationNotes: validationNotes || ''
      });
      res.json({ success: true, voucher: updated });
    } catch (err: any) {
      console.error('API /api/vouchers/:id/validate error:', err);
      res.status(500).json({ error: err.message || 'Erreur lors de la validation du bon' });
    }
  });

  // Vouchers: DELETE single
  app.delete('/api/vouchers/:id', async (req: Request, res: Response) => {
    try {
      const id = req.params.id;
      const success = await deleteVoucher(id);
      if (!success) {
        res.status(404).json({ error: 'Bon non trouvé' });
        return;
      }
      res.json({ success: true, message: 'Bon supprimé avec succès' });
    } catch (err: any) {
      console.error('API /api/vouchers/:id DELETE error:', err);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Vouchers: Batch Status Update
  app.post('/api/vouchers/batch-status', async (req: Request, res: Response) => {
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || !status) {
        res.status(400).json({ error: 'Paramètres invalides' });
        return;
      }

      const count = await batchUpdateStatus(ids, status);
      res.json({ success: true, updatedCount: count });
    } catch (err: any) {
      console.error('API /api/vouchers/batch-status error:', err);
      res.status(500).json({ error: 'Erreur lors de la mise à jour groupée' });
    }
  });

  // Vouchers: Batch Direct Validate (Amine Admin)
  app.post('/api/vouchers/batch-validate', async (req: Request, res: Response) => {
    try {
      const { ids, validatedBy } = req.body;
      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'Paramètres invalides' });
        return;
      }

      const count = await batchValidateVouchers(ids, validatedBy || 'Amine');
      res.json({ success: true, validatedCount: count });
    } catch (err: any) {
      console.error('API /api/vouchers/batch-validate error:', err);
      res.status(500).json({ error: 'Erreur lors de la validation groupée' });
    }
  });

  // Vouchers: Batch Delete
  app.post('/api/vouchers/batch-delete', async (req: Request, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids)) {
        res.status(400).json({ error: 'Paramètres invalides' });
        return;
      }

      const count = await batchDelete(ids);
      res.json({ success: true, deletedCount: count });
    } catch (err: any) {
      console.error('API /api/vouchers/batch-delete error:', err);
      res.status(500).json({ error: 'Erreur lors de la suppression groupée' });
    }
  });

  // Stats
  app.get('/api/stats', async (req: Request, res: Response) => {
    try {
      const stats = await getStats();
      res.json(stats);
    } catch (err: any) {
      console.error('API /api/stats error:', err);
      res.status(500).json({ error: 'Erreur lors du calcul des statistiques' });
    }
  });

  // Reset Demo Data
  app.post('/api/reset-demo', async (req: Request, res: Response) => {
    try {
      // Re-seed demo
      await deleteVoucher('v-1');
      await deleteVoucher('v-2');
      await seedInitialDataIfEmpty();
      res.json({ success: true, message: 'Données réinitialisées' });
    } catch (err: any) {
      console.error('API /api/reset-demo error:', err);
      res.status(500).json({ error: 'Erreur lors de la réinitialisation' });
    }
  });

  // Database Explorer (Inspect raw tables & schemas)
  app.get('/api/db-explorer', async (req: Request, res: Response) => {
    try {
      const data = await getDatabaseExplorerData();
      res.json(data);
    } catch (err: any) {
      console.error('API /api/db-explorer error:', err);
      res.status(500).json({ error: 'Erreur lors de la lecture des tables' });
    }
  });

  // Direct SQL Query Runner (Instant interactive queries for admin)
  app.post('/api/sql-query', async (req: Request, res: Response) => {
    try {
      const { sql } = req.body;
      if (!sql || typeof sql !== 'string') {
        res.status(400).json({ error: 'Requête SQL requise' });
        return;
      }

      const pool = createPool();
      const start = Date.now();
      const result = await pool.query(sql);
      const durationMs = Date.now() - start;

      res.json({
        success: true,
        rowCount: result.rowCount || result.rows.length,
        columns: result.fields ? result.fields.map(f => f.name) : [],
        rows: result.rows,
        durationMs
      });
    } catch (err: any) {
      console.error('SQL query error:', err);
      res.status(400).json({
        success: false,
        error: err.message || 'Erreur lors de l\'exécution de la requête SQL'
      });
    }
  });

  // --- VITE / STATIC SERVING ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Loyalis Trans] Server connected to PostgreSQL & running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
