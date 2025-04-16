import Project from '../model/projects.js';

export const createProject = async (req, res) => {
  try {
    const project = new Project({
      ...req.body,
      studentId: req.user._id // Assuming you have authentication middleware
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getProject = async (req, res) => {
  try {
    const project = await Project.findOne({ 
      _id: req.params.id,
      studentId: req.user._id 
    });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, studentId: req.user._id },
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get current student's project
export const getStudentProject = async (req, res) => {
  try {
    const project = await Project.findOne({ studentId: req.user._id });
    
    if (!project) {
      return res.status(404).json({ message: "No project found for this student" });
    }

    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Error fetching project" });
  }
};
