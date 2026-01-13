export const up = async (queryInterface, Sequelize) => {
  await queryInterface.createTable('ScheduleNotifications', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    message: {
      type: Sequelize.STRING,
      allowNull: false
    },
    type: {
      type: Sequelize.ENUM('schedule_update', 'schedule_publish', 'schedule_delete'),
      defaultValue: 'schedule_update'
    },
    details: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'JSON string with additional details about the update'
    },
    is_acknowledged: {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    },
    created_by: {
      type: Sequelize.STRING,
      allowNull: true
    },
    acknowledged_at: {
      type: Sequelize.DATE,
      allowNull: true
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE
    }
  });
};

export const down = async (queryInterface, Sequelize) => {
  await queryInterface.dropTable('ScheduleNotifications');
};