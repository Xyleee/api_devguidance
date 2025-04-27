import Admin from '../model/admin.js';
import jwt from 'jsonwebtoken';
import { validateLoginInput } from '../utils/validation.js';
import AdviserApplication from '../model/adviserApplication.js';
import { sendApplicationStatusEmail } from '../utils/sendEmail.js';
import Adviser from '../model/adviser.js';
import mongoose from 'mongoose';

// Function to generate password based on fullName
const generatePasswordFromName = (fullName) => {
  // Remove spaces, convert to lowercase, and add "123"
  const namePart = fullName.replace(/\s+/g, '').toLowerCase();
  return `${namePart}123`;
};

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
    
    // If application is accepted, create an adviser account
    if (status === 'accepted') {
      try {
        // Check if an adviser with this email already exists
        const existingAdviser = await Adviser.findOne({ email: application.email });
        
        if (!existingAdviser) {
          // Generate password from full name and ensure it's at least 6 characters
          let password = generatePasswordFromName(application.fullName);
          if (password.length < 6) {
            password = password + '123456'.substring(0, 6 - password.length);
          }
          
          // Extract first and last name
          const nameParts = application.fullName.split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
          
          // Log the data we're about to use
          console.log('Creating adviser with data:', {
            firstName,
            lastName,
            email: application.email,
            passwordLength: password.length
          });
          
          // Create new adviser with default specialization if the field is required
          const adviserData = {
            firstName,
            lastName,
            email: application.email,
            password
          };
          
          // Add specialization if the field still exists and is required
          try {
            const AdviserModel = mongoose.model('Adviser');
            const schema = AdviserModel.schema;
            if (schema.paths.specialization && schema.paths.specialization.isRequired) {
              adviserData.specialization = application.expertise || 'General';
            }
            
            // Add employeeId if the field still exists and is required
            if (schema.paths.employeeId && schema.paths.employeeId.isRequired) {
              adviserData.employeeId = `ADV-${Date.now().toString().slice(-6)}`;
            }
          } catch (schemaError) {
            console.error('Error checking schema:', schemaError);
          }
          
          // Create the adviser
          const newAdviser = await Adviser.create(adviserData);
          
          console.log(`Created new adviser account for ${application.fullName} with ID: ${newAdviser._id}`);
          
          // Modify the email message to include login details
          application.password = password; // Temporarily add password to application for email
        } else {
          console.log(`Adviser with email ${application.email} already exists`);
        }
      } catch (error) {
        console.error('Error creating adviser account:', error.message);
        console.error('Full error:', error);
        console.error('Application data:', {
          email: application.email,
          fullName: application.fullName
        });
        // We continue even if adviser creation fails, to update the application status
      }
    }
    
    // Send email notification to the applicant
    await sendApplicationStatusEmail(application, status);
    
    // Remove the temporary password field
    if (application.password) {
      delete application.password;
    }
    
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