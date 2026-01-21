import { seedPositions } from '../seeders/positionSeeder.js';
import sequelize from '../config/database.js';

async function runSeeder() {
  try {
    console.log('🔄 Starting position seeding...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Run the seeder
    await seedPositions();
    
    console.log('✅ Position seeding completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Position seeding failed:', error);
    process.exit(1);
  }
}

runSeeder();