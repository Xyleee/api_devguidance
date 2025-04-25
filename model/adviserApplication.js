import mongoose from 'mongoose';

const AdviserApplicationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required']
  },
  jobTitle: {
    type: String,
    required: [true, 'Job title is required']
  },
  company: {
    type: String,
    required: [true, 'Company/Organization is required']
  },
  yearsOfExperience: {
    type: String,
    required: [true, 'Years of experience is required']
  },
  expertise: {
    type: String,
    required: [true, 'Area of expertise is required']
  },
  bio: {
    type: String,
    required: [true, 'Professional bio is required']
  },
  resumePath: {
    type: String,
    required: [true, 'Resume file is required']
  },
  linkedInProfile: {
    type: String,
    required: [true, 'LinkedIn profile is required']
  },
  githubProfile: {
    type: String
  },
  portfolioWebsite: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  adminNote: {
    type: String
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

export default mongoose.model('AdviserApplication', AdviserApplicationSchema);
