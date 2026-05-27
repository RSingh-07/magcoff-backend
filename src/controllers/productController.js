import productService from '../services/productService.js';

const productController = {
  // GET /products
  // GET /products?category=Beverages
  // GET /products?search=coconut
  async getAll(req, res) {
    try {
      const { category, search } = req.query;
      let data;
      if (search)        data = await productService.search(search);
      else if (category) data = await productService.getByCategory(category);
      else               data = await productService.getAll();
      res.json({ success: true, count: data.length, data });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  // GET /products/categories
  async getCategories(_req, res) {
    try {
      const data = await productService.getCategories();
      res.json({ success: true, data });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
  },

  // GET /products/barcode/:barcode
  async getByBarcode(req, res) {
    try {
      const data = await productService.getByBarcode(req.params.barcode);
      res.json({ success: true, data });
    } catch (err) { res.status(404).json({ success: false, message: err.message }); }
  },

  // GET /products/:id
  async getById(req, res) {
    try {
      const data = await productService.getById(req.params.id);
      res.json({ success: true, data });
    } catch (err) { res.status(404).json({ success: false, message: err.message }); }
  },
};

export default productController;