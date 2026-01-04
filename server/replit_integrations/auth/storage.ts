import { users } from "../../../shared/schema";
import type { User, InsertUser } from "../../../shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";

export interface UpsertUser {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
}

export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = await this.getUser(userData.id);
    
    if (existingUser) {
      const [user] = await db
        .update(users)
        .set({
          avatarUrl: userData.profileImageUrl || existingUser.avatarUrl,
        })
        .where(eq(users.id, userData.id))
        .returning();
      return user;
    }
    
    const displayName = [userData.firstName, userData.lastName].filter(Boolean).join(' ') || 
                        userData.email?.split('@')[0] || 
                        'User';
    
    const [user] = await db
      .insert(users)
      .values({
        id: userData.id,
        name: displayName,
        email: userData.email || '',
        avatarUrl: userData.profileImageUrl,
        role: 'OWNER',
        plan: 'FREE',
        status: 'Active',
      })
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
