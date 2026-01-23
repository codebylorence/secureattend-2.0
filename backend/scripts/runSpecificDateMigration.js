import sequelize from '../config/database.js';

async function runMigration() {
  try {
    console.log('🔄 Starting specific_date migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    const queryInterface = sequelize.getQueryInterface();
    const Sequelize = sequelize.Sequelize;
    
    // Add specific_date column
    await queryInterface.addColumn('schedule_templates', 'specific_date', {
      type: Sequelize.DATEONLY,
      allowNull: true,
      comment: 'Specific date for this schedule (YYYY-MM-DD format)'
    });
    console.log('✅ Added specific_date column');

    // Make days column nullable
    await queryInterface.changeColumn('schedule_templates', 'days', {
      type: Sequelize.JSON,
      allowNull: true,
      defaultValue: null,
      comment: "Array of day names: ['Monday', 'Tuesday', ...] - DEPRECATED, use specific_date instead"
    });
    console.log('✅ Updated days column to be nullable');
    
    console.log('✅ Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('Error details:', error.message);
    process.exit(1);
  }
}

runMigration();