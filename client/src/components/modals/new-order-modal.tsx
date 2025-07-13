import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewOrderModal({ open, onOpenChange }: NewOrderModalProps) {
  const [formData, setFormData] = useState({
    userId: "",
    description: "",
    pickupAddress: "",
    deliveryAddress: "",
    serviceType: "",
    specialInstructions: "",
    documentCount: "",
    shippingLabels: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      // Calculate costs
      const servicePrices = {
        standard: 20,
        express: 35,
        same_day: 50,
        document: 16,
      };

      let baseCost = 0;
      let specialInstructions = orderData.specialInstructions || "";

      if (orderData.serviceType === 'document') {
        const docCount = parseInt(orderData.documentCount) || 0;
        if (docCount < 3) {
          throw new Error("Minimum 3 documents required for document sendout");
        }
        baseCost = docCount * servicePrices.document;
        specialInstructions = `Document sendout: ${docCount} documents. ${specialInstructions}`;
      } else {
        baseCost = servicePrices[orderData.serviceType as keyof typeof servicePrices];
      }

      const distanceFee = Math.floor(Math.random() * 10) + 5; // Random distance fee
      const labelCount = parseInt(orderData.shippingLabels) || 0;
      const labelCost = labelCount * 11; // $11 per label
      const totalCost = baseCost + distanceFee + labelCost;

      if (labelCount > 0) {
        specialInstructions = `${specialInstructions}${specialInstructions ? ' ' : ''}${labelCount} shipping labels.`;
      }

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: orderData.userId,
          description: orderData.description,
          pickupAddress: orderData.pickupAddress,
          deliveryAddress: orderData.deliveryAddress,
          serviceType: orderData.serviceType === 'document' ? 'standard' : orderData.serviceType,
          specialInstructions: specialInstructions || undefined,
          baseCost: baseCost.toString(),
          distanceFee: distanceFee.toString(),
          totalCost: totalCost.toString(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Order created successfully",
      });
      onOpenChange(false);
      setFormData({
        userId: "",
        description: "",
        pickupAddress: "",
        deliveryAddress: "",
        serviceType: "",
        specialInstructions: "",
        documentCount: "",
        shippingLabels: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId || !formData.description || !formData.pickupAddress || 
        !formData.deliveryAddress || !formData.serviceType) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (formData.serviceType === 'document' && (!formData.documentCount || parseInt(formData.documentCount) < 3)) {
      toast({
        title: "Error",
        description: "Minimum 3 documents required for document sendout",
        variant: "destructive",
      });
      return;
    }

    createOrderMutation.mutate({
      userId: parseInt(formData.userId),
      description: formData.description,
      pickupAddress: formData.pickupAddress,
      deliveryAddress: formData.deliveryAddress,
      serviceType: formData.serviceType,
      specialInstructions: formData.specialInstructions,
      documentCount: formData.documentCount,
      shippingLabels: formData.shippingLabels,
    });
  };

  const selectedUser = users?.find((user: any) => user.id.toString() === formData.userId);

  // Calculate estimated cost
  const calculateCost = () => {
    let cost = 0;
    if (formData.serviceType === 'document') {
      const docCount = parseInt(formData.documentCount) || 0;
      cost = docCount * 16;
    } else if (formData.serviceType === 'standard') cost = 20;
    else if (formData.serviceType === 'express') cost = 35;
    else if (formData.serviceType === 'same_day') cost = 50;

    const labelCount = parseInt(formData.shippingLabels) || 0;
    const labelCost = labelCount * 11;
    const distanceFee = 10; // Average estimate

    return cost + labelCost + distanceFee;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Create New Order</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            

            <div className="space-y-2">
              <Label htmlFor="serviceType" className="text-sm font-medium text-gray-700">
                Service Type *
              </Label>
              <Select value={formData.serviceType} onValueChange={(value) => setFormData(prev => ({ ...prev, serviceType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select service..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard Delivery - $20</SelectItem>
                  <SelectItem value="express">Express Delivery - $35</SelectItem>
                  <SelectItem value="same_day">Same Day Delivery - $50</SelectItem>
                  <SelectItem value="document">Document Sendout - $16 each (min 3)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {formData.serviceType === 'document' && (
            <div className="space-y-2">
              <Label htmlFor="documentCount" className="text-sm font-medium text-gray-700">
                Number of Documents * (Minimum 3)
              </Label>
              <Input
                id="documentCount"
                type="number"
                min="3"
                placeholder="Enter number of documents..."
                value={formData.documentCount}
                onChange={(e) => setFormData(prev => ({ ...prev, documentCount: e.target.value }))}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="shippingLabels" className="text-sm font-medium text-gray-700">
              Shipping Labels ($11 each)
            </Label>
            <Input
              id="shippingLabels"
              type="number"
              min="0"
              placeholder="Enter number of shipping labels (optional)"
              value={formData.shippingLabels}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingLabels: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium text-gray-700">
              Document Description *
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the documents to be delivered..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="min-h-[80px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup" className="text-sm font-medium text-gray-700">
                Pickup Address *
              </Label>
              <Textarea
                id="pickup"
                placeholder="Enter pickup address..."
                value={formData.pickupAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, pickupAddress: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="delivery" className="text-sm font-medium text-gray-700">
                Delivery Address *
              </Label>
              <Textarea
                id="delivery"
                placeholder="Enter delivery address..."
                value={formData.deliveryAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                className="min-h-[80px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions" className="text-sm font-medium text-gray-700">
              Special Instructions
            </Label>
            <Textarea
              id="instructions"
              placeholder="Any special delivery instructions..."
              value={formData.specialInstructions}
              onChange={(e) => setFormData(prev => ({ ...prev, specialInstructions: e.target.value }))}
              className="min-h-[60px]"
            />
          </div>

          {formData.serviceType && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm font-medium text-gray-700">Estimated Total: ${calculateCost()}</p>
              <p className="text-xs text-gray-600">Includes estimated distance fee and shipping labels</p>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-white hover:bg-primary/90"
              disabled={createOrderMutation.isPending}
            >
              {createOrderMutation.isPending ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}