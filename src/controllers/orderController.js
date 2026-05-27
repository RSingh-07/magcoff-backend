/**
 * orderController.js
 *
 * SECURITY MIGRATION COMPLETE:
 * userId is now extracted exclusively from req.user (injected by
 * authenticateToken middleware). It is NEVER read from req.body
 * or req.params. Client cannot spoof identity.
 */

import orderService from '../services/orderService.js';

const orderController = {

  // POST /orders  — body: { paymentMethod, transactionId }
  async placeOrder(req, res) {
    try {
      const { userId }                     = req.user;
      const { paymentMethod, transactionId } = req.body;

      if (!paymentMethod) {
        return res.status(400).json({
          success: false,
          message: 'paymentMethod is required',
        });
      }

      const data = await orderService.placeOrder(
        userId,
        paymentMethod,
        transactionId,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  },

  // GET /orders/
  async getByUser(req, res) {
    try {
      const { userId } = req.user;
      const data = await orderService.getByUserId(userId);
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  // GET /orders/receipt/:orderId  — public, no auth required
  async getReceipt(req, res) {
    try {
      const data = await orderService.getByOrderId(req.params.orderId);
      res.json({ success: true, data });
    } catch (err) {
      res.status(404).json({ success: false, message: err.message });
    }
  },
};

export default orderController;