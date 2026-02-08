import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

let sequelize;

// Check if DATABASE_URL is provided (PostgreSQL on Render)
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false,
  });
  console.log('📊 Using PostgreSQL database from DATABASE_URL');
} else {
  // Fallback to individual MySQL environment variables
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT || 'mysql',
      logging: false,
    }
  );
  console.log(`📊 Using ${process.env.DB_DIALECT || 'mysql'} database at ${process.env.DB_HOST}`);
}

export default sequelize;
