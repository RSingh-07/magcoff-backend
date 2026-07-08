import Cart from '../models/Cart.js';

const cartRepository = {
  async findActiveByUserId(userId)   { return Cart.findOne({ userId, status: 'active' }).lean(); },
  async findById(id)                 { return Cart.findById(id).lean(); },

  // Used by the Jetson /cart/update endpoint to locate the Mongo cart
  // bound to a given physical trolley (set during /cart/link).
  // Deliberately scoped to status: 'active' — hardware weight pushes should
  // only ever write to the currently-active cart, never a historical
  // checked-out one.
  async findByPhysicalCartId(physicalCartId) {
    return Cart.findOne({ physicalCartId, status: 'active' }).lean();
  },

  // Used by /cart/unlink after checkout. Deliberately NOT scoped to
  // status: 'active' — by the time unlink runs, placeOrder() has already
  // marked this cart 'checked_out', so the active-only query above would
  // never find it and physicalCartId would silently never get cleared.
  // This looks up the cart regardless of status so the cleanup actually
  // lands on the right document.
  async findAnyByPhysicalCartId(physicalCartId) {
    return Cart.findOne({ physicalCartId }).lean();
  },

  async create(data)                 { return new Cart(data).save(); },
  async updateById(id, data)         { return Cart.findByIdAndUpdate(id, { ...data, updatedAt: new Date() }, { new: true }).lean(); },
  async markCheckedOut(id)           { return Cart.findByIdAndUpdate(id, { status: 'checked_out', updatedAt: new Date() }, { new: true }).lean(); },
};

export default cartRepository;