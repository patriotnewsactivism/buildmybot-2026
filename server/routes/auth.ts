import { Router, Request, Response } from 'express';
import { db } from '../db';
import { users, organizations, organizationMembers } from '../../shared/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const router = Router();

// GET /api/auth/user - Get current authenticated user
router.get('/user', async (req: Request, res: Response) => {
  try {
    const session = req.session as any;

    if (!session?.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.id, session.userId),
        isNull(users.deletedAt)
      ));

    if (!user) {
      // Clear invalid session
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'User not found' });
    }

    // Don't return password hash
    const { passwordHash, ...safeUser } = user as any;
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching auth user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/login - Login with email/password
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(and(
        eq(users.email, email.toLowerCase()),
        isNull(users.deletedAt)
      ));

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has a password set
    const userWithPassword = user as any;
    if (!userWithPassword.passwordHash) {
      // For users without password, allow login by email only (demo mode)
      // In production, you'd want proper password requirements
      console.warn(`User ${email} has no password hash, allowing demo login`);
    } else {
      // Verify password
      const isValid = await bcrypt.compare(password, userWithPassword.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
    }

    // Check if user is suspended
    if (user.status === 'Suspended') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    // Set session
    const session = req.session as any;
    session.userId = user.id;

    // Update last login
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Don't return password hash
    const { passwordHash, ...safeUser } = user as any;
    res.json({ user: safeUser, message: 'Login successful' });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/signup - Create new account
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, name, companyName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()));

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Get referral code from request
    const referredBy = req.body.referredBy || null;

    // Create user
    const userId = uuidv4();
    const [newUser] = await db
      .insert(users)
      .values({
        id: userId,
        email: email.toLowerCase(),
        name: name || email.split('@')[0],
        passwordHash,
        companyName: companyName || null,
        role: 'OWNER',
        plan: 'FREE',
        status: 'Active',
        referredBy,
        createdAt: new Date(),
      })
      .returning();

    // Create default organization for the user
    if (companyName) {
      const orgId = uuidv4();
      await db.insert(organizations).values({
        id: orgId,
        name: companyName,
        slug: companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        ownerId: userId,
        plan: 'FREE',
        createdAt: new Date(),
      });

      // Add user as organization owner
      await db.insert(organizationMembers).values({
        id: uuidv4(),
        organizationId: orgId,
        userId: userId,
        role: 'owner',
        permissions: ['*'],
        joinedAt: new Date(),
      });

      // Update user with organization ID
      await db
        .update(users)
        .set({ organizationId: orgId })
        .where(eq(users.id, userId));
    }

    // Set session
    const session = req.session as any;
    session.userId = newUser.id;

    // Don't return password hash
    const { passwordHash: _, ...safeUser } = newUser as any;
    res.status(201).json({ user: safeUser, message: 'Account created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err: Error | null) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// GET /api/login - Redirect to login page (for auth flow)
router.get('/login-redirect', (req: Request, res: Response) => {
  res.redirect('/?auth=login');
});

// GET /api/logout - Redirect logout
router.get('/logout-redirect', (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.redirect('/');
  });
});

export { router as authRouter };
