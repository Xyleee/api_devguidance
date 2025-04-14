import Adviser from '../model/adviser.js';
import { generateToken } from '../utils/jwtUtils.js';

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
