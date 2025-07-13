import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { X } from "lucide-react";

const orderSchema = z.object({
  userId: z.string().min(1, "Please select a user"),
  description: z.string().min(1, "Description is required"),
  pickupAddress: z.string().min(1, "Pickup address is required"),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  serviceType: z.string().min(1, "Please select a service type"),
  specialInstructions: z.string().optional(),
});

const SERVICE_PRICES = {
  standard: { base: 20, name: 'Standard Delivery' },
  express: { base: 35, name: 'Express Delivery' },
  same_day: { base: 50, name: 'Same Day Delivery' }
};

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewOrderModal({ open, onOpenChange }: NewOrderModalProps) {
  const [selectedServiceType, setSelectedServiceType] = useState<string>("");
  const { toast } = useToast();

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest("POST", "/api/orders", orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      onOpenChange(false);
      form.reset();
      setSelectedServiceType("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const form = useForm<z.infer<typeof orderSchema>>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      userId: "",
      description: "",
      pickupAddress: "",
      deliveryAddress: "",
      serviceType: "",
      specialInstructions: "",
    },
  });

  const calculateCost = () => {
    if (!selectedServiceType) return { baseCost: 0, distanceFee: 0, totalCost: 0 };
    
    const baseCost = SERVICE_PRICES[selectedServiceType as keyof typeof SERVICE_PRICES]?.base || 0;
    const distanceFee = Math.floor(Math.random() * 10) + 5; // Simple distance calculation
    const totalCost = baseCost + distanceFee;
    
    return { baseCost, distanceFee, totalCost };
  };

  const onSubmit = (values: z.infer<typeof orderSchema>) => {
    const { baseCost, distanceFee, totalCost } = calculateCost();
    
    createOrderMutation.mutate({
      ...values,
      userId: parseInt(values.userId),
      baseCost: baseCost.toString(),
      distanceFee: distanceFee.toString(),
      totalCost: totalCost.toString(),
    });
  };

  const { baseCost, distanceFee, totalCost } = calculateCost();
  const selectedUser = users?.find((user: any) => user.id.toString() === form.watch("userId"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">Create New Order</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* User Selection */}
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Select User</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a user..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {users?.map((user: any) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          @{user.username} - Balance: ${user.balance}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Document Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Document Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the documents to be delivered..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pickup Address */}
            <FormField
              control={form.control}
              name="pickupAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Pickup Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter pickup address..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Delivery Address */}
            <FormField
              control={form.control}
              name="deliveryAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Delivery Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter delivery address..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service Type */}
            <FormField
              control={form.control}
              name="serviceType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Service Type</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedServiceType(value);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="standard">Standard Delivery - $20</SelectItem>
                      <SelectItem value="express">Express Delivery - $35</SelectItem>
                      <SelectItem value="same_day">Same Day Delivery - $50</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Cost Calculation */}
            {selectedServiceType && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Base Service Cost:</span>
                  <span className="font-medium">${baseCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Distance Fee:</span>
                  <span className="font-medium">${distanceFee.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-900">Total Cost:</span>
                    <span className="font-bold text-lg text-primary">${totalCost.toFixed(2)}</span>
                  </div>
                </div>
                
                {selectedUser && parseFloat(selectedUser.balance) < totalCost && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-600">
                      ⚠️ Insufficient balance. User has ${selectedUser.balance} but needs ${totalCost.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Special Instructions */}
            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Special Instructions (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special delivery instructions..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-100">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createOrderMutation.isPending || (selectedUser && parseFloat(selectedUser.balance) < totalCost)}
                className="bg-primary text-white hover:bg-primary/90"
              >
                {createOrderMutation.isPending ? "Creating..." : "Create Order"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
