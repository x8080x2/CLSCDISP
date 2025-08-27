import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  balance: string;
  isActive: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        return await apiRequest('/api/auth/me');
      } catch (error: any) {
        if (error.status === 401) {
          return null; // Not authenticated
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const signOut = async () => {
    try {
      await apiRequest('/api/auth/signout', 'POST');
      queryClient.clear();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out even if request fails
      queryClient.clear();
      window.location.href = '/auth';
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      isAuthenticated,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}