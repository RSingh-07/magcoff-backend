import orderService from '../services/orderService.js';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

const orderController = {
  async placeOrder(req, res) {
    try {
      const { paymentMethod, transactionId } = req.body;
      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: 'paymentMethod is required' });
      }
      const data = await orderService.placeOrder(
        getUserId(req), paymentMethod, transactionId,
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getByUser(req, res) {
    try {
      const data = await orderService.getByUserId(getUserId(req));
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

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