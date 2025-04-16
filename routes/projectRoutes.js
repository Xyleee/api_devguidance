import express from 'express';
import * as projectController from '../controller/projectController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Create a new project
router.post('/', protect, projectController.createProject);

// Get current student's project
router.get('/student', protect, projectController.getStudentProject);

// Get a project by ID
router.get('/:id', protect, projectController.getProject);

// Update a project
router.put('/:id', protect, projectController.updateProject);

export default router;
