import MentorshipRequest from '../model/mentorshipRequest.js';

// Middleware to verify that a mentor and student have an active mentorship relationship
export const checkMentorshipRelationship = async (req, res, next) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.body.receiverId || req.params.partnerId;
    
    if (!receiverId) {
      return res.status(400).json({
        success: false,
        message: 'Receiver ID is required'
      });
    }
    
    // Check if there's an accepted mentorship between the two users
    const mentorship = await MentorshipRequest.findOne({
      $or: [
        { studentId: senderId, mentorId: receiverId, status: 'accepted' },
        { studentId: receiverId, mentorId: senderId, status: 'accepted' }
      ]
    });
    
    if (!mentorship) {
      return res.status(403).json({
        success: false,
        message: 'No active mentorship relationship exists between these users'
      });
    }
    
    // Store mentorship details in request for later use
    req.mentorship = mentorship;
    next();
  } catch (error) {
    console.error('Error checking mentorship relationship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when checking mentorship relationship'
    });
  }
}; 