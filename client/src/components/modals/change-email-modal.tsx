
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const changeEmailSchema = z.object({
  newEmail: z.string().email("Invalid email address"),
  password: z.string().min(1, "Current password is required"),
});

type ChangeEmailData = z.infer<typeof changeEmailSchema>;

interface ChangeEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChangeEmailModal({ isOpen, onClose }: ChangeEmailModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<ChangeEmailData>({
    resolver: zodResolver(changeEmailSchema),
  });

  const changeEmailMutation = useMutation({
    mutationFn: async (data: ChangeEmailData) => {
      const response = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to change email");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Email address updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      reset();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ChangeEmailData) => {
    changeEmailMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Email Address</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newEmail">New Email Address</Label>
            <Input
              id="newEmail"
              type="email"
              placeholder="Enter new email"
              {...register("newEmail")}
            />
            {errors.newEmail && (
              <p className="text-sm text-red-600">{errors.newEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Current Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter current password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Email"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
