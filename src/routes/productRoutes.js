import { Router } from 'express';
import productController from '../controllers/productController.js';

const router = Router();

// Static routes MUST come before /:id
router.get('/categories',       productController.getCategories);
router.get('/barcode/:barcode', productController.getByBarcode);
router.get('/',                 productController.getAll);
router.get('/:id',              productController.getById);

export default router;