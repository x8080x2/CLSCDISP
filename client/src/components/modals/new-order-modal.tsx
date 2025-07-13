
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Package, MapPin, FileText, DollarSign, Plus, X, AlertTriangle } from "lucide-react";
import FileUpload from "@/components/ui/file-upload";

interface NewOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DeliveryAddress {
  id: string;
  name: string;
  address: string;
  description: string;
  attachedFiles?: string[];
}

export default function NewOrderModal({ open, onOpenChange }: NewOrderModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    serviceType: "same_day",
    documentCount: "",
    description: "",
    pickupAddress: "",
    totalCost: "0.00",
    labelCourier: false
  });

  // Multiple delivery addresses
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([
    { id: "1", name: "", address: "", description: "", attachedFiles: [] },
    { id: "2", name: "", address: "", description: "", attachedFiles: [] },
    { id: "3", name: "", address: "", description: "", attachedFiles: [] }
  ]);

  // Get current user to check balance
  const { data: currentUser } = useQuery({
    queryKey: ["/api/users/current"],
  });

  // Pricing logic
  const calculateCost = (serviceType: string, documentCount: string, labelCourier: boolean = false) => {
    if (!documentCount) return "0.00";
    
    const count = parseInt(documentCount) || 0;
    let baseCost = count * 16.50; // Document sendout rate
    
    // Add label courier cost - $11 per delivery address
    if (labelCourier) {
      const filledAddresses = deliveryAddresses.filter(addr => 
        addr.name.trim() !== "" && addr.address.trim() !== ""
      );
      const addressCount = Math.max(filledAddresses.length, count);
      baseCost += addressCount * 11;
    }
    
    return baseCost.toFixed(2);
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    const newFormData = { ...formData, [field]: value };
    
    // Auto-calculate cost when service type, document count, or label courier changes
    if (field === "serviceType" || field === "documentCount" || field === "labelCourier") {
      newFormData.totalCost = calculateCost(
        field === "serviceType" ? value as string : formData.serviceType,
        field === "documentCount" ? value as string : formData.documentCount,
        field === "labelCourier" ? value as boolean : formData.labelCourier
      );
      
      // Adjust delivery addresses based on document count
      if (field === "documentCount") {
        const docCount = parseInt(value) || 0;
        const currentAddressCount = deliveryAddresses.length;
        
        if (docCount > currentAddressCount) {
          // Add more addresses
          const newAddresses = [...deliveryAddresses];
          for (let i = currentAddressCount; i < docCount; i++) {
            newAddresses.push({
              id: (i + 1).toString(),
              name: "",
              address: "",
              description: "",
              attachedFiles: []
            });
          }
          setDeliveryAddresses(newAddresses);
        } else if (docCount < currentAddressCount && docCount >= 3) {
          // Remove excess addresses but keep minimum 3
          setDeliveryAddresses(deliveryAddresses.slice(0, Math.max(docCount, 3)));
        }
      }
    }
    
    setFormData(newFormData);
  };

  const updateDeliveryAddress = (id: string, field: "name" | "address" | "description", value: string) => {
    setDeliveryAddresses(prev => 
      prev.map(addr => 
        addr.id === id ? { ...addr, [field]: value } : addr
      )
    );
  };

  const updateDeliveryAddressFiles = (id: string, files: string[]) => {
    setDeliveryAddresses(prev => 
      prev.map(addr => 
        addr.id === id ? { ...addr, attachedFiles: files } : addr
      )
    );
  };

  const addDeliveryAddress = () => {
    const newId = (deliveryAddresses.length + 1).toString();
    setDeliveryAddresses(prev => [
      ...prev,
      { id: newId, name: "", address: "", description: "", attachedFiles: [] }
    ]);
  };

  const removeDeliveryAddress = (id: string) => {
    if (deliveryAddresses.length > 3) {
      setDeliveryAddresses(prev => prev.filter(addr => addr.id !== id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.documentCount || !formData.description || !formData.pickupAddress) {
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

    // Validate delivery addresses
    const filledAddresses = deliveryAddresses.filter(addr => 
      addr.name.trim() !== "" && addr.address.trim() !== ""
    );
    if (filledAddresses.length < 3) {
      toast({
        title: "Error",
        description: "Please provide at least 3 delivery addresses with names",
        variant: "destructive",
      });
      return;
    }

    if (filledAddresses.length < docCount) {
      toast({
        title: "Error",
        description: `Please provide ${docCount} delivery addresses (one per document)`,
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
        userId: currentUser?.id || 1,
        description: formData.description,
        pickupAddress: formData.pickupAddress,
        deliveryAddress: filledAddresses.map(addr => `${addr.name} - ${addr.address}${addr.description ? ' (' + addr.description + ')' : ''}`).join(" | "),
        deliveryAddresses: filledAddresses,
        totalCost: formData.totalCost,
        serviceType: formData.serviceType,
        documentCount: formData.documentCount,
        labelCourier: formData.labelCourier,
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
        description: `Order ${newOrder.orderNumber} has been created with ${filledAddresses.length} delivery addresses!`,
      });

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/my"] });

      // Reset form
      setFormData({
        serviceType: "same_day",
        documentCount: "",
        description: "",
        pickupAddress: "",
        totalCost: "0.00",
        labelCourier: false
      });
      setDeliveryAddresses([
        { id: "1", name: "", address: "", description: "", attachedFiles: [] },
        { id: "2", name: "", address: "", description: "", attachedFiles: [] },
        { id: "3", name: "", address: "", description: "", attachedFiles: [] }
      ]);

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Create New Order</span>
          </DialogTitle>
          <DialogDescription>
            Order placed before 3PM will move same day, varies by Courier 🚚 Service. Monday - Saturday, 24/6. 
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Service Type */}
            <div className="space-y-2">
              <Label htmlFor="serviceType">Service Type *</Label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-blue-900">Same Day Send Out</span>
                  <span className="text-sm text-blue-700">$16.50/doc</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">Available Mon-Sat, 24 hours</p>
              </div>
              <input type="hidden" value="same_day" onChange={() => handleInputChange("serviceType", "same_day")} />
            </div>

            {/* Document Count */}
            <div className="space-y-2">
              <Label htmlFor="documentCount">Number of Documents *</Label>
              <Input
                id="documentCount"
                type="number"
                min="3"
                max="20"
                value={formData.documentCount}
                onChange={(e) => handleInputChange("documentCount", e.target.value)}
                placeholder="Minimum 3 documents"
              />
            </div>
          </div>

          {/* Label Courier Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="labelCourier"
                checked={formData.labelCourier}
                onChange={(e) => handleInputChange("labelCourier", e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <Label htmlFor="labelCourier" className="text-sm font-medium text-blue-900 cursor-pointer">
                Courier Service Shipping Label (+$11 per delivery address)
              </Label>
            </div>
            <div className="flex items-center space-x-2 px-3">
              <AlertTriangle className="w-4 h-4 text-orange-500" />
              <p className="text-xs text-orange-700 italic">
                Don't click if you have your own shipping label
              </p>
            </div>
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

          

          {/* Delivery Addresses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Delivery Addresses * (one per document)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDeliveryAddress}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Address
              </Button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {deliveryAddresses.map((address, index) => (
                <div key={address.id} className="p-3 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Address {index + 1}
                    </span>
                    {deliveryAddresses.length > 3 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDeliveryAddress(address.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  
                  <Input
                    value={address.name}
                    onChange={(e) => updateDeliveryAddress(address.id, "name", e.target.value)}
                    placeholder="Recipient name *"
                    className="font-medium"
                    required
                  />
                  
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <Input
                      value={address.address}
                      onChange={(e) => updateDeliveryAddress(address.id, "address", e.target.value)}
                      placeholder="Enter delivery address *"
                      className="pl-10"
                      required
                    />
                  </div>
                  
                  <Input
                    value={address.description}
                    onChange={(e) => updateDeliveryAddress(address.id, "description", e.target.value)}
                    placeholder="Additional notes (floor, apartment, etc.)"
                    className="text-sm"
                  />
                  
                  <FileUpload
                    label={`Files for ${address.name || `Address ${address.id}`}`}
                    onFilesUploaded={(files) => updateDeliveryAddressFiles(address.id, files)}
                    existingFiles={address.attachedFiles || []}
                    maxFiles={5}
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Cost Summary */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Documents:</span>
              <span className="text-sm font-medium">{formData.documentCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Delivery Addresses:</span>
              <span className="text-sm font-medium">{deliveryAddresses.filter(a => a.name.trim() && a.address.trim()).length}</span>
            </div>
            {formData.labelCourier && (
              <div className="flex items-center justify-between text-blue-700 bg-blue-100 px-2 py-1 rounded">
                <span className="text-sm font-medium">Label Courier Service:</span>
                <span className="text-sm font-bold">
                  +${(Math.max(deliveryAddresses.filter(a => a.name.trim() && a.address.trim()).length, parseInt(formData.documentCount) || 0) * 11).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-200">
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
