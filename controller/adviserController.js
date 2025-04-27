import Adviser from '../model/adviser.js';
import { generateToken } from '../utils/jwtUtils.js';
import AdviserProfile from '../model/adviserProfile.js';
import { protectRoute } from '../middleware/auth.js';
import AdviserApplication from '../model/adviserApplication.js';
import { sendApplicationStatusEmail } from '../utils/sendEmail.js';

export const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    const adviserExists = await Adviser.findOne({ email });

    if (adviserExists) {
      return res.status(400).json({
        success: false,
        message: 'Adviser already exists with this email'
      });
    }

    const adviser = await Adviser.create({
      firstName,
      lastName,
      email,
      password
    });

    const token = generateToken(adviser._id, 'adviser');

    res.status(201).json({
      success: true,
      token,
      adviser: {
        id: adviser._id,
        firstName: adviser.firstName,
        lastName: adviser.lastName,
        email: adviser.email
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
        email: adviser.email
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
    const profile = await AdviserProfile.findOne({ adviser: req.user.id })
      .populate('adviser', 'firstName lastName email');
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Profile not found'
      });
    }

    // Combine adviser name with profile data
    const profileWithName = {
      ...profile.toObject(),
      name: profile.adviser ? `${profile.adviser.firstName} ${profile.adviser.lastName}` : '',
      email: profile.adviser ? profile.adviser.email : ''
    };

    res.status(200).json({
      success: true,
      profile: profileWithName
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

// Apply for adviser/mentor role
export const applyForAdviserRole = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      jobTitle,
      company,
      yearsOfExperience,
      expertise,
      bio,
      linkedInProfile,
      githubProfile,
      portfolioWebsite
    } = req.body;

    // Check if there's already an application with this email
    const existingApplication = await AdviserApplication.findOne({ email });
    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'An application with this email already exists'
      });
    }

    // Create the application record
    // Note: In the real implementation, we'd handle resume file upload with multer
    // For this example, let's assume the file path is stored in req.file.path
    const resumePath = req.file ? req.file.path : 'default_path_for_testing';

    const adviserApplication = await AdviserApplication.create({
      fullName,
      email,
      phone,
      jobTitle,
      company,
      yearsOfExperience,
      expertise,
      bio,
      resumePath,
      linkedInProfile,
      githubProfile: githubProfile || '',
      portfolioWebsite: portfolioWebsite || ''
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: adviserApplication
    });
  } catch (error) {
    console.error('Apply for adviser role error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting application',
      error: error.message
    });
  }
};

// Get application status by email (for applicants to check their status)
export const getApplicationStatus = async (req, res) => {
  try {
    const { email } = req.params;

    const application = await AdviserApplication.findOne({ email }).select('status appliedAt reviewedAt');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    res.status(200).json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error('Get application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving application status',
      error: error.message
    });
  }
};

// Change password for adviser
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both current and new password'
      });
    }
    
    // Find adviser by ID with password included
    const adviser = await Adviser.findById(req.user.id).select('+password');
    
    if (!adviser) {
      return res.status(404).json({
        success: false,
        message: 'Adviser not found'
      });
    }
    
    // Check if current password matches
    const isMatch = await adviser.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Update password
    adviser.password = newPassword;
    await adviser.save();
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password',
      error: error.message
    });
  }
};
