import 'dotenv/config';
import express  from 'express';
import cors     from 'cors';
import mongoose from 'mongoose';
import authenticateToken from './middleware/authenticateToken.js';

import productRoutes        from './routes/productRoutes.js';
import userRoutes           from './routes/userRoutes.js';
import cartRoutes           from './routes/cartRoutes.js';
import orderRoutes          from './routes/orderRoutes.js';
import orderReceiptRoutes   from './routes/orderReceiptRoutes.js';
import notificationRoutes   from './routes/notificationRoutes.js';
import wishlistRoutes       from './routes/wishlistRoutes.js';
import cartController       from './controllers/cartController.js';

const app  = express();
const PORT = process.env.PORT || 8080;

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (process.env.NODE_ENV !== 'production') return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
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
    });
  });
}

// ── Routes ────────────────────────────────────────────────────────────────────
// Public routes (no auth needed)
app.use('/products', productRoutes);

// Public receipt lookup
app.use('/orders', orderReceiptRoutes);

// ── Jetson hardware endpoint (no auth — device has no user token) ─────────────
// Must be mounted BEFORE app.use('/cart', authenticateToken, cartRoutes)
// otherwise the auth middleware would block the Jetson's requests.
app.post('/cart/update', cartController.updateCart);

// Protected routes (auth required)
app.use('/users',             authenticateToken, userRoutes);
app.use('/cart',              authenticateToken, cartRoutes);
app.use('/orders',            authenticateToken, orderRoutes);
app.use('/api/notifications', authenticateToken, notificationRoutes);
app.use('/api/wishlist',      authenticateToken, wishlistRoutes);

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
  console.log(`🔐  Auth mode: ${process.env.DEV_AUTH_BYPASS === 'true' ? '⚠️  DEV BYPASS' : '✅  Azure AD B2C'}`);
  app.listen(PORT, () => {
    console.log(`🚀  Server running on http://localhost:${PORT}`);
    console.log(`📦  Products      → GET  http://localhost:${PORT}/products`);
    console.log(`👤  Profile       → GET  http://localhost:${PORT}/users/profile`);
    console.log(`🛒  Cart          → GET  http://localhost:${PORT}/cart`);
    console.log(`🎟️   Apply coupon  → POST http://localhost:${PORT}/cart/apply-coupon`);
    console.log(`📋  Orders        → GET  http://localhost:${PORT}/orders`);
    console.log(`🧾  Receipt       → GET  http://localhost:${PORT}/orders/receipt/:orderId  (public)`);
    console.log(`❤️   Wishlist      → GET  http://localhost:${PORT}/api/wishlist`);
    console.log(`🔔  Notifications → POST http://localhost:${PORT}/api/notifications/register`);
    console.log(`🤖  Jetson update → POST http://localhost:${PORT}/cart/update  (no auth)`);
  });
}).catch((err) => {
  console.error('❌  MongoDB connection failed:', err.message);
  process.exit(1);
});