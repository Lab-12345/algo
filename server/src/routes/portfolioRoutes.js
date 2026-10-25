import { Router } from 'express';
import {
  getHoldings,
  convertPosition,
  getBrokerPositions
} from '../controllers/portfolioController.js';

const router = Router();

router.get('/holdings', getHoldings);
router.get('/positions', getBrokerPositions);
router.post('/convert-position', convertPosition);

export default router;
