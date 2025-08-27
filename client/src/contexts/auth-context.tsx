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
  isAdmin?: boolean;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  signin: (data: any) => Promise<any>;
  signup: (data: any) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        console.log('Making auth/me request...');
        const result = await apiRequest('/auth/me');
        console.log('Auth/me response:', result);
        return result;
      } catch (error: any) {
        console.log('Auth/me error:', error);
        if (error.message && (error.message.includes('401') || error.message.includes('Not authenticated'))) {
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
      await apiRequest('/auth/signout', 'POST');
      queryClient.clear();
      window.location.href = '/auth';
    } catch (error) {
      console.error('Sign out error:', error);
      // Force sign out even if request fails
      queryClient.clear();
      window.location.href = '/auth';
    }
  };

  const signin = async (data: any) => {
    try {
      const response = await apiRequest('/auth/signin', 'POST', data);
      console.log('Signin response:', response);

      // After successful signin, fetch user data
      await refetch();
      return response;
    } catch (error) {
      console.error('Signin error:', error);
      throw error;
    }
  };

  const signup = async (data: any) => {
    try {
      const response = await apiRequest('/auth/signup', 'POST', data);
      console.log('Signup response:', response);

      // After successful signup, fetch user data
      await refetch();
      return response;
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };


  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      isAuthenticated,
      signOut,
      signin,
      signup,
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