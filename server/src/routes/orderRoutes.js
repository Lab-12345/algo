import { Router } from 'express';
import { getOrders, getPositions, reconcileBrokerPositions } from '../controllers/orderController.js';

const router = Router();

router.get('/orders', getOrders);
router.get('/positions', getPositions);
router.post('/reconcile', reconcileBrokerPositions);

export default router;
