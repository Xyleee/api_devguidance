import Student from '../model/student.js';
import { generateToken } from '../utils/jwtUtils.js';

export const register = async (req, res) => {
  try {
    // Log the request body to see what data is being received
    console.log('Registration request body:', req.body);

    const { firstName, lastName, email, password, studentId, program } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !password || !studentId || !program) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Check if student exists
    const studentExists = await Student.findOne({ 
      $or: [{ email }, { studentId }] 
    });

    if (studentExists) {
      return res.status(400).json({
        success: false,
        message: 'Student already exists with this email or ID'
      });
    }

    // Create student
    const student = await Student.create({
      firstName,
      lastName,
      email,
      password,
      studentId,
      program
    });

    // Generate token
    const token = generateToken(student._id, 'student');

    res.status(201).json({
      success: true,
      token,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentId: student.studentId,
        program: student.program
      }
    });
  } catch (error) {
    // Log the full error for debugging
    console.error('Registration error:', error);

    // Send more detailed error message
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message // Include the actual error message
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const student = await Student.findOne({ email }).select('+password');

    if (!student || !(await student.matchPassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(student._id, 'student');

    res.status(200).json({
      success: true,
      token,
      student: {
        id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        studentId: student.studentId,
        program: student.program
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};
