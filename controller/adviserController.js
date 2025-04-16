import Adviser from '../model/adviser.js';
import { generateToken } from '../utils/jwtUtils.js';
import AdviserProfile from '../model/adviserProfile.js';
import { protectRoute } from '../middleware/auth.js';

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password, employeeId, specialization } = req.body;

    const adviserExists = await Adviser.findOne({ 
      $or: [{ email }, { employeeId }] 
    });

    if (adviserExists) {
      return res.status(400).json({
        success: false,
        message: 'Adviser already exists with this email or ID'
      });
    }

    const adviser = await Adviser.create({
      firstName,
      lastName,
      email,
      password,
      employeeId,
      specialization
    });

    const token = generateToken(adviser._id, 'adviser');

    res.status(201).json({
      success: true,
      token,
      adviser: {
        id: adviser._id,
        firstName: adviser.firstName,
        lastName: adviser.lastName,
        email: adviser.email,
        employeeId: adviser.employeeId,
        specialization: adviser.specialization
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    const adviser = await Adviser.findOne({ email }).select('+password');

    if (!adviser || !(await adviser.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(adviser._id, 'adviser');

    res.status(200).json({
      success: true,
      token,
      adviser: {
        id: adviser._id,
        firstName: adviser.firstName,
        lastName: adviser.lastName,
        email: adviser.email,
        employeeId: adviser.employeeId,
        specialization: adviser.specialization
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// Get adviser profile
export const getProfile = async (req, res) => {
  try {
    const profile = await AdviserProfile.findOne({ adviser: req.user.id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile',
      error: error.message
    });
  }
};

// Create or update adviser profile
export const updateProfile = async (req, res) => {
  try {
    const {
      title,
      company,
      location,
      phone,
      bio,
      expertise,
      education,
      experience,
      certifications,
      techStack,
      socialLinks,
      availability
    } = req.body;

    // Build profile object
    const profileFields = {
      adviser: req.user.id,
      title,
      company,
      location,
      phone,
      bio,
      expertise: Array.isArray(expertise) ? expertise : expertise?.split(','),
      certifications: Array.isArray(certifications) ? certifications : certifications?.split(','),
      education,
      experience,
      techStack,
      socialLinks,
      availability,
      updatedAt: Date.now()
    };

    // Remove undefined fields
    Object.keys(profileFields).forEach(key => 
      profileFields[key] === undefined && delete profileFields[key]
    );

    let profile = await AdviserProfile.findOne({ adviser: req.user.id });

    if (profile) {
      // Update
      profile = await AdviserProfile.findOneAndUpdate(
        { adviser: req.user.id },
        { $set: profileFields },
        { new: true }
      );
    } else {
      // Create
      profile = await AdviserProfile.create(profileFields);
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
      error: error.message
    });
  }
};

// Update mentoring summary
export const updateMentoringSummary = async (req, res) => {
  try {
    const { studentsCount, projectsCompleted } = req.body;
    
    const profile = await AdviserProfile.findOneAndUpdate(
      { adviser: req.user.id },
      { 
        $set: { 
          'mentoringSummary.studentsCount': studentsCount,
          'mentoringSummary.projectsCompleted': projectsCompleted,
          updatedAt: Date.now()
        } 
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      mentoringSummary: profile.mentoringSummary
    });
  } catch (error) {
    console.error('Update mentoring summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating mentoring summary',
      error: error.message
    });
  }
};

// Get public profile for a specific adviser
export const getPublicProfile = async (req, res) => {
  try {
    const profile = await AdviserProfile.findOne({ adviser: req.params.id })
      .populate('adviser', 'firstName lastName email specialization');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching public profile',
      error: error.message
    });
  }
};

export const uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const profile = await AdviserProfile.findOneAndUpdate(
      { adviser: req.user.id },
      { 
        $set: { 
          profileImage: req.file.filename,
          updatedAt: Date.now()
        } 
      },
      { new: true, upsert: true }
    );

    res.status(200).json({
      success: true,
      profile
    });
  } catch (error) {
    console.error('Profile image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading profile image',
      error: error.message
    });
  }
};
