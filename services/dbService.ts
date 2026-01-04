import { Bot, Lead, User, PlanType, Conversation, BotDocument } from '../types';

const API_BASE = '/api';

export const dbService = {
  subscribeToBots: (onUpdate: (bots: Bot[]) => void) => {
    const fetchBots = async () => {
      try {
        const response = await fetch(`${API_BASE}/bots`);
        if (response.ok) {
          const data = await response.json();
          onUpdate(data as Bot[]);
        }
      } catch (error) {
        console.error('Error fetching bots:', error);
      }
    };
    fetchBots();
    const interval = setInterval(fetchBots, 5000);
    return () => clearInterval(interval);
  },

  saveBot: async (bot: Bot): Promise<Bot> => {
    try {
      // Check if this is a new bot - only 'new' or empty/undefined ids are new
      // UUIDs can start with any letter, so we can't check prefixes
      const isNewBot = !bot.id || bot.id === 'new';
      
      if (isNewBot) {
        // Always use POST for new bots - let server generate the ID
        const { id, ...botWithoutId } = bot;
        const response = await fetch(`${API_BASE}/bots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(botWithoutId),
        });
        if (!response.ok) throw new Error('Failed to create bot');
        return await response.json();
      } else {
        // Use PUT for existing bots (has a real UUID)
        const response = await fetch(`${API_BASE}/bots/${bot.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bot),
        });
        if (!response.ok) throw new Error('Failed to update bot');
        return await response.json();
      }
    } catch (error) {
      console.error('Error saving bot:', error);
      throw error;
    }
  },

  getBotById: async (id: string): Promise<Bot | undefined> => {
    try {
      const response = await fetch(`${API_BASE}/bots/${id}`);
      if (!response.ok) return undefined;
      return await response.json();
    } catch (error) {
      console.error('Error fetching bot:', error);
      return undefined;
    }
  },

  subscribeToLeads: (onUpdate: (leads: Lead[]) => void) => {
    const fetchLeads = async () => {
      try {
        const response = await fetch(`${API_BASE}/leads`);
        if (response.ok) {
          const data = await response.json();
          onUpdate(data as Lead[]);
        }
      } catch (error) {
        console.error('Error fetching leads:', error);
      }
    };
    fetchLeads();
    const interval = setInterval(fetchLeads, 5000);
    return () => clearInterval(interval);
  },

  saveLead: async (lead: Lead): Promise<Lead> => {
    try {
      const response = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
      });
      
      if (!response.ok) throw new Error('Failed to save lead');
      return await response.json();
    } catch (error) {
      console.error('Error saving lead:', error);
      return lead;
    }
  },

  getUserProfile: async (uid: string): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE}/users/${uid}`);
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  },

  createUser: async (userData: Omit<User, 'id'>): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          status: userData.status || 'Active',
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to create user:', response.status, errorData);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  },

  saveUserProfile: async (user: User): Promise<User | null> => {
    try {
      const response = await fetch(`${API_BASE}/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          status: user.status || 'Active',
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      return await response.json();
    } catch (error) {
      console.error('Error saving user profile:', error);
      return null;
    }
  },

  updateUserPlan: async (uid: string, plan: PlanType): Promise<void> => {
    try {
      await fetch(`${API_BASE}/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  },

  subscribeToReferrals: (resellerCode: string, onUpdate: (users: User[]) => void) => {
    const fetchReferrals = async () => {
      try {
        const response = await fetch(`${API_BASE}/users/referrals/${resellerCode}`);
        if (response.ok) {
          const data = await response.json();
          onUpdate(data as User[]);
        }
      } catch (error) {
        console.error('Error fetching referrals:', error);
      }
    };
    fetchReferrals();
    const interval = setInterval(fetchReferrals, 10000);
    return () => clearInterval(interval);
  },

  getAllUsers: async (): Promise<User[]> => {
    try {
      const response = await fetch(`${API_BASE}/users`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  updateUserStatus: async (uid: string, status: 'Active' | 'Suspended'): Promise<void> => {
    try {
      await fetch(`${API_BASE}/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  },

  approvePartner: async (uid: string): Promise<void> => {
    try {
      await fetch(`${API_BASE}/users/${uid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' }),
      });
    } catch (error) {
      console.error('Error approving partner:', error);
    }
  },

  subscribeToConversations: (onUpdate: (conversations: Conversation[]) => void, userId?: string) => {
    const fetchConversations = async () => {
      try {
        const url = userId ? `${API_BASE}/conversations?userId=${userId}` : `${API_BASE}/conversations`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          onUpdate(data as Conversation[]);
        }
      } catch (error) {
        console.error('Error fetching conversations:', error);
      }
    };
    fetchConversations();
    const interval = setInterval(fetchConversations, 5000);
    return () => clearInterval(interval);
  },

  saveConversation: async (conversation: Conversation): Promise<Conversation> => {
    try {
      const method = conversation.id ? 'PUT' : 'POST';
      const url = conversation.id ? `${API_BASE}/conversations/${conversation.id}` : `${API_BASE}/conversations`;
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(conversation),
      });
      
      if (!response.ok) throw new Error('Failed to save conversation');
      return await response.json();
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  },

  getConversationById: async (id: string): Promise<Conversation | undefined> => {
    try {
      const response = await fetch(`${API_BASE}/conversations/${id}`);
      if (!response.ok) return undefined;
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation:', error);
      return undefined;
    }
  },

  getBotDocuments: async (botId: string): Promise<BotDocument[]> => {
    try {
      const response = await fetch(`${API_BASE}/bots/${botId}/documents`);
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  },

  uploadBotDocument: async (botId: string, file: File, onProgress?: (progress: number) => void): Promise<BotDocument | null> => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      
      return new Promise((resolve, reject) => {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable && onProgress) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        
        xhr.open('POST', `${API_BASE}/bots/${botId}/documents`);
        xhr.send(formData);
      });
    } catch (error) {
      console.error('Error uploading document:', error);
      return null;
    }
  },

  deleteBotDocument: async (docId: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE}/documents/${docId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting document:', error);
      return false;
    }
  }
};
