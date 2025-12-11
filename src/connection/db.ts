import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const DB_NAME = process.env.DB_NAME || 'sample_admin_poc';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || 'password';
const DB_HOST = process.env.DB_HOST || 'localhost';

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: false,
});

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('MySQL Connected via Sequelize');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};
