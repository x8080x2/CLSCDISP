import bcrypt from 'bcryptjs';
import type { Express, Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { signUpSchema, signInSchema, type SignUpData, type SignInData } from '@shared/schema';
import { z } from 'zod';

// Session user type
export interface SessionUser {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// Extend Express Request to include user session
declare module 'express-session' {
  interface SessionData {
    user?: SessionUser;
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

  // Get current user route
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
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