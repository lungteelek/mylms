import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  platformRole?: string;
  tenant?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface AuthContextData {
  user: User | null;
  token: string | null;
  loading: boolean;
  signIn: (userData: User, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStorageData() {
      const storageUser = await AsyncStorage.getItem('@MyLMS:user');
      const storageToken = await AsyncStorage.getItem('@MyLMS:token');

      if (storageUser && storageToken) {
        setUser(JSON.parse(storageUser));
        setToken(storageToken);
      }
      setLoading(false);
    }

    loadStorageData();
  }, []);

  const signIn = async (userData: User, userToken: string) => {
    setUser(userData);
    setToken(userToken);

    await AsyncStorage.setItem('@MyLMS:user', JSON.stringify(userData));
    await AsyncStorage.setItem('@MyLMS:token', userToken);
  };

  const signOut = async () => {
    await AsyncStorage.multiRemove(['@MyLMS:user', '@MyLMS:token']);
    setUser(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
