import express from 'express';
import { 
  connectToEventStream, 
  sendMessage, 
  getContacts, 
  getConversation 
} from '../controller/messagingController.js';
import { protectRoute, authorizeRoles } from '../middleware/auth.js';
import { checkMentorshipRelationship } from '../middleware/mentorshipCheck.js';
import upload from '../utils/fileUploader.js';

const router = express.Router();

// SSE endpoint for receiving messages
router.get(
  '/events/:userId',
  protectRoute,
  authorizeRoles('student', 'adviser'),
  connectToEventStream
);

// Send message endpoint (supports file upload)
router.post(
  '/send',
  protectRoute,
  authorizeRoles('student', 'adviser'),
  upload.single('file'), // Process the file upload FIRST
  checkMentorshipRelationship, // Then check the mentorship relationship
  sendMessage
);

// Get contacts endpoint
router.get(
  '/contacts',
  protectRoute,
  authorizeRoles('student', 'adviser'),
  getContacts
);

// Get conversation history endpoint
router.get(
  '/conversations/:partnerId',
  protectRoute,
  authorizeRoles('student', 'adviser'),
  checkMentorshipRelationship,
  getConversation
);

export default router; 