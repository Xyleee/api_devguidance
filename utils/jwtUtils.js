import jwt from 'jsonwebtoken';

// Generate JWT token
export const generateToken = (id, role) => {
  // Add debug logging
  console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
  
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};
