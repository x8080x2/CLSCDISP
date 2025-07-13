
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, ExternalLink } from "lucide-react";

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: number;
}

export default function TopUpModal({ isOpen, onClose, userId }: TopUpModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [step, setStep] = useState<'amount' | 'crypto' | 'payment'>('amount');
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const [paymentData, setPaymentData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch crypto rates
  const { data: cryptoRates = [] } = useQuery({
    queryKey: ['/api/crypto/rates'],
    enabled: isOpen && step === 'crypto',
  });

  const handleAmountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || parseFloat(amount) < 50) {
      toast({
        title: "Invalid Amount", 
        description: "Please enter an amount of $50 or more",
        variant: "destructive",
      });
      return;
    }

    setStep('crypto');
  };

  const handleCryptoSelect = async () => {
    if (!selectedCrypto) {
      toast({
        title: "Select Cryptocurrency",
        description: "Please select a cryptocurrency for payment",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch("/api/crypto/payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(amount),
          cryptoSymbol: selectedCrypto,
          userId: userId || "6", // Default user for demo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create payment request");
      }

      const payment = await response.json();
      setPaymentData(payment);
      setStep('payment');
    } catch (error) {
      console.error("Error creating payment:", error);
      toast({
        title: "Payment Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create payment request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Address copied to clipboard",
    });
  };

  const resetModal = () => {
    setStep('amount');
    setAmount("");
    setDescription("");
    setSelectedCrypto("");
    setPaymentData(null);
    setLoading(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderAmountStep = () => (
    <form onSubmit={handleAmountSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Amount ($)</Label>
        <Input
          id="amount"
          type="number"
          placeholder="50.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="50"
          step="0.01"
          required
        />
        <p className="text-xs text-muted-foreground">Minimum deposit amount is $50</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description (Optional)</Label>
        <Textarea
          id="description"
          placeholder="Add a note about this top-up..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button type="submit">
          Continue
        </Button>
      </div>
    </form>
  );

  const renderCryptoStep = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Select Cryptocurrency</Label>
        <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
          <SelectTrigger>
            <SelectValue placeholder="Choose cryptocurrency..." />
          </SelectTrigger>
          <SelectContent>
            {cryptoRates.map((rate: any) => (
              <SelectItem key={rate.symbol} value={rate.symbol}>
                {rate.name} ({rate.symbol.toUpperCase()}) - ${rate.price_usd.toFixed(2)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedCrypto && (
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">
              Amount to pay: <span className="font-medium">${amount}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedCrypto && cryptoRates.find((r: any) => r.symbol === selectedCrypto) && (
                <>≈ {(parseFloat(amount) / cryptoRates.find((r: any) => r.symbol === selectedCrypto).price_usd).toFixed(6)} {selectedCrypto.toUpperCase()}</>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => setStep('amount')}>
          Back
        </Button>
        <Button onClick={handleCryptoSelect} disabled={loading || !selectedCrypto}>
          {loading ? "Creating Payment..." : "Generate Payment"}
        </Button>
      </div>
    </div>
  );

  const renderPaymentStep = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Amount to Send</Label>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-mono">{paymentData?.crypto_amount} {paymentData?.crypto_symbol.toUpperCase()}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(paymentData?.crypto_amount.toString())}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div>
            <Label>Wallet Address</Label>
            <div className="flex items-center justify-between p-2 bg-muted rounded">
              <span className="font-mono text-sm break-all">{paymentData?.wallet_address}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => copyToClipboard(paymentData?.wallet_address)}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>• Send exactly the amount shown above</p>
            <p>• Use the wallet address provided</p>
            <p>• Your balance will be updated automatically after confirmation</p>
            <p>• Payment expires in 30 minutes</p>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={() => setStep('crypto')}>
          Back
        </Button>
        <Button onClick={handleClose}>
          Done
        </Button>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Top Up Balance
            {step === 'crypto' && " - Select Payment Method"}
            {step === 'payment' && " - Payment Details"}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'amount' && renderAmountStep()}
        {step === 'crypto' && renderCryptoStep()}
        {step === 'payment' && renderPaymentStep()}
      </DialogContent>
    </Dialog>
  );
}
