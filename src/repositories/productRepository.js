import Product from '../models/Product.js';

const productRepository = {
  async findAll()                  { return Product.find({ inStock: true }).lean(); },
  async findById(id)               { return Product.findById(id).lean(); },
  async findByBarcode(barcode)     { return Product.findOne({ barcode }).lean(); },
  async findByCategory(category)   { return Product.find({ category, inStock: true }).lean(); },
  async findAllCategories()        { return Product.distinct('category'); },
  async search(query)              { return Product.find({ $text: { $search: query }, inStock: true }).lean(); },
};

export default productRepository;