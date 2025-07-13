import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, CreditCard, Package, TrendingUp, ArrowLeft, Settings, Bell } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import TopUpModal from "@/components/modals/top-up-modal";

export default function CustomerProfile() {
  const [showTopUpModal, setShowTopUpModal] = useState(false);

  const { data: currentUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users/current"],
  });

  const { data: userOrders } = useQuery({
    queryKey: ["/api/orders/my"],
  });

  const { data: userTransactions } = useQuery({
    queryKey: ["/api/transactions/my"],
  });

  const orderStats = {
    total: userOrders?.length || 0,
    pending: userOrders?.filter((order: any) => order.status === 'pending').length || 0,
    completed: userOrders?.filter((order: any) => order.status === 'completed').length || 0,
    totalSpent: userOrders?.reduce((sum: number, order: any) => sum + parseFloat(order.totalCost), 0) || 0,
  };

  const transactionStats = {
    topUps: userTransactions?.filter((t: any) => t.type === 'top_up').length || 0,
    totalTopUps: userTransactions?.filter((t: any) => t.type === 'top_up')
      .reduce((sum: number, t: any) => sum + parseFloat(t.amount), 0) || 0,
    payments: userTransactions?.filter((t: any) => t.type === 'order_payment').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">My Profile</h1>
                <p className="text-sm text-gray-500">Manage your account and preferences</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button variant="outline" size="sm">
                <Bell className="w-4 h-4 mr-2" />
                Notifications
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userLoading ? (
                  <div className="space-y-4">
                    <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto animate-pulse"></div>
                    <div className="w-32 h-4 bg-gray-200 rounded mx-auto animate-pulse"></div>
                    <div className="w-24 h-3 bg-gray-200 rounded mx-auto animate-pulse"></div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User className="w-10 h-10 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {currentUser?.firstName} {currentUser?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">@{currentUser?.username}</p>
                    <Badge variant="outline" className="mb-4">
                      Customer
                    </Badge>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Telegram ID:</span>
                        <span className="font-mono text-gray-900">{currentUser?.telegramId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Member since:</span>
                        <span className="text-gray-900">
                          {new Date(currentUser?.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Balance Card */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Account Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    ${currentUser?.balance || "0.00"}
                  </div>
                  <p className="text-sm text-gray-600 mb-4">Available Balance</p>
                  <Button 
                    onClick={() => setShowTopUpModal(true)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Top Up Balance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-bold text-gray-900">{orderStats.total}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Package className="text-blue-600 w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Completed Orders</p>
                      <p className="text-2xl font-bold text-green-600">{orderStats.completed}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-green-600 w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Spent</p>
                      <p className="text-2xl font-bold text-purple-600">${orderStats.totalSpent.toFixed(2)}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="text-purple-600 w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Balance Top-ups</p>
                      <p className="text-2xl font-bold text-orange-600">{transactionStats.topUps}</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="text-orange-600 w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userTransactions?.slice(0, 5).map((transaction: any) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          transaction.type === 'top_up' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          <CreditCard className={`w-4 h-4 ${
                            transaction.type === 'top_up' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 capitalize">
                            {transaction.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600">{transaction.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.type === 'top_up' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.type === 'top_up' ? '+' : '-'}${transaction.amount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(transaction.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <TopUpModal 
        isOpen={showTopUpModal} 
        onClose={() => setShowTopUpModal(false)} 
      />
    </div>
  );
}