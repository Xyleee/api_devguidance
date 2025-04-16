import dotenv from "dotenv"
dotenv.config();

import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import helmet from "helmet"
import studentRoutes from "./routes/studentRoutes.js"
import adviserRoutes from "./routes/adviserRoutes.js"
import adminRoutes from "./routes/adminRoutes.js"
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import projectRoutes from "./routes/projectRoutes.js"
import path from 'path'

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express();

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure CORS
const allowedOrigins = [
  'http://localhost:5000',      // Local development
  'http://localhost:5173',      // Vite default port
  'http://127.0.0.1:5000',     // Local development alternative
  'https://devguidance.site',   // Production frontend
  'https://www.devguidance.site' // Production frontend with www
];

// CORS configuration - MUST be before any route handlers
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));
// Handle OPTIONS requests explicitly
app.options('*', cors());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", ...allowedOrigins],
    },
  }
}));

// Rate limiting for production
if (process.env.NODE_ENV === 'production') {
  const rateLimit = (await import('express-rate-limit')).default;
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  });
  app.use('/api/', limiter);
}

// Routes - Make sure they're after CORS and other middleware
app.use('/api/students', studentRoutes);
app.use('/api/advisers', adviserRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);

// Serve static files
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d', // Cache static files for 1 day
  etag: true
}));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      error: 'CORS Error',
      message: 'Origin not allowed'
    });
  }

  // Handle other types of errors
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An error occurred' 
      : err.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

const PORT = process.env.PORT || 5001;
const MONGOURL = process.env.MONGO_URL;

// MongoDB connection with retry logic
const connectWithRetry = async () => {
  try {
    await mongoose.connect(MONGOURL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // Timeout after 5s instead of 30s
    });
    console.log("Connected to MongoDB successfully.");
  } catch (err) {
    console.error('MongoDB connection error:', err);
    console.log('Retrying in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

// Start server only after successful DB connection
connectWithRetry().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});

