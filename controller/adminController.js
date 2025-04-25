import Admin from '../model/admin.js';
import jwt from 'jsonwebtoken';
import { validateLoginInput } from '../utils/validation.js';
import AdviserApplication from '../model/adviserApplication.js';
import { sendApplicationStatusEmail } from '../utils/sendEmail.js';

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    const { errors, isValid } = validateLoginInput(req.body);
    if (!isValid) {
      return res.status(400).json({ success: false, errors });
    }

    // Find admin by email
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Verify password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

export const verifyToken = async (req, res) => {
  try {
    // req.user is set by adminProtect middleware
    const admin = await Admin.findById(req.user.id).select('-password');
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Get all adviser applications with optional status filter
export const getAdviserApplications = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build filter object
    const filter = {};
    if (status) {
      filter.status = status;
    }
    
    const applications = await AdviserApplication.find(filter)
      .sort({ appliedAt: -1 }); // Most recent first
    
    res.status(200).json({
      success: true,
      count: applications.length,
      data: applications
    });
  } catch (error) {
    console.error('Get adviser applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving applications',
      error: error.message
    });
  }
};

// Get application details by ID
export const getApplicationById = async (req, res) => {
  try {
    const application = await AdviserApplication.findById(req.params.id);
    
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
    console.error('Get application by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving application',
      error: error.message
    });
  }
};

// Update application status (approve/reject)
export const updateApplicationStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    
    // Validate status
    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    const application = await AdviserApplication.findById(req.params.id);
    
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }
    
    // Update the application
    application.status = status;
    application.adminNote = adminNote || '';
    application.reviewedAt = Date.now();
    application.reviewedBy = req.user._id; // Assuming req.user is set by auth middleware
    
    await application.save();
    
    // Send email notification to the applicant
    await sendApplicationStatusEmail(application, status);
    
    res.status(200).json({
      success: true,
      message: `Application ${status === 'accepted' ? 'approved' : 'rejected'} successfully`,
      data: application
    });
  } catch (error) {
    console.error('Update application status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating application',
      error: error.message
    });
  }
};