import { Router } from 'express';
import {
  getSystemHealth,
  triggerKillSwitch,
  resetKillSwitch
} from '../controllers/systemController.js';

const router = Router();

router.get('/health', getSystemHealth);
router.post('/kill-switch', triggerKillSwitch);
router.post('/kill-switch/reset', resetKillSwitch);

export default router;
