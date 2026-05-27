import Cart from '../models/Cart.js';

const cartRepository = {
  async findActiveByUserId(userId)   { return Cart.findOne({ userId, status: 'active' }).lean(); },
  async findById(id)                 { return Cart.findById(id).lean(); },
  async create(data)                 { return new Cart(data).save(); },
  async updateById(id, data)         { return Cart.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).lean(); },
  async markCheckedOut(id)           { return Cart.findByIdAndUpdate(id, { status: 'checked_out', updatedAt: new Date() }, { new: true }).lean(); },
};

export default cartRepository;