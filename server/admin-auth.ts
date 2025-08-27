
import { bot } from './telegram-bot';
import { storage } from './storage';
import type { Request, Response, NextFunction } from 'express';

// Store admin codes temporarily (in production, use Redis or database)
const adminCodes = new Map<string, { code: string; expiresAt: number; isValid: boolean }>();
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || "").split(",").map(id => id.trim()).filter(id => id);

// Generate 6-digit code
function generateAdminCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send code to all admins via Telegram
export async function sendAdminCode(): Promise<string> {
  if (!bot || ADMIN_IDS.length === 0) {
    throw new Error('Telegram bot not available or no admin IDs configured');
  }

  const code = generateAdminCode();
  const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

  // Store code
  adminCodes.set(code, { code, expiresAt, isValid: true });

  // Clean up expired codes
  for (const [key, value] of adminCodes.entries()) {
    if (Date.now() > value.expiresAt) {
      adminCodes.delete(key);
    }
  }

  const message = `🔐 *Admin Access Code*\n\nYour admin panel access code is: \`${code}\`\n\n⏰ This code expires in 10 minutes.\n🌐 Use it to access the admin panel at /admin`;

  // Send to all admin IDs
  for (const adminId of ADMIN_IDS) {
    try {
      await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      console.error(`Error sending admin code to ${adminId}:`, error);
    }
  }

  return code;
}

// Verify admin code
export function verifyAdminCode(code: string): boolean {
  const codeData = adminCodes.get(code);
  
  if (!codeData || !codeData.isValid || Date.now() > codeData.expiresAt) {
    return false;
  }

  // Mark code as used (optional - codes can be single-use)
  codeData.isValid = false;
  return true;
}

// Admin middleware that checks for valid code in session
export function requireAdminCode(req: Request, res: Response, next: NextFunction) {
  const adminCodeSession = req.session.adminCode;
  
  if (!adminCodeSession || Date.now() > adminCodeSession.expiresAt) {
    return res.status(401).json({ message: 'Admin access code required' });
  }
  
  next();
}

// Set admin session after code verification
export function setAdminSession(req: Request, code: string) {
  req.session.adminCode = {
    code,
    authorizedAt: Date.now(),
    expiresAt: Date.now() + (60 * 60 * 1000), // 1 hour session
  };
}
