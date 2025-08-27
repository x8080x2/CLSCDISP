import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { signInSchema, type SignInData } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

interface SignInFormProps {
  onSuccess?: () => void;
  onSwitchToSignUp?: () => void;
}

export function SignInForm({ onSuccess, onSwitchToSignUp }: SignInFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const signInMutation = useMutation({
    mutationFn: async (data: SignInData) => {
      return await apiRequest('/api/auth/signin', 'POST', data);
    },
    onSuccess: (response) => {
      toast({
        title: "Success",
        description: "You have been signed in successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Sign In Failed",
        description: error.message || "Invalid email or password.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SignInData) => {
    signInMutation.mutate(data);
  };

  return (
    <Card className="w-full max-w-md mx-auto" data-testid="signin-form">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Sign In</CardTitle>
        <CardDescription className="text-center">
          Enter your email and password to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="your.email@example.com"
                      data-testid="input-email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input 
                      type="password" 
                      placeholder="Enter your password"
                      data-testid="input-password"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button 
              type="submit" 
              className="w-full" 
              disabled={signInMutation.isPending}
              data-testid="button-signin"
            >
              {signInMutation.isPending ? "Signing In..." : "Sign In"}
            </Button>
          </form>
        </Form>
        
        <div className="mt-4 text-center">
          <Button 
            variant="link" 
            onClick={onSwitchToSignUp}
            data-testid="link-signup"
          >
            Don't have an account? Sign Up
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}