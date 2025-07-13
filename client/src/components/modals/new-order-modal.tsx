import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, FileText, DollarSign } from "lucide-react";

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewOrderModal({ open, onOpenChange }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    serviceType: "",
    documentCount: "",
    description: "",
    pickupAddress: "",
    deliveryAddress: "",
    totalCost: "0.00"
  });

  // Get current user to check balance
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/current"],
  });

  // Pricing logic
  const calculateCost = (serviceType: string, documentCount: string) => {
    if (!serviceType || !documentCount) return "0.00";
    
    const count = parseInt(documentCount) || 0;
    let baseCost = 0;
    
    switch (serviceType) {
      case "standard":
        baseCost = count * 2.50;
        break;
      case "express":
        baseCost = count * 4.00;
        break;
      case "same_day":
        baseCost = count * 6.50;
        break;
      default:
        baseCost = 0;
    }
    
    return baseCost.toFixed(2);
  };

  const handleInputChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-calculate cost when service type or document count changes
    if (field === "serviceType" || field === "documentCount") {
      newFormData.totalCost = calculateCost(
        field === "serviceType" ? value : formData.serviceType,
        field === "documentCount" ? value : formData.documentCount
      );
    }
    
    setFormData(newFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serviceType || !formData.documentCount || !formData.description || 
        !formData.pickupAddress || !formData.deliveryAddress) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const docCount = parseInt(formData.documentCount);
    if (docCount < 3) {
      toast({
        title: "Error",
        description: "Minimum 3 documents required for delivery",
        variant: "destructive",
      });
      return;
    }

    const totalCost = parseFloat(formData.totalCost);
    const userBalance = parseFloat(currentUser?.balance || "0");
    
    if (userBalance < totalCost) {
      toast({
        title: "Insufficient Balance",
        description: `You need $${totalCost} but only have $${userBalance}. Please top up your balance.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        userId: currentUser?.id || 1, // Default to first user for demo
        description: formData.description,
        pickupAddress: formData.pickupAddress,
        deliveryAddress: formData.deliveryAddress,
        totalCost: formData.totalCost,
        serviceType: formData.serviceType,
        documentCount: formData.documentCount,
        status: "pending"
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create order");
      }

      const newOrder = await response.json();

      toast({
        title: "Order Created",
        description: `Order ${newOrder.orderNumber} has been created successfully!`,
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/my"] });

      // Reset form
      setFormData({
        serviceType: "",
        documentCount: "",
        description: "",
        pickupAddress: "",
        deliveryAddress: "",
        totalCost: "0.00"
      });

      onOpenChange(false);
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Create New Order</span>
          </DialogTitle>
          <DialogDescription>
            Fill in the details for your document delivery order
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service Type */}
          <div className="space-y-2">
            <Label htmlFor="serviceType">Service Type *</Label>
            <Select value={formData.serviceType} onValueChange={(value) => handleInputChange("serviceType", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select delivery service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard Delivery ($2.50/doc)</SelectItem>
                <SelectItem value="express">Express Delivery ($4.00/doc)</SelectItem>
                <SelectItem value="same_day">Same Day Delivery ($6.50/doc)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Count */}
          <div className="space-y-2">
            <Label htmlFor="documentCount">Number of Documents *</Label>
            <Input
              id="documentCount"
              type="number"
              min="3"
              value={formData.documentCount}
              onChange={(e) => handleInputChange("documentCount", e.target.value)}
              placeholder="Minimum 3 documents"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe the documents to be delivered..."
              rows={3}
            />
          </div>

          {/* Pickup Address */}
          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Pickup Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="pickupAddress"
                value={formData.pickupAddress}
                onChange={(e) => handleInputChange("pickupAddress", e.target.value)}
                placeholder="Enter pickup location"
                className="pl-10"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address *</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                id="deliveryAddress"
                value={formData.deliveryAddress}
                onChange={(e) => handleInputChange("deliveryAddress", e.target.value)}
                placeholder="Enter delivery location"
                className="pl-10"
              />
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Total Cost:</span>
              <span className="text-lg font-bold text-green-600">${formData.totalCost}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Your Balance:</span>
              <span className="text-sm font-medium">${currentUser?.balance || "0.00"}</span>
            </div>
            {parseFloat(formData.totalCost) > parseFloat(currentUser?.balance || "0") && (
              <p className="text-sm text-red-600">Insufficient balance. Please top up.</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || parseFloat(formData.totalCost) > parseFloat(currentUser?.balance || "0")}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "Creating..." : "Create Order"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}