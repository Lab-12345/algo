import { Router } from 'express';
import {
  getOrders,
  getPositions,
  reconcileBrokerPositions,
  placeManualOrder,
  closePosition
} from '../controllers/orderController.js';

const router = Router();

router.get('/orders', getOrders);
router.post('/orders/manual', placeManualOrder);
router.get('/positions', getPositions);
router.post('/positions/:id/close', closePosition);
router.post('/reconcile', reconcileBrokerPositions);

export default router;
