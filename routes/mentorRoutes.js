import express from 'express';
import { 
  getMentorRequests, 
  respondToRequest 
} from '../controller/mentorshipController.js';
import { protectRoute, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// Mentorship request routes (protected)
router.get('/requests', protectRoute, authorizeRoles('adviser'), getMentorRequests);
router.put('/requests/:requestId', protectRoute, authorizeRoles('adviser'), respondToRequest);

export default router;
