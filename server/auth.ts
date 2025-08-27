import bcrypt from 'bcryptjs';
import type { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { signUpSchema, signInSchema, type SignUpData, type SignInData } from '@shared/schema';
import { sendAdminCode, verifyAdminCode, setAdminSession } from './admin-auth';
import { z } from 'zod';

// Session user type
export interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
}

// Extend Express Request to include user session
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
    adminCode?: {
      code: string;
      authorizedAt: number;
      expiresAt: number;
    };
  }
}

export function setupAuth(app: Express) {
  // Sign up route
  app.post('/api/auth/signup', async (req: Request, res: Response) => {
    try {
      const validatedData: SignUpData = signUpSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Check username
      const existingUsername = await storage.getUserByUsername(validatedData.username);
      if (existingUsername) {
        return res.status(400).json({ message: 'Username already taken' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create user
      const newUser = await storage.createUser({
        username: validatedData.username,
        email: validatedData.email,
        password: hashedPassword,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      });

      // Create session
      req.session.user = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email!,
        firstName: newUser.firstName || undefined,
        lastName: newUser.lastName || undefined,
        isAdmin: newUser.isAdmin || false,
      };

      res.json({
        message: 'Account created successfully',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          balance: newUser.balance,
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid input data', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to create account' });
    }
  });

  // Sign in route
  app.post('/api/auth/signin', async (req: Request, res: Response) => {
    try {
      const validatedData: SignInData = signInSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.password) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Check password
      const passwordValid = await bcrypt.compare(validatedData.password, user.password);
      if (!passwordValid) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      // Create session
      req.session.user = {
        id: user.id,
        username: user.username,
        email: user.email!,
        firstName: user.firstName || undefined,
        lastName: user.lastName || undefined,
        isAdmin: user.isAdmin || false,
      };

      // Force session save and send response only after save completes
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Failed to save session' });
        }
        
        console.log('Session saved successfully for user:', user.email);
        
        res.json({
          message: 'Signed in successfully',
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            balance: user.balance,
          }
        });
      });
    } catch (error) {
      console.error('Signin error:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: 'Invalid input data', 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: 'Failed to sign in' });
    }
  });

  // Sign out route
  app.post('/api/auth/signout', (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Signout error:', err);
        return res.status(500).json({ message: 'Failed to sign out' });
      }
      res.clearCookie('connect.sid');
      res.json({ message: 'Signed out successfully' });
    });
  });

  // Request admin code route
  app.post('/api/auth/admin/request-code', async (req: Request, res: Response) => {
    try {
      const code = await sendAdminCode();
      res.json({ message: 'Admin code sent to Telegram. Check your messages.' });
    } catch (error) {
      console.error('Error sending admin code:', error);
      res.status(500).json({ message: 'Failed to send admin code. Make sure Telegram bot is configured.' });
    }
  });

  // Verify admin code route
  app.post('/api/auth/admin/verify-code', async (req: Request, res: Response) => {
    try {
      const { code } = req.body;
      
      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: 'Admin code is required' });
      }

      const isValid = verifyAdminCode(code);
      if (!isValid) {
        return res.status(401).json({ message: 'Invalid or expired admin code' });
      }

      // Set admin session
      setAdminSession(req, code);
      
      // Force session save
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: 'Failed to save admin session' });
        }
        
        res.json({ 
          message: 'Admin access granted',
          expiresAt: req.session.adminCode?.expiresAt
        });
      });
    } catch (error) {
      console.error('Error verifying admin code:', error);
      res.status(500).json({ message: 'Failed to verify admin code' });
    }
  });

  // Check admin status route
  app.get('/api/auth/admin/status', async (req: Request, res: Response) => {
    try {
      const adminCodeSession = req.session.adminCode;
      
      if (!adminCodeSession || Date.now() > adminCodeSession.expiresAt) {
        return res.status(401).json({ 
          message: 'Admin access required',
          isAdminAuthorized: false 
        });
      }

      res.json({
        isAdminAuthorized: true,
        expiresAt: adminCodeSession.expiresAt,
        timeRemaining: Math.max(0, adminCodeSession.expiresAt - Date.now())
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ message: 'Failed to check admin status' });
    }
  });

  // Get current user route
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      console.log('Headers:', req.headers.cookie);
      console.log('Session ID:', req.sessionID);
      console.log('Session user:', req.session.user);
      console.log('Session data:', req.session);
      
      if (!req.session.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // Get fresh user data from database
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: 'User not found' });
      }

      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        balance: user.balance,
        isActive: user.isActive,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({ message: 'Failed to get user data' });
    }
  });
}

// Auth middleware
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  next();
}

// Optional auth middleware (for endpoints that work with or without auth)
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  // Always proceed, but req.session.user will be undefined if not authenticated
  next();
}

// Admin middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }
  if (!req.session.user.isAdmin) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}