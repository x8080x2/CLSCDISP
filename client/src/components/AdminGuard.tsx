import { useAuth } from "@/contexts/auth-context";
import { useLocation } from "wouter";
import { useEffect } from "react";

interface AdminGuardProps {
  children: React.ReactNode;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    // If not authenticated at all, show error or redirect elsewhere
    if (!isAuthenticated || !user) {
      // Don't redirect to /auth - admin should not use customer auth
      return;
    }

    // If authenticated but not admin, show error or redirect elsewhere
    if (!user.isAdmin) {
      // Don't redirect to /auth - admin should not use customer auth
      return;
    }
  }, [user, isLoading, isAuthenticated, setLocation]);

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Only render children if user is authenticated and admin
  if (isAuthenticated && user?.isAdmin) {
    return <>{children}</>;
  }

  // Return null while redirecting
  return null;
}