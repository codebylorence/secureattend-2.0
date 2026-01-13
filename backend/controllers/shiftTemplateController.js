import {
  getAllShiftTemplates,
  getShiftTemplateById,
  createShiftTemplate,
  updateShiftTemplate,
  deleteShiftTemplate,
} from "../services/shiftTemplateService.js";

// GET /api/shift-templates
export const getShiftTemplates = async (req, res) => {
  try {
    const templates = await getAllShiftTemplates();
    res.status(200).json(templates);
  } catch (error) {
    console.error("Error fetching shift templates:", error);
    res.status(500).json({ message: "Error fetching shift templates" });
  }
};

// GET /api/shift-templates/:id
export const getShiftTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const template = await getShiftTemplateById(id);
    
    if (!template) {
      return res.status(404).json({ message: "Shift template not found" });
    }
    
    res.status(200).json(template);
  } catch (error) {
    console.error("Error fetching shift template:", error);
    res.status(500).json({ message: "Error fetching shift template" });
  }
};

// POST /api/shift-templates
export const addShiftTemplate = async (req, res) => {
  try {
    const { name, start_time, end_time, created_by } = req.body;
    
    // Validate required fields
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ 
        message: "Name, start time, and end time are required" 
      });
    }
    
    const template = await createShiftTemplate({
      name,
      start_time,
      end_time,
      created_by: created_by || "admin"
    });
    
    res.status(201).json(template);
  } catch (error) {
    console.error("Error creating shift template:", error);
    
    // Handle unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: "A shift template with this name already exists" 
      });
    }
    
    res.status(500).json({ message: "Error creating shift template" });
  }
};

// PUT /api/shift-templates/:id
export const editShiftTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, start_time, end_time } = req.body;
    
    // Validate required fields
    if (!name || !start_time || !end_time) {
      return res.status(400).json({ 
        message: "Name, start time, and end time are required" 
      });
    }
    
    const template = await updateShiftTemplate(id, {
      name,
      start_time,
      end_time
    });
    
    if (!template) {
      return res.status(404).json({ message: "Shift template not found" });
    }
    
    res.status(200).json({ 
      message: "Shift template updated successfully", 
      template 
    });
  } catch (error) {
    console.error("Error updating shift template:", error);
    
    // Handle unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ 
        message: "A shift template with this name already exists" 
      });
    }
    
    res.status(500).json({ message: "Error updating shift template" });
  }
};

// DELETE /api/shift-templates/:id
export const removeShiftTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await deleteShiftTemplate(id);
    
    if (!deleted) {
      return res.status(404).json({ message: "Shift template not found" });
    }
    
    res.status(200).json({ message: "Shift template deleted successfully" });
  } catch (error) {
    console.error("Error deleting shift template:", error);
    res.status(500).json({ message: "Error deleting shift template" });
  }
};