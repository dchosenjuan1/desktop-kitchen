import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDb } from './db.js';

// Import routes
import menuRoutes from './routes/menu.js';
import ordersRoutes from './routes/orders.js';
import paymentsRoutes from './routes/payments.js';
import inventoryRoutes from './routes/inventory.js';
import employeesRoutes from './routes/employees.js';
import reportsRoutes from './routes/reports.js';
import aiRoutes from './routes/ai.js';
import modifiersRoutes from './routes/modifiers.js';
import combosRoutes from './routes/combos.js';
import printersRoutes from './routes/printers.js';
import deliveryRoutes from './routes/delivery.js';
import purchaseOrdersRoutes from './routes/purchase-orders.js';
import loyaltyRoutes from './routes/loyalty.js';
import { initAI } from './ai/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// API Routes
app.use('/api/menu', menuRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/employees', employeesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/modifiers', modifiersRoutes);
app.use('/api/combos', combosRoutes);
app.use('/api/printers', printersRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/loyalty', loyaltyRoutes);

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server (async IIFE to handle initDb)
(async () => {
  try {
    await initDb();
    initAI();
    app.listen(PORT, () => {
      console.log(`Juanbertos POS server running on port ${PORT}`);
      console.log(`Database: ${path.join(__dirname, '../data/juanbertos.db')}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
})();
