import productRepository from '../repositories/productRepository.js';

const productService = {
  async getAll()               { return productRepository.findAll(); },
  async getById(id)            { const p = await productRepository.findById(id);      if (!p) throw new Error('Product not found');              return p; },
  async getByBarcode(barcode)  { const p = await productRepository.findByBarcode(barcode); if (!p) throw new Error(`No product for barcode: ${barcode}`); return p; },
  async getByCategory(cat)     { return productRepository.findByCategory(cat); },
  async getCategories()        { return productRepository.findAllCategories(); },
  async search(query)          { if (!query || query.trim().length < 2) throw new Error('Query must be at least 2 characters'); return productRepository.search(query.trim()); },
};

export default productService;