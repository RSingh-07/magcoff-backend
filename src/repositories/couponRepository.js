import Coupon from '../models/Coupon.js';

const couponRepository = {
  async findActiveByCode(code) {
    return Coupon.findOne({ code: code.toUpperCase(), isActive: true }).lean();
  },
};

export default couponRepository;