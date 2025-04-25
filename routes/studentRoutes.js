import express from 'express';
import { register, login } from '../controller/studentController.js';
import { 
  getAvailableMentors, 
  requestMentorship, 
  getStudentRequests 
} from '../controller/mentorshipController.js';
import { protectRoute, authorizeRoles } from '../middleware/auth.js';

// In your login route handlers in api_devguidance/routes/
// Add these headers for login responses:
res.header('Access-Control-Allow-Credentials', 'true');
res.header('Access-Control-Allow-Origin', req.headers.origin); // Dynamically set to the requesting origin

const router = express.Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Mentorship routes (protected)
router.get('/mentors', protectRoute, authorizeRoles('student'), getAvailableMentors);
router.post('/request-mentorship', protectRoute, authorizeRoles('student'), requestMentorship);
router.get('/mentorship-requests', protectRoute, authorizeRoles('student'), getStudentRequests);

export default router;