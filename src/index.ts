import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './connection/db';
import routes from './routes';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5081; // Different port from main admin-backend

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger); // Request logging

// Database Connection
connectDB();

// Routes
app.use('/', routes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'sample-admin-backend' });
});

// Error Handler (must be last)
app.use(errorHandler);

// Start Server
app.listen(PORT, () => {
    console.log(`Sample Admin Backend running on port ${PORT}`);
});
