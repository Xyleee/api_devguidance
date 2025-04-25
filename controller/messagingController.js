import Message from '../model/message.js';
import Student from '../model/student.js';
import Adviser from '../model/adviser.js';
import MentorshipRequest from '../model/mentorshipRequest.js';
import sseManager from '../utils/sseManager.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect client to SSE stream
export const connectToEventStream = async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Verify user is authenticated and matches the requested userId
    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this stream'
      });
    }
    
    // Setup SSE connection
    sseManager.addClient(userId, res);
    
    // No need to end the response as it's kept open for SSE
  } catch (error) {
    console.error('Error connecting to event stream:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when connecting to event stream'
    });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const { receiverId, content } = req.body;
    const senderRole = req.user.role;
    
    // Determine sender and receiver models based on roles
    const senderModel = senderRole === 'student' ? 'Student' : 'Adviser';
    const receiverModel = senderRole === 'student' ? 'Adviser' : 'Student';
    
    // Create new message
    let fileUrl = null;
    
    // If a file was uploaded, set the file URL
    if (req.file) {
      fileUrl = `/api/uploads/messages/${req.file.filename}`;
    }
    
    // Require either content or file
    if (!content && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message must contain either text or a file'
      });
    }
    
    // Create and save the message
    const message = new Message({
      senderId,
      receiverId,
      senderModel,
      receiverModel,
      content: content || '',
      fileUrl,
      timestamp: new Date()
    });
    
    await message.save();
    
    // Attempt to send via SSE if recipient is connected
    const wasDelivered = sseManager.sendToClient(receiverId.toString(), {
      type: 'message',
      data: message
    });
    
    res.status(201).json({
      success: true,
      delivered: wasDelivered,
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when sending message'
    });
  }
};

// Get all contacts (mentors for students, mentees for mentors)
export const getContacts = async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;
    
    let contacts = [];
    
    if (userRole === 'student') {
      // For students, find all accepted mentorships and get mentor details
      const mentorships = await MentorshipRequest.find({
        studentId: userId,
        status: 'accepted'
      }).populate('mentorId', 'name email');
      
      contacts = mentorships.map(mentorship => ({
        mentorId: mentorship.mentorId._id,
        name: mentorship.mentorId.name,
        email: mentorship.mentorId.email
      }));
    } else if (userRole === 'adviser') {
      // For mentors, find all accepted mentorships and get student details
      const mentorships = await MentorshipRequest.find({
        mentorId: userId,
        status: 'accepted'
      }).populate('studentId', 'name email');
      
      contacts = mentorships.map(mentorship => ({
        studentId: mentorship.studentId._id,
        name: mentorship.studentId.name,
        email: mentorship.studentId.email
      }));
    }
    
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (error) {
    console.error('Error getting contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when retrieving contacts'
    });
  }
};

// Get conversation history with a specific partner
export const getConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const partnerId = req.params.partnerId;
    
    // Optional query params for pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;
    
    // Find messages between these two users (in either direction)
    const messages = await Message.find({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    })
      .sort({ timestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Message.countDocuments({
      $or: [
        { senderId: userId, receiverId: partnerId },
        { senderId: partnerId, receiverId: userId }
      ]
    });
    
    // Update unread messages as read
    await Message.updateMany(
      { senderId: partnerId, receiverId: userId, isRead: false },
      { isRead: true }
    );
    
    res.status(200).json({
      success: true,
      count: messages.length,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: messages
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Server error when retrieving conversation'
    });
  }
}; 