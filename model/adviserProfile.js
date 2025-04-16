import mongoose from 'mongoose';

const ExperienceSchema = new mongoose.Schema({
  role: String,
  company: String,
  duration: String
});

const EducationSchema = new mongoose.Schema({
  degree: String,
  institution: String,
  year: String
});

const TechStackSchema = new mongoose.Schema({
  name: String,
  level: String
});

const SocialLinksSchema = new mongoose.Schema({
  github: String,
  linkedin: String,
  website: String
});

const MentoringSummarySchema = new mongoose.Schema({
  studentsCount: {
    type: Number,
    default: 0
  },
  projectsCompleted: {
    type: Number,
    default: 0
  }
});

const AdviserProfileSchema = new mongoose.Schema({
  adviser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Adviser',
    required: true,
    unique: true
  },
  title: String,
  company: String,
  location: String,
  phone: String,
  bio: String,
  expertise: [String],
  education: [EducationSchema],
  experience: [ExperienceSchema],
  certifications: [String],
  techStack: [TechStackSchema],
  mentoringSummary: {
    type: MentoringSummarySchema,
    default: { studentsCount: 0, projectsCompleted: 0 }
  },
  socialLinks: SocialLinksSchema,
  availability: {
    type: String,
    enum: ['Available', 'Busy', 'Away'],
    default: 'Available'
  },
  profileImage: {
    type: String,
    default: 'default-profile.png'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('AdviserProfile', AdviserProfileSchema);
