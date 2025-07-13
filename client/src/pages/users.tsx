import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Users, DollarSign, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";

const topUpSchema = z.object({
  amount: z.string().min(1, "Amount is required").refine((val) => !isNaN(Number(val)) && Number(val) > 0, "Amount must be a positive number"),
  description: z.string().optional(),
});

export default function UsersPage() {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const { toast } = useToast();

  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const topUpMutation = useMutation({
    mutationFn: async (data: { userId: number; amount: string; description?: string }) => {
      return apiRequest("POST", `/api/users/${data.userId}/balance`, {
        amount: data.amount,
        description: data.description,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User balance updated successfully",
      });
      setShowTopUpModal(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update balance",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof topUpSchema>>({
    resolver: zodResolver(topUpSchema),
    defaultValues: {
      amount: "",
      description: "",
    },
  });

  const handleTopUp = (user: any) => {
    setSelectedUser(user);
    setShowTopUpModal(true);
  };

  const onSubmit = (values: z.infer<typeof topUpSchema>) => {
    if (!selectedUser) return;
    
    topUpMutation.mutate({
      userId: selectedUser.id,
      amount: values.amount,
      description: values.description,
    });
  };

  return (
    <>
      <Header 
        title="Users" 
        description="Manage user accounts and balances" 
      />
      
      <div className="p-6">
        <Card className="border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">All Users</h3>
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search users..."
                  className="w-64"
                />
              </div>
            </div>
          </div>
          
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Telegram ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Balance</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    users?.map((user: any) => (
                      <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="text-primary text-sm" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="text-sm text-gray-600">@{user.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-900">{user.telegramId}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-medium text-gray-900">${user.balance}</span>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={user.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                            {user.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTopUp(user)}
                            className="text-primary border-primary hover:bg-primary/10"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Top Up
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Up Modal */}
      <Dialog open={showTopUpModal} onOpenChange={setShowTopUpModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Balance</DialogTitle>
          </DialogHeader>
          
          {selectedUser && (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                User: <span className="font-medium text-gray-900">@{selectedUser.username}</span>
              </p>
              <p className="text-sm text-gray-600">
                Current Balance: <span className="font-medium text-gray-900">${selectedUser.balance}</span>
              </p>
            </div>
          )}
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount ($)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="0.00"
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Reason for top-up..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center justify-end space-x-4 pt-4">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setShowTopUpModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={topUpMutation.isPending}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  {topUpMutation.isPending ? "Processing..." : "Top Up Balance"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
