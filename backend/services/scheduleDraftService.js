import ScheduleDraft from "../models/scheduleDraft.js";
import EmployeeSchedule from "../models/employeeSchedule.js";
import ScheduleTemplate from "../models/scheduleTemplate.js";

// Get all pending drafts
export const getPendingDrafts = async () => {
  return await ScheduleDraft.findAll({
    where: { status: "pending" },
    order: [["createdAt", "DESC"]],
  });
};

// Get drafts by employee
export const getDraftsByEmployee = async (employeeId) => {
  return await ScheduleDraft.findAll({
    where: { 
      employee_id: employeeId,
      status: "pending"
    },
    order: [["createdAt", "DESC"]],
  });
};

// Create a new draft assignment
export const createDraft = async (draftData) => {
  return await ScheduleDraft.create({
    ...draftData,
    action: "create",
    status: "pending"
  });
};

// Update draft
export const updateDraft = async (id, draftData) => {
  const draft = await ScheduleDraft.findByPk(id);
  if (!draft) return null;
  
  await draft.update(draftData);
  return draft;
};

// Delete draft
export const deleteDraft = async (id) => {
  const draft = await ScheduleDraft.findByPk(id);
  if (!draft) return false;
  
  await draft.destroy();
  return true;
};

// Publish all pending drafts
export const publishAllDrafts = async (publishedBy) => {
  const pendingDrafts = await ScheduleDraft.findAll({
    where: { status: "pending" }
  });

  const results = {
    created: 0,
    updated: 0,
    deleted: 0,
    failed: 0,
    errors: []
  };

  for (const draft of pendingDrafts) {
    try {
      if (draft.action === "create") {
        // Create new employee schedule
        await EmployeeSchedule.create({
          employee_id: draft.employee_id,
          template_id: draft.template_id,
          days: draft.days,
          assigned_by: draft.assigned_by
        });
        results.created++;
      } else if (draft.action === "update") {
        // Update existing employee schedule
        const schedule = await EmployeeSchedule.findByPk(draft.employee_schedule_id);
        if (schedule) {
          await schedule.update({
            template_id: draft.template_id,
            days: draft.days
          });
          results.updated++;
        }
      } else if (draft.action === "delete") {
        // Delete employee schedule
        const schedule = await EmployeeSchedule.findByPk(draft.employee_schedule_id);
        if (schedule) {
          await schedule.destroy();
          results.deleted++;
        }
      }

      // Mark draft as published
      await draft.update({ status: "published" });
    } catch (error) {
      console.error(`Error publishing draft ${draft.id}:`, error);
      results.failed++;
      results.errors.push({
        draftId: draft.id,
        error: error.message
      });
    }
  }

  return results;
};

// Cancel all pending drafts
export const cancelAllDrafts = async () => {
  const [updatedCount] = await ScheduleDraft.update(
    { status: "cancelled" },
    { where: { status: "pending" } }
  );
  
  return updatedCount;
};

// Get draft count
export const getPendingDraftCount = async () => {
  return await ScheduleDraft.count({
    where: { status: "pending" }
  });
};
