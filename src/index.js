/**
 * Magcoff SmartCart Backend
 * Database: MagcoffDB
 *
 * SECURITY CHANGES:
 * - CORS locked to allowed origins only
 * - JSON body size capped at 10kb
 * - NODE_ENV=production blocks DEV_AUTH_BYPASS at startup
 */

import 'dotenv/config';
import express  from 'express';
import cors     from 'cors';
import mongoose from 'mongoose';

import productRoutes from './routes/productRoutes.js';
import userRoutes    from './routes/userRoutes.js';
import cartRoutes    from './routes/cartRoutes.js';
import orderRoutes   from './routes/orderRoutes.js';

const app  = express();
const PORT = process.env.PORT || 8080;

// ── Safety check — prevent dev bypass reaching production ─────────────────────
if (
  process.env.NODE_ENV === 'production' &&
  process.env.DEV_AUTH_BYPASS === 'true'
) {
  console.error('❌  DEV_AUTH_BYPASS=true is not allowed in production. Exiting.');
  process.exit(1);
}

// ── CORS ──────────────────────────────────────────────────────────────────────
// In development: allow all origins so Flutter emulator works without config.
// In production:  lock to your actual deployed app origin.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    // In development allow everything
    if (process.env.NODE_ENV !== 'production') return callback(null, true);

    // In production only allow listed origins
    if (allowedOrigins.includes(origin)) return callback(null, true);

    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsing — cap at 10kb to prevent large payload attacks ───────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    status:   'ok',
    message:  '🛒 Magcoff SmartCart API',
    database: 'MagcoffDB',
    db:       mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    auth:     process.env.DEV_AUTH_BYPASS === 'true' ? 'DEV_BYPASS' : 'AZURE_B2C',
  });
});

// ── Debug — development only ──────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.get('/debug', async (_req, res) => {
    const db          = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    res.json({
      database:    db.databaseName,
      collections: collections.map(c => c.name),
      authMode:    process.env.DEV_AUTH_BYPASS === 'true' ? 'DEV_BYPASS' : 'AZURE_B2C',
      bypassUser:  process.env.DEV_AUTH_BYPASS === 'true'
        ? process.env.DEV_AUTH_USER_ID
        : null,
    });
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/products', productRoutes);   // fully public
app.use('/users',    userRoutes);      // /profile protected, register/login open
app.use('/cart',     cartRoutes);      // fully protected
app.use('/orders',   orderRoutes);     // protected except /receipt/:orderId

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('❌ Error:', err);

  // CORS errors
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: err.message });
  }

  res.status(500).json({ success: false, message: err.message });
});

// ── Connect to Atlas → Start server ──────────────────────────────────────────
const { MONGODB_URI } = process.env;

if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set in .env');
  process.exit(1);
}

mongoose.connect(MONGODB_URI).then(() => {
  console.log('✅  Connected to MongoDB Atlas — MagcoffDB');
  console.log(`🔐  Auth mode: ${process.env.DEV_AUTH_BYPASS === 'true' ? '⚠️  DEV BYPASS (no token required)' : '✅  Azure AD B2C'}`);
  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`📦  Products → GET  http://localhost:${PORT}/products`);
    console.log(`👤  Profile  → GET  http://localhost:${PORT}/users/profile`);
    console.log(`🛒  Cart     → GET  http://localhost:${PORT}/cart`);
    console.log(`📋  Orders   → GET  http://localhost:${PORT}/orders`);
  });
}).catch((err) => {
  console.error('❌  MongoDB connection failed:', err.message);
  process.exit(1);
});