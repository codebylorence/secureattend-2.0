import sequelize from '../config/database.js';
import bcrypt from 'bcrypt';

// Import all models to register them
import '../models/employee.js';
import '../models/user.js';
import '../models/attendance.js';
import '../models/department.js';
import '../models/scheduleTemplate.js';
import '../models/employeeSchedule.js';
import '../models/notification.js';
import '../models/registrationRequest.js';
import '../models/position.js';
import '../models/scheduleNotification.js';
import '../models/shiftTemplate.js';
import '../models/associations.js';

// Import models for creating default data
import User from '../models/user.js';

const initDatabase = async () => {
  try {
    console.log('🔄 Starting database initialization...');
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Force sync - this will DROP and RECREATE all tables
    console.log('🔄 Creating database tables...');
    await sequelize.sync({ force: true, alter: false });
    console.log('✅ All tables created successfully');
    
    // Create default admin user
    console.log('🔄 Creating default admin user...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    await User.create({
      username: 'admin',
      password: hashedPassword,
      role: 'admin',
    });
    console.log('✅ Default admin created: username=admin, password=123456');
    
    console.log('');
    console.log('🎉 Database initialization complete!');
    console.log('');
    console.log('You can now:');
    console.log('1. Login with: admin / 123456');
    console.log('2. Start using the application');
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initDatabase();
