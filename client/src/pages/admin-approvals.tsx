import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AdminHeader from "@/components/layout/admin-header";
import AdminSidebar from "@/components/layout/admin-sidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, DollarSign, Package, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function AdminApprovals() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // Fetch pending orders
  const { data: pendingOrders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/orders', 'pending'],
    queryFn: () => apiRequest('/api/orders?approval=pending'),
  });

  // Fetch pending transactions
  const { data: pendingTransactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions', 'pending'],
    queryFn: () => apiRequest('/api/transactions?approval=pending'),
  });

  const approveOrder = async (orderId: number) => {
    try {
      await apiRequest(`/api/orders/${orderId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approvedBy: 1 }), // Admin user ID
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({
        title: "Order Approved",
        description: "Order has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve order",
        variant: "destructive",
      });
    }
  };

  const rejectOrder = async (orderId: number, reason: string) => {
    try {
      await apiRequest(`/api/orders/${orderId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: reason, rejectedBy: 1 }), // Admin user ID
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast({
        title: "Order Rejected",
        description: "Order has been rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject order",
        variant: "destructive",
      });
    }
  };

  const approveTransaction = async (transactionId: number) => {
    try {
      await apiRequest(`/api/transactions/${transactionId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approvedBy: 1 }), // Admin user ID
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      toast({
        title: "Transaction Approved",
        description: "Transaction has been approved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve transaction",
        variant: "destructive",
      });
    }
  };

  const rejectTransaction = async (transactionId: number, reason: string) => {
    try {
      await apiRequest(`/api/transactions/${transactionId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ rejectionReason: reason, rejectedBy: 1 }), // Admin user ID
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
      setShowRejectDialog(false);
      setRejectionReason("");
      toast({
        title: "Transaction Rejected",
        description: "Transaction has been rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject transaction",
        variant: "destructive",
      });
    }
  };

  const handleReject = (item: any, type: 'order' | 'transaction') => {
    setSelectedItem({ ...item, type });
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = () => {
    if (selectedItem?.type === 'order') {
      rejectOrder(selectedItem.id, rejectionReason);
    } else {
      rejectTransaction(selectedItem.id, rejectionReason);
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <AdminHeader 
          title="Approvals Dashboard" 
          description="Review and approve pending orders and transactions"
        />
        
        <main className="flex-1 overflow-auto p-6">
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingOrders.length}</div>
                  <p className="text-xs text-muted-foreground">Orders awaiting approval</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Transactions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pendingTransactions.length}</div>
                  <p className="text-xs text-muted-foreground">Transactions awaiting approval</p>
                </CardContent>
              </Card>
            </div>
          </div>

          <Tabs defaultValue="orders" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Orders</CardTitle>
                  <CardDescription>Orders that require approval before processing</CardDescription>
                </CardHeader>
                <CardContent>
                  {ordersLoading ? (
                    <div>Loading...</div>
                  ) : pendingOrders.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending orders for approval
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingOrders.map((order: any) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{order.orderNumber}</h3>
                              <p className="text-sm text-muted-foreground">
                                Customer: {order.user?.firstName} {order.user?.lastName}
                              </p>
                            </div>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1 mb-4">
                            <p><strong>Service:</strong> {order.serviceType}</p>
                            <p><strong>Total:</strong> ${order.totalCost}</p>
                            <p><strong>Description:</strong> {order.description}</p>
                            <p><strong>Pickup:</strong> {order.pickupAddress}</p>
                            <p><strong>Delivery:</strong> {order.deliveryAddress}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => approveOrder(order.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(order, 'order')}
                              size="sm"
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="transactions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Transactions</CardTitle>
                  <CardDescription>Transactions that require approval before processing</CardDescription>
                </CardHeader>
                <CardContent>
                  {transactionsLoading ? (
                    <div>Loading...</div>
                  ) : pendingTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending transactions for approval
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {pendingTransactions.map((transaction: any) => (
                        <div key={transaction.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-semibold">{transaction.type.replace('_', ' ').toUpperCase()}</h3>
                              <p className="text-sm text-muted-foreground">
                                User: {transaction.user?.firstName} {transaction.user?.lastName}
                              </p>
                            </div>
                            <Badge variant="outline">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1 mb-4">
                            <p><strong>Amount:</strong> ${transaction.amount}</p>
                            <p><strong>Description:</strong> {transaction.description}</p>
                            <p><strong>Date:</strong> {new Date(transaction.createdAt).toLocaleDateString()}</p>
                          </div>
                          
                          <div className="flex space-x-2">
                            <Button
                              onClick={() => approveTransaction(transaction.id)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              onClick={() => handleReject(transaction, 'transaction')}
                              size="sm"
                              variant="destructive"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {selectedItem?.type === 'order' ? 'Order' : 'Transaction'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectConfirm}
                disabled={!rejectionReason.trim()}
              >
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}