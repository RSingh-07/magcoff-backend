import { Router }      from 'express';
import orderController from '../controllers/orderController.js';

// Known Issue #2 fix: GET /orders/receipt/:orderId is intentionally public
// (e.g. for shared receipt links). It previously lived inside orderRoutes.js
// registered before the protected routes, but index.js mounted the ENTIRE
// orderRoutes router behind authenticateToken
// (app.use('/orders', authenticateToken, orderRoutes)), so the middleware
// ran before Express ever reached this route's own logic — making it
// effectively non-public despite the code's intent.
//
// This dedicated router is mounted in index.js WITHOUT authenticateToken,
// directly at /orders, before the protected orderRoutes router is mounted
// at the same prefix — guaranteeing this specific path is reachable
// without a token while everything else under /orders still requires one.

const router = Router();

router.get('/receipt/:orderId', orderController.getReceipt);

export default router;