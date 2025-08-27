
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Shield, Clock, Send } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
}

interface AdminStatus {
  isAdminAuthorized: boolean;
  expiresAt?: number;
  timeRemaining?: number;
}

export function AdminGuard({ children }: AdminGuardProps) {
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({ isAdminAuthorized: false });
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Check admin status on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Update countdown timer
  useEffect(() => {
    if (adminStatus.isAdminAuthorized && adminStatus.timeRemaining) {
      setTimeRemaining(Math.floor(adminStatus.timeRemaining / 1000));
      
      const interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            checkAdminStatus(); // Re-check status when expired
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [adminStatus]);

  const checkAdminStatus = async () => {
    try {
      const response = await fetch("/api/auth/admin/status", {
        credentials: "include",
      });
      
      if (response.ok) {
        const status = await response.json();
        setAdminStatus(status);
        if (!status.isAdminAuthorized) {
          setError("Admin access expired or not granted");
        }
      } else {
        setAdminStatus({ isAdminAuthorized: false });
      }
    } catch (err) {
      console.error("Error checking admin status:", err);
      setAdminStatus({ isAdminAuthorized: false });
    }
  };

  const requestAdminCode = async () => {
    setIsRequesting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/admin/request-code", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || "Failed to request admin code");
      }
    } catch (err) {
      setError("Failed to request admin code. Please try again.");
    } finally {
      setIsRequesting(false);
    }
  };

  const verifyAdminCode = async () => {
    if (!code.trim()) {
      setError("Please enter the admin code");
      return;
    }

    setIsLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/auth/admin/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: code.trim() }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
        setCode("");
        await checkAdminStatus(); // Refresh admin status
      } else {
        setError(data.message || "Invalid admin code");
      }
    } catch (err) {
      setError("Failed to verify admin code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Show admin login form if not authorized
  if (!adminStatus.isAdminAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-red-200">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Admin Access Required</CardTitle>
            <CardDescription className="text-red-600">
              Request a verification code from the admin bot to access the admin panel
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {message && (
              <Alert className="border-green-200 bg-green-50">
                <AlertDescription className="text-green-700">{message}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Button
                onClick={requestAdminCode}
                disabled={isRequesting}
                className="w-full bg-red-600 hover:bg-red-700"
                size="lg"
              >
                {isRequesting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Send className="w-4 h-4" />
                    <span>Request Admin Code</span>
                  </div>
                )}
              </Button>

              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="Enter 6-digit admin code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <Button
                  onClick={verifyAdminCode}
                  disabled={isLoading || !code.trim()}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      <span>Verifying...</span>
                    </div>
                  ) : (
                    "Verify Code"
                  )}
                </Button>
              </div>
            </div>

            <div className="text-xs text-red-600 text-center">
              Make sure you have access to the admin Telegram bot to receive the verification code.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show session info and render children if authorized
  return (
    <div>
      {timeRemaining > 0 && (
        <div className="bg-red-600 text-white px-4 py-2 text-sm text-center">
          <div className="flex items-center justify-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Admin session expires in: {formatTime(timeRemaining)}</span>
          </div>
        </div>
      )}
      {children}
    </div>
  );
}
