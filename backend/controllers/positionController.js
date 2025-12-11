import Position from "../models/position.js";
import Employee from "../models/employee.js";
import RegistrationRequest from "../models/registrationRequest.js";
import { Op } from "sequelize";

export const getPositions = async (req, res) => {
  try {
    const positions = await Position.findAll({
      where: { status: "Active" },
      order: [['name', 'ASC']]
    });

    const positionsWithCount = await Promise.all(
      positions.map(async (position) => {
        const employeeCount = await Employee.count({
          where: { position: position.name }
        });
        return {
          ...position.toJSON(),
          employeeCount
        };
      })
    );

    res.status(200).json(positionsWithCount);
  } catch (error) {
    console.error("Error fetching positions:", error);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
};

export const getAllPositions = async (req, res) => {
  try {
    const positions = await Position.findAll({
      order: [['name', 'ASC']]
    });

    const positionsWithCount = await Promise.all(
      positions.map(async (position) => {
        const employeeCount = await Employee.count({
          where: { position: position.name }
        });
        return {
          ...position.toJSON(),
          employeeCount
        };
      })
    );

    res.status(200).json(positionsWithCount);
  } catch (error) {
    console.error("Error fetching all positions:", error);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
};

export const addPosition = async (req, res) => {
  try {
    const { name, description, level } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Position name is required" });
    }

    const position = await Position.create({
      name,
      description,
      level: level || "Entry"
    });

    res.status(201).json(position);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: "Position already exists" });
    }
    console.error("Error adding position:", error);
    res.status(500).json({ error: "Failed to add position" });
  }
};

export const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, level, status } = req.body;

    const position = await Position.findByPk(id);
    if (!position) {
      return res.status(404).json({ error: "Position not found" });
    }

    const oldName = position.name;

    await position.update({
      name: name || position.name,
      description: description !== undefined ? description : position.description,
      level: level || position.level,
      status: status || position.status
    });

    // If position name changed, update all employees and registration requests with that position
    if (name && name !== oldName) {
      await Employee.update(
        { position: name },
        { where: { position: oldName } }
      );

      await RegistrationRequest.update(
        { position: name },
        { where: { position: oldName } }
      );
    }

    res.status(200).json(position);
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ error: "Position name already exists" });
    }
    console.error("Error updating position:", error);
    res.status(500).json({ error: "Failed to update position" });
  }
};

export const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;

    const position = await Position.findByPk(id);
    if (!position) {
      return res.status(404).json({ error: "Position not found" });
    }

    const employeeCount = await Employee.count({
      where: { position: position.name }
    });

    const registrationCount = await RegistrationRequest.count({
      where: { position: position.name }
    });

    if (employeeCount > 0 || registrationCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete position. ${employeeCount} employee(s) and ${registrationCount} registration request(s) are using this position.` 
      });
    }

    await position.destroy();
    res.status(200).json({ message: "Position deleted successfully" });
  } catch (error) {
    console.error("Error deleting position:", error);
    res.status(500).json({ error: "Failed to delete position" });
  }
};