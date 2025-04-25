import MentorshipRequest from '../model/mentorshipRequest.js';
import AdviserProfile from '../model/adviserProfile.js';
import Adviser from '../model/adviser.js';
import Student from '../model/student.js';
import { calculateMatchingPercentage } from '../utils/calculateMatchingPercentage.js';

// Get available mentors
export const getAvailableMentors = async (req, res) => {
  try {
    const { search, technology } = req.query;
    
    // Create a filter object
    const filter = {};
    
    // First, find adviser IDs with 'Available' status from AdviserProfile
    const availableAdviserProfiles = await AdviserProfile.find({ 
      availability: 'Available' 
    });
    
    const availableAdviserIds = availableAdviserProfiles.map(profile => profile.adviser);
    
    // Build query to find active advisers who are among the available IDs
    const query = {
      _id: { $in: availableAdviserIds }
    };
    
    // Add search functionality if provided
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex }
      ];
    }
    
    // Find the advisers matching our criteria
    let advisers = await Adviser.find(query).select('_id firstName lastName specialization');
    
    // If technology filter is provided, filter the advisers by expertise
    if (technology) {
      const technologyRegex = new RegExp(technology, 'i');
      
      // Get profiles with this technology in their expertise
      const filteredProfiles = await AdviserProfile.find({
        adviser: { $in: advisers.map(a => a._id) },
        expertise: { $elemMatch: { $regex: technologyRegex } }
      });
      
      const filteredAdviserIds = filteredProfiles.map(profile => profile.adviser.toString());
      
      // Filter our advisers list to only include those with matching expertise
      advisers = advisers.filter(adviser => 
        filteredAdviserIds.includes(adviser._id.toString())
      );
    }
    
    // For each adviser, include their profile data
    const advisersWithProfiles = await Promise.all(advisers.map(async (adviser) => {
      const profile = await AdviserProfile.findOne({ adviser: adviser._id });
      return {
        _id: adviser._id,
        firstName: adviser.firstName,
        lastName: adviser.lastName,
        specialization: adviser.specialization,
        expertise: profile?.expertise || [],
        bio: profile?.bio || '',
        profileImage: profile?.profileImage || 'default-profile.png',
        mentoringSummary: profile?.mentoringSummary || { studentsCount: 0, projectsCompleted: 0 }
      };
    }));
    
    res.json({
      success: true,
      count: advisersWithProfiles.length,
      data: advisersWithProfiles
    });
  } catch (error) {
    console.error('Error getting available mentors:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching available mentors',
      error: error.message
    });
  }
};

// Student submits a mentorship request
export const requestMentorship = async (req, res) => {
  try {
    const { mentorId, projectTechStack, note } = req.body;
    const studentId = req.user._id;
    
    // Validate inputs
    if (!mentorId || !projectTechStack || !Array.isArray(projectTechStack)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide mentor ID and project tech stack (as an array)'
      });
    }
    
    // Check if mentor exists and is available
    const mentorProfile = await AdviserProfile.findOne({ adviser: mentorId });
    if (!mentorProfile) {
      return res.status(404).json({
        success: false,
        message: 'Mentor not found'
      });
    }
    
    if (mentorProfile.availability !== 'Available') {
      return res.status(400).json({
        success: false,
        message: 'Mentor is not currently available for new mentorship'
      });
    }
    
    // Check if a pending request already exists
    const existingRequest = await MentorshipRequest.findOne({
      studentId,
      mentorId,
      status: 'pending'
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending request with this mentor'
      });
    }
    
    // Calculate matching percentage
    const matchingPercentage = calculateMatchingPercentage(
      projectTechStack,
      mentorProfile.expertise || []
    );
    
    // Create mentorship request
    const mentorshipRequest = await MentorshipRequest.create({
      studentId,
      mentorId,
      projectTechStack,
      note: note || '',
      matchingPercentage,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    res.status(201).json({
      success: true,
      data: mentorshipRequest
    });
  } catch (error) {
    console.error('Error requesting mentorship:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating mentorship request',
      error: error.message
    });
  }
};

// Get student's mentorship requests
export const getStudentRequests = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    // Get all requests by this student
    const requests = await MentorshipRequest.find({ studentId })
      .sort({ createdAt: -1 });
    
    // Populate with mentor details
    const requestsWithDetails = await Promise.all(requests.map(async (request) => {
      const mentor = await Adviser.findById(request.mentorId);
      const mentorProfile = await AdviserProfile.findOne({ adviser: request.mentorId });
      
      return {
        _id: request._id,
        status: request.status,
        projectTechStack: request.projectTechStack,
        matchingPercentage: request.matchingPercentage,
        note: request.note,
        rejectionNote: request.rejectionNote,
        createdAt: request.createdAt,
        mentor: {
          _id: mentor?._id,
          name: mentor ? `${mentor.firstName} ${mentor.lastName}` : 'Unknown',
          specialization: mentor?.specialization,
          profileImage: mentorProfile?.profileImage || 'default-profile.png'
        }
      };
    }));
    
    res.json({
      success: true,
      count: requestsWithDetails.length,
      data: requestsWithDetails
    });
  } catch (error) {
    console.error('Error getting student requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching mentorship requests',
      error: error.message
    });
  }
};

// Get mentor's mentorship requests
export const getMentorRequests = async (req, res) => {
  try {
    const mentorId = req.user._id;
    
    // Get all requests for this mentor
    const requests = await MentorshipRequest.find({ mentorId })
      .sort({ createdAt: -1 });
    
    // Populate with student details
    const requestsWithDetails = await Promise.all(requests.map(async (request) => {
      const student = await Student.findById(request.studentId);
      
      return {
        _id: request._id,
        status: request.status,
        projectTechStack: request.projectTechStack,
        matchingPercentage: request.matchingPercentage,
        note: request.note,
        rejectionNote: request.rejectionNote,
        createdAt: request.createdAt,
        student: {
          _id: student?._id,
          name: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
          program: student?.program
        }
      };
    }));
    
    res.json({
      success: true,
      count: requestsWithDetails.length,
      data: requestsWithDetails
    });
  } catch (error) {
    console.error('Error getting mentor requests:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching mentorship requests',
      error: error.message
    });
  }
};

// Mentor responds to a mentorship request
export const respondToRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejectionNote } = req.body;
    const mentorId = req.user._id;
    
    // Validate inputs
    if (!requestId || !status || !['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide request ID and valid status (accepted or rejected)'
      });
    }
    
    // Check if request exists and belongs to this mentor
    const request = await MentorshipRequest.findOne({
      _id: requestId,
      mentorId,
      status: 'pending' // Only pending requests can be updated
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Mentorship request not found or already processed'
      });
    }
    
    // If rejecting, ensure rejection note is provided
    if (status === 'rejected' && !rejectionNote) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a rejection note'
      });
    }
    
    // Update request
    request.status = status;
    
    if (status === 'rejected') {
      request.rejectionNote = rejectionNote;
    }
    
    request.updatedAt = new Date();
    await request.save();
    
    // TODO: Send notification to student (future enhancement)
    
    res.json({
      success: true,
      message: `Mentorship request ${status}`,
      data: request
    });
  } catch (error) {
    console.error('Error responding to mentorship request:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while responding to mentorship request',
      error: error.message
    });
  }
};
