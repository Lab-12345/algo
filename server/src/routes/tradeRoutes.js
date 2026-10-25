import { Router } from 'express';
import { getTrades } from '../controllers/tradeController.js';

const router = Router();

router.get('/', getTrades);

export default router;
