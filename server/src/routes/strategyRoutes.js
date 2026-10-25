import { Router } from 'express';
import {
  getStrategies,
  getStrategyById,
  createStrategy,
  updateStrategy,
  enableStrategy,
  disableStrategy,
  deleteStrategy
} from '../controllers/strategyController.js';

const router = Router();

router.get('/', getStrategies);
router.get('/:id', getStrategyById);
router.post('/', createStrategy);
router.put('/:id', updateStrategy);
router.delete('/:id', deleteStrategy);
router.post('/:id/enable', enableStrategy);
router.post('/:id/disable', disableStrategy);

export default router;
