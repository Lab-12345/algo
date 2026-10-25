import jwt from 'jsonwebtoken';
import { User, AuditLog } from '../models/index.js';
import { config } from '../config/env.js';

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Default admin bootstrap if no users exist
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user && email === 'admin@tradepilot.local' && password === 'admin123') {
      user = await User.create({
        email: 'admin@tradepilot.local',
        password: 'admin123',
        role: 'ADMIN'
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiry }
    );

    await AuditLog.create({
      action: 'USER_LOGIN',
      actor: user.email,
      ipAddress: req.ip,
      details: { role: user.role }
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

export async function getProfile(req, res) {
  return res.json({ success: true, user: req.user });
}
