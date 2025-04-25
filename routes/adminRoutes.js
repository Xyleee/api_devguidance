import express from 'express';
import { Router } from 'express';
import Admin from '../model/admin.js';
import { login, verifyToken, getAdviserApplications, getApplicationById, updateApplicationStatus } from '../controller/adminController.js';
import { adminProtect } from '../middleware/auth.js';


const router = Router();

// Admin registration route
router.post('/register', async (req, res) => {
    try {
        console.log('Registration request received:', req.body); // Debug log

        const { email, password, name } = req.body;

        // Validate required fields
        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required'
            });
        }

        console.log('Checking for existing admin...'); // Debug log
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            console.log('Admin already exists'); // Debug log
            return res.status(400).json({
                success: false,
                message: 'Admin with this email already exists'
            });
        }

        console.log('Creating new admin...'); // Debug log
        // Create new admin
        const admin = new Admin({
            email,
            password,
            name,
            role: 'admin'
        });

        console.log('Saving admin to database...'); // Debug log
        // Save admin to database
        const savedAdmin = await admin.save();
        console.log('Admin saved successfully:', savedAdmin); // Debug log

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully',
            admin: {
                id: savedAdmin._id,
                email: savedAdmin.email,
                name: savedAdmin.name,
                role: savedAdmin.role
            }
        });
    } catch (error) {
        console.error('Admin registration error:', error); // Detailed error logging
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

// Admin login route
router.post('/login', login);

router.get('/verify', adminProtect, verifyToken);

// Adviser application routes - all protected with admin middleware
router.get('/adviser-applications', adminProtect, getAdviserApplications);
router.get('/adviser-applications/:id', adminProtect, getApplicationById);
router.put('/adviser-applications/:id/decision', adminProtect, updateApplicationStatus);

export default router;