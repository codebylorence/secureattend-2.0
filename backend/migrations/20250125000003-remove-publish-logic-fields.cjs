'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🗑️ Removing publish logic fields from schedule_templates...');
    
    try {
      // Remove publish-related columns
      const columnsToRemove = [
        'publish_status',
        'published_at', 
        'published_by',
        'pending_deletion',
        'is_edited',
        'original_template_id',
        'edited_at',
        'edited_by'
      ];
      
      for (const column of columnsToRemove) {
        try {
          await queryInterface.removeColumn('schedule_templates', column);
          console.log(`✅ Removed column: ${column}`);
        } catch (error) {
          console.log(`⚠️ Column ${column} might not exist or already removed:`, error.message);
        }
      }
      
      console.log('✅ Successfully removed publish logic fields');
    } catch (error) {
      console.error('❌ Error removing publish logic fields:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding back publish logic fields to schedule_templates...');
    
    try {
      // Add back publish-related columns
      await queryInterface.addColumn('schedule_templates', 'publish_status', {
        type: Sequelize.ENUM('Draft', 'Published'),
        defaultValue: 'Published',
        allowNull: false
      });
      
      await queryInterface.addColumn('schedule_templates', 'published_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
      
      await queryInterface.addColumn('schedule_templates', 'published_by', {
        type: Sequelize.STRING,
        allowNull: true
      });
      
      await queryInterface.addColumn('schedule_templates', 'pending_deletion', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      
      await queryInterface.addColumn('schedule_templates', 'is_edited', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      });
      
      await queryInterface.addColumn('schedule_templates', 'original_template_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'schedule_templates',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });
      
      await queryInterface.addColumn('schedule_templates', 'edited_at', {
        type: Sequelize.DATE,
        allowNull: true
      });
      
      await queryInterface.addColumn('schedule_templates', 'edited_by', {
        type: Sequelize.STRING,
        allowNull: true
      });
      
      console.log('✅ Successfully added back publish logic fields');
    } catch (error) {
      console.error('❌ Error adding back publish logic fields:', error);
      throw error;
    }
  }
};