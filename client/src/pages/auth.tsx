import { useState } from "react";
import { Redirect } from "wouter";
import { SignInForm } from "@/components/auth/signin-form";
import { SignUpForm } from "@/components/auth/signup-form";
import { useAuth } from "@/contexts/auth-context";

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect if already authenticated
  if (!isLoading && isAuthenticated) {
    return <Redirect to="/" />;
  }

  const handleAuthSuccess = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {isSignUp ? (
          <SignUpForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignIn={() => setIsSignUp(false)}
          />
        ) : (
          <SignInForm
            onSuccess={handleAuthSuccess}
            onSwitchToSignUp={() => setIsSignUp(true)}
          />
        )}
      </div>
    </div>
  );
}