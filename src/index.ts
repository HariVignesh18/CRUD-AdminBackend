import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './connection/db';
import routes from './routes';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5081;

// CORS Configuration - Allow frontend URLs
const allowedOrigins = [
    'http://localhost:3000',
    'https://crud-admin-frontend.vercel.app'
];

const corsOptions = {
    origin: function (origin: string | undefined, callback: Function) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
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
