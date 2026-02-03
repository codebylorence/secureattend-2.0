import express from 'express';
import { 
    startAbsentMarking, 
    stopAbsentMarking, 
    getAbsentMarkingStatus, 
    runAbsentMarkingNow 
} from '../controllers/absentMarkingController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All absent marking routes require admin access
router.use(authenticateToken);
router.use(requireAdmin);

// Start the absent marking service
router.post('/start', startAbsentMarking);

// Stop the absent marking service
router.post('/stop', stopAbsentMarking);

// Get service status
router.get('/status', getAbsentMarkingStatus);

// Manually run absent marking
router.post('/run-now', runAbsentMarkingNow);

export default router;