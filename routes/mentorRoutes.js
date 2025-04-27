import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
  getMentorRequests, 
  respondToRequest
} from '../controller/mentorshipController.js';
import { applyForAdviserRole } from '../controller/adviserController.js';
import { protectRoute, authorizeRoles } from '../middleware/auth.js';

const router = express.Router();

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Setup upload directory for resumes
const resumeUploadDir = path.join(__dirname, '../uploads/resumes');
// Ensure directory exists
if (!fs.existsSync(resumeUploadDir)) {
  fs.mkdirSync(resumeUploadDir, { recursive: true });
}

// Configure storage for resumes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, resumeUploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueName = 'resume-' + Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

// Configure multer
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function(req, file, cb) {
    // Accept PDF and doc files
    const filetypes = /pdf|doc|docx/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF and Word documents are allowed!'));
  }
});

// Mentorship request routes (protected)
router.get('/requests', protectRoute, authorizeRoles('adviser'), getMentorRequests);
router.put('/requests/:requestId', protectRoute, authorizeRoles('adviser'), respondToRequest);

// Add new routes for mentor application
router.post('/upload-resume', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    // Return the file path relative to the uploads directory
    const filePath = `/uploads/resumes/${req.file.filename}`;
    
    res.json({
      success: true,
      filePath,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file',
      error: error.message
    });
  }
});

// Route to handle the mentor application submission
router.post('/apply', async (req, res) => {
  try {
    // The resumePath is already in req.body as shown in the console output
    // We need to modify the request to fit what applyForAdviserRole expects
    return applyForAdviserRole(req, res);
  } catch (error) {
    console.error('Mentor application error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
});

export default router;
