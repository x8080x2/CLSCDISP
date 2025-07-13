import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

interface SendOutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SendOutModal({ isOpen, onClose }: SendOutModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [documentCount, setDocumentCount] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const { data: users } = useQuery({
    queryKey: ["/api/users"],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!description || !pickupAddress || !deliveryAddress || !documentCount || !selectedUserId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const docCount = parseInt(documentCount);
    if (docCount < 3) {
      toast({
        title: "Invalid Document Count",
        description: "Minimum 3 documents required for sendout",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Calculate costs
      const baseCost = docCount * 16;
      const labelCost = docCount * 11;
      const distanceFee = 10;
      const totalCost = baseCost + labelCost + distanceFee;

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: parseInt(selectedUserId),
          description,
          pickupAddress,
          deliveryAddress,
          serviceType: "standard",
          specialInstructions,
          documentCount: docCount.toString(),
          shippingLabels: docCount.toString(),
          baseCost: baseCost.toString(),
          labelCost: labelCost.toString(),
          distanceFee: distanceFee.toString(),
          totalCost: totalCost.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create order");
      }

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders/my"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      toast({
        title: "Order Created",
        description: "Document sendout order created successfully",
        variant: "default",
      });

      // Reset form and close
      setDescription("");
      setPickupAddress("");
      setDeliveryAddress("");
      setDocumentCount("");
      setSpecialInstructions("");
      setSelectedUserId("");
      onClose();
    } catch (error) {
      console.error("Error creating order:", error);
      toast({
        title: "Order Failed",
        description: "Failed to create order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const docCount = parseInt(documentCount) || 0;
  const baseCost = docCount * 16;
  const labelCost = docCount * 11;
  const distanceFee = 10;
  const totalCost = baseCost + labelCost + distanceFee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Create Document Sendout
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userId">Select User *</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a user..." />
              </SelectTrigger>
              <SelectContent>
                {users?.map((user: any) => (
                  <SelectItem key={user.id} value={user.id.toString()}>
                    @{user.username} (Balance: ${user.balance})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Document Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the documents to be sent..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Pickup Address *</Label>
            <Textarea
              id="pickupAddress"
              placeholder="Where to pick up the documents..."
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              rows={2}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address *</Label>
            <Textarea
              id="deliveryAddress"
              placeholder="Where to deliver the documents..."
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              rows={2}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="documentCount">Document Count * (min 3)</Label>
              <Input
                id="documentCount"
                type="number"
                min="3"
                placeholder="3"
                value={documentCount}
                onChange={(e) => setDocumentCount(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shippingLabels">Shipping Labels (Auto-calculated)</Label>
              <Input
                id="shippingLabels"
                type="number"
                value={docCount}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">
                Automatically set to match document count
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special delivery instructions..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              rows={2}
            />
          </div>

          {docCount >= 3 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Estimated Cost</p>
              <div className="text-sm text-blue-700 mt-1">
                <p>Documents: {docCount} × $16 = ${baseCost}</p>
                <p>Labels: {docCount} × $11 = ${labelCost}</p>
                <p>Distance Fee: ~$10</p>
                <p className="font-semibold border-t border-blue-200 pt-1 mt-1">
                  Total: ~${totalCost}
                </p>
              </div>
            </div>
          )}
          
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? "Creating Order..." : "Create Sendout"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}