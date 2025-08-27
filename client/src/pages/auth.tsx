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
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative"
      style={{
        backgroundImage: 'url(https://shipsy.io/wp-content/uploads/2022/08/1920x920.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      <div className="w-full max-w-md space-y-8 relative z-10"></div>
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