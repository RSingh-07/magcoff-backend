import orderService from '../services/orderService.js';

const getUserId = (req) => req.user.oid || req.user.userId || req.user.sub;

const orderController = {
  async placeOrder(req, res) {
    try {
      const { paymentMethod, transactionId } = req.body;
      if (!paymentMethod) {
        return res.status(400).json({ success: false, message: 'paymentMethod is required' });
      }
      const userId = getUserId(req);
      console.log(`💳 PLACE ORDER START: user=${userId} method=${paymentMethod} txnId=${transactionId || 'none'}`);

      const data = await orderService.placeOrder(userId, paymentMethod, transactionId);

      console.log(`✅ PLACE ORDER SUCCESS: user=${userId} orderId=${data.orderId} total=${data.total}`);
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error(`❌ PLACE ORDER FAILED: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getByUser(req, res) {
    try {
      const userId = getUserId(req);
      console.log(`📋 GET ORDERS START: user=${userId}`);

      const data = await orderService.getByUserId(userId);

      console.log(`✅ GET ORDERS SUCCESS: user=${userId} count=${data.length}`);
      res.json({ success: true, count: data.length, data });
    } catch (err) {
      console.error(`❌ GET ORDERS FAILED: ${err.message}`);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getReceipt(req, res) {
    try {
      const { orderId } = req.params;
      console.log(`🧾 GET RECEIPT START: orderId=${orderId}`);

      const data = await orderService.getByOrderId(orderId);

      console.log(`✅ GET RECEIPT SUCCESS: orderId=${orderId}`);
      res.json({ success: true, data });
    } catch (err) {
      console.error(`❌ GET RECEIPT FAILED: ${err.message}`);
      res.status(404).json({ success: false, message: err.message });
    }
  },
};

export default orderController; 