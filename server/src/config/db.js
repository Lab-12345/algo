import mongoose from 'mongoose';
import { config } from './env.js';

let isConnected = false;

export async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully to: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      console.error('[Database] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database] MongoDB disconnected. Attempting reconnection...');
      isConnected = false;
    });

    return conn;
  } catch (error) {
    console.error(`[Database] Connection Error: ${error.message}`);
    // In local development without MongoDB running, don't crash immediately so tests / scaffolding can run
    if (config.env === 'development') {
      console.warn('[Database] Running in development mode without active MongoDB. Memory mock or local instance recommended.');
    } else {
      process.exit(1);
    }
  }
}

export function isDbConnected() {
  return mongoose.connection.readyState === 1;
}
