import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, Clock, CheckCircle, XCircle, Plus, CreditCard, FileText, Send } from "lucide-react";
import { useState } from "react";
import NewOrderModal from "@/components/modals/new-order-modal";
import TopUpModal from "@/components/modals/top-up-modal";

export default function CustomerDashboard() {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const { data: userOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders/my"],
  });

  const { data: userTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions/my"],
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-yellow-100 text-yellow-800",
      in_progress: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'in_progress':
        return <Package className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const orderStats = {
    total: userOrders?.length || 0,
    pending: userOrders?.filter((order: any) => order.status === 'pending').length || 0,
    inProgress: userOrders?.filter((order: any) => order.status === 'in_progress').length || 0,
    completed: userOrders?.filter((order: any) => order.status === 'completed').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Send className="text-white text-lg" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">DocuBot</h1>
                <p className="text-sm text-gray-500">Document Delivery Service</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-semibold text-gray-900">
                  {userLoading ? "Loading..." : currentUser?.firstName || currentUser?.username}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Balance</p>
                <p className="font-bold text-green-600">
                  ${userLoading ? "0.00" : currentUser?.balance || "0.00"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button 
            onClick={() => setShowNewOrderModal(true)}
            className="h-20 bg-blue-600 hover:bg-blue-700 text-white text-lg"
          >
            <Plus className="w-6 h-6 mr-3" />
            Create New Order
          </Button>
          <Button 
            onClick={() => setShowTopUpModal(true)}
            variant="outline"
            className="h-20 border-green-200 text-green-700 hover:bg-green-50 text-lg"
          >
            <CreditCard className="w-6 h-6 mr-3" />
            Top Up Balance
          </Button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{orderStats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{orderStats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
              <Package className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{orderStats.inProgress}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{orderStats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Your Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                        <div>
                          <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-32 h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userOrders?.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No orders yet. Create your first order!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userOrders?.slice(0, 5).map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          {getStatusIcon(order.status)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusBadge(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-sm font-medium text-gray-900 mt-1">${order.totalCost}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="w-24 h-4 bg-gray-200 rounded mb-2"></div>
                          <div className="w-32 h-3 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : userTransactions?.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No transactions yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {userTransactions?.slice(0, 5).map((transaction: any) => (
                  <div key={transaction.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'top_up' ? 'bg-green-100' :
                          transaction.type === 'order_payment' ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          <CreditCard className={`w-4 h-4 ${
                            transaction.type === 'top_up' ? 'text-green-600' :
                            transaction.type === 'order_payment' ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">{transaction.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.type === 'top_up' ? 'text-green-600' :
                          transaction.type === 'order_payment' ? 'text-red-600' : 'text-gray-600'
                        }`}>
                          {transaction.type === 'top_up' ? '+' : '-'}${transaction.amount}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <NewOrderModal 
        open={showNewOrderModal} 
        onOpenChange={setShowNewOrderModal} 
      />
      <TopUpModal 
        isOpen={showTopUpModal} 
        onClose={() => setShowTopUpModal(false)} 
      />
    </div>
  );
}