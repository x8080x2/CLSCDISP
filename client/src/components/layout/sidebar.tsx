import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Package, 
  CreditCard, 
  Send,
  Plus,
  Mail
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
];

function TopUpModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const topUpMutation = useMutation({
    mutationFn: async (data: { amount: string; description?: string }) => {
      const response = await fetch(`/api/balance/topup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: data.amount,
          description: data.description,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update balance');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: "Balance updated successfully",
      });
      setAmount("");
      setDescription("");
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update balance",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    topUpMutation.mutate({
      amount,
      description,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Top Up Balance</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount ($)</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Reason for top-up..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={topUpMutation.isPending || !amount}
              className="bg-primary text-white hover:bg-primary/90"
            >
              {topUpMutation.isPending ? "Processing..." : "Top Up Balance"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendOutModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [description, setDescription] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [documentCount, setDocumentCount] = useState("");
  const [shippingLabels, setShippingLabels] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const { toast } = useToast();

  const sendOutMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create order');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Document sendout order created successfully",
      });
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setDescription("");
    setPickupAddress("");
    setDeliveryAddress("");
    setDocumentCount("");
    setShippingLabels("");
    setSpecialInstructions("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !pickupAddress || !deliveryAddress || !documentCount) return;

    const docCount = parseInt(documentCount) || 0;
    if (docCount < 3) {
      toast({
        title: "Error",
        description: "Minimum 3 documents required for sendout",
        variant: "destructive",
      });
      return;
    }

    sendOutMutation.mutate({
      description,
      pickupAddress,
      deliveryAddress,
      serviceType: "document",
      documentCount,
      shippingLabels: shippingLabels || "0",
      specialInstructions,
    });
  };

  // Calculate estimated cost
  const docCount = parseInt(documentCount) || 0;
  const labelCount = parseInt(shippingLabels) || 0;
  const baseCost = docCount * 16;
  const labelCost = labelCount * 11;
  const distanceFee = 10; // Approximate
  const totalCost = baseCost + labelCost + distanceFee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Document Sendout</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Document Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe the documents to be sent..."
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickupAddress">Pickup Address *</Label>
            <Textarea
              id="pickupAddress"
              placeholder="Where to pick up the documents..."
              rows={2}
              value={pickupAddress}
              onChange={(e) => setPickupAddress(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliveryAddress">Delivery Address *</Label>
            <Textarea
              id="deliveryAddress"
              placeholder="Where to deliver the documents..."
              rows={2}
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
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
              <Label htmlFor="shippingLabels">Shipping Labels</Label>
              <Input
                id="shippingLabels"
                type="number"
                min="0"
                placeholder="0"
                value={shippingLabels}
                onChange={(e) => setShippingLabels(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialInstructions">Special Instructions</Label>
            <Textarea
              id="specialInstructions"
              placeholder="Any special delivery instructions..."
              rows={2}
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
            />
          </div>

          {docCount >= 3 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium">Estimated Cost</p>
              <div className="text-sm text-blue-700 mt-1">
                <p>Documents: {docCount} × $16 = ${baseCost}</p>
                {labelCount > 0 && <p>Labels: {labelCount} × $11 = ${labelCost}</p>}
                <p>Distance Fee: ~$10</p>
                <p className="font-semibold border-t border-blue-200 pt-1 mt-1">
                  Total: ~${totalCost}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={sendOutMutation.isPending || !description || !pickupAddress || !deliveryAddress || !documentCount}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sendOutMutation.isPending ? "Creating Order..." : "Create Sendout"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


export default function Sidebar() {
  const [location] = useLocation();
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showSendOutModal, setShowSendOutModal] = useState(false);

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Send className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DocuBot</h1>
            <p className="text-sm text-gray-500">Admin Panel</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        <ul className="space-y-2 px-4">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 px-4">
          <Button 
            onClick={() => setShowTopUpModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Top Up Balance
          </Button>
          
          <Button 
            onClick={() => setShowSendOutModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Out
          </Button>
        </div>
      </nav>
      <TopUpModal isOpen={showTopUpModal} onClose={() => setShowTopUpModal(false)} />
      <SendOutModal isOpen={showSendOutModal} onClose={() => setShowSendOutModal(false)} />
    </aside>
  );
}