import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase.js';

interface User {
  uid: string;
  email: string;
  role: 'admin' | 'tech' | 'sales';
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  syncUser: (name?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const syncUser = async (name?: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const idToken = await currentUser.getIdToken();
      const res = await fetch('/api/auth/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, name }),
      });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to sync user:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('[AuthContext] onAuthStateChanged fired:', firebaseUser ? 'User authenticated' : 'No user');
      if (firebaseUser) {
        await syncUser();
      } else {
        console.log('[AuthContext] Clearing user state');
        setUser(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const logout = () => auth.signOut();

  return (
    <AuthContext.Provider value={{ user, loading, logout, syncUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
