import express from 'express';
import { register, login, getProfile, updateProfile, updateMentoringSummary, getPublicProfile, uploadProfileImage } from '../controller/adviserController.js';
import { protectRoute, authorizeRoles } from '../middleware/auth.js';  // Changed from authMiddleware.js to auth.js
import { upload } from '../utils/fileUpload.js';

// ... existing code ...
const router = express.Router();

// Auth routes
router.post('/register', register);
router.post('/login', login);

// Profile routes (protected)
router.get('/profile', protectRoute, authorizeRoles('adviser'), getProfile);
router.put('/profile', protectRoute, authorizeRoles('adviser'), updateProfile);
router.put('/profile/mentoring', protectRoute, authorizeRoles('adviser'), updateMentoringSummary);

// Public profile route (not protected)
router.get('/profile/:id', getPublicProfile);

router.post(
  '/profile/upload-image',
  protectRoute,
  authorizeRoles('adviser'),
  upload.single('profileImage'),
  uploadProfileImage
);

export default router;
