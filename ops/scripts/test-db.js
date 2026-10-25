import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('[Error] MONGODB_URI not found in .env file');
  process.exit(1);
}

console.log('[Test] Connecting to MongoDB Atlas...');
try {
  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[Success] MongoDB Connected to host:', conn.connection.host);
  await mongoose.disconnect();
  process.exit(0);
} catch (err) {
  console.error('[Failed] Connection Error:', err.message);
  process.exit(1);
}
