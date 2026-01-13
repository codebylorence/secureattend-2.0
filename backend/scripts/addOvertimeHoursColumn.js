import sequelize from '../config/database.js';
import { DataTypes } from 'sequelize';

async function addOvertimeHoursColumn() {
  try {
    console.log('🔄 Adding overtime_hours column to Attendances table...');
    
    // Check if column already exists
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Attendances' 
      AND COLUMN_NAME = 'overtime_hours'
      AND TABLE_SCHEMA = DATABASE()
    `);
    
    if (results.length > 0) {
      console.log('✅ overtime_hours column already exists!');
      process.exit(0);
    }
    
    // Add the column
    await sequelize.getQueryInterface().addColumn('Attendances', 'overtime_hours', {
      type: DataTypes.FLOAT,
      allowNull: true,
      comment: 'Number of overtime hours assigned to this employee for this date'
    });
    
    console.log('✅ Successfully added overtime_hours column to Attendances table!');
    console.log('📊 Column details:');
    console.log('  - Type: FLOAT');
    console.log('  - Nullable: YES');
    console.log('  - Comment: Number of overtime hours assigned to this employee for this date');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to add overtime_hours column:', error);
    process.exit(1);
  }
}

addOvertimeHoursColumn();