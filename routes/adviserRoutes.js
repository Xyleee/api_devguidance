import express from 'express';
import { register, login, getProfile, updateProfile, updateMentoringSummary, getPublicProfile, uploadProfileImage, applyForAdviserRole, getApplicationStatus } from '../controller/adviserController.js';
import { protectRoute, authorizeRoles } from '../middleware/auth.js';  // Changed from authMiddleware.js to auth.js
import { upload } from '../utils/fileUpload.js';
import multer from 'multer';
import path from 'path';

// ... existing code ...
const router = express.Router();

// In your login route handlers in api_devguidance/routes/
// Add these headers for login responses:
res.header('Access-Control-Allow-Credentials', 'true');
res.header('Access-Control-Allow-Origin', req.headers.origin); // Dynamically set to the requesting origin

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, './uploads/resumes');
  },
  filename: function(req, file, cb) {
    cb(null, `resume-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const uploadMulter = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Accept PDF, DOC, DOCX files only
    const filetypes = /pdf|doc|docx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX files are allowed!'));
    }
  }
});

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

// Apply for adviser/mentor role
router.post('/apply', uploadMulter.single('resume'), applyForAdviserRole);

// Check application status by email
router.get('/application-status/:email', getApplicationStatus);

export default router;
