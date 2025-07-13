import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Package, Users, DollarSign, Clock, FileText, Plus, Eye, Edit } from "lucide-react";
import NewOrderModal from "@/components/modals/new-order-modal";
import StatusUpdateModal from "@/components/modals/status-update-modal";
import { useState } from "react";

export default function Dashboard() {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: "bg-red-100 text-red-800",
      in_progress: "bg-yellow-100 text-yellow-800",
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const handleUpdateStatus = (order: any) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  };

  return (
    <>
      <Header 
        title="Dashboard" 
        description="Welcome back! Here's what's happening with your bot." 
      />
      
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statsLoading ? "..." : stats?.totalOrders || 0}
                  </p>
                  <p className="text-sm text-success mt-1">
                    <ArrowUp className="inline w-3 h-3 mr-1" />
                    +12% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Package className="text-primary text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statsLoading ? "..." : stats?.activeUsers || 0}
                  </p>
                  <p className="text-sm text-success mt-1">
                    <ArrowUp className="inline w-3 h-3 mr-1" />
                    +8% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Users className="text-success text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    ${statsLoading ? "..." : stats?.totalRevenue || "0.00"}
                  </p>
                  <p className="text-sm text-success mt-1">
                    <ArrowUp className="inline w-3 h-3 mr-1" />
                    +15% from last month
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-warning text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-100">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {statsLoading ? "..." : stats?.pendingOrders || 0}
                  </p>
                  <p className="text-sm text-error mt-1">
                    <ArrowDown className="inline w-3 h-3 mr-1" />
                    Needs attention
                  </p>
                </div>
                <div className="w-12 h-12 bg-error/10 rounded-lg flex items-center justify-center">
                  <Clock className="text-error text-xl" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Orders */}
          <Card className="border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                <Button variant="ghost" className="text-primary hover:text-primary/80 text-sm font-medium">
                  View All
                </Button>
              </div>
            </div>
            <CardContent className="p-6">
              {ordersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                          <div>
                            <div className="w-20 h-4 bg-gray-200 rounded"></div>
                            <div className="w-32 h-3 bg-gray-200 rounded mt-1"></div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="w-16 h-6 bg-gray-200 rounded"></div>
                          <div className="w-12 h-3 bg-gray-200 rounded mt-1"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {recentOrders?.slice(0, 3).map((order: any) => (
                    <div key={order.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <FileText className="text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{order.orderNumber}</p>
                          <p className="text-sm text-gray-600">{order.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusBadge(order.status)}>
                          {order.status.replace('_', ' ')}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">${order.totalCost}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card className="border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">User Activity</h3>
            </div>
            <CardContent className="p-6">
              {usersLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="animate-pulse flex items-center space-x-4">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1">
                        <div className="w-32 h-4 bg-gray-200 rounded"></div>
                        <div className="w-40 h-3 bg-gray-200 rounded mt-1"></div>
                      </div>
                      <div className="w-12 h-3 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {users?.slice(0, 4).map((user: any, index: number) => {
                    const activities = [
                      { icon: Users, color: "success", text: "New user registered", detail: `@${user.username} joined the platform`, time: `${index + 2}m ago` },
                      { icon: Plus, color: "primary", text: "Balance top-up", detail: `@${user.username} added funds`, time: `${index + 5}m ago` },
                    ];
                    const activity = activities[index % 2];
                    const Icon = activity.icon;
                    
                    return (
                      <div key={user.id} className="flex items-center space-x-4">
                        <div className={`w-8 h-8 bg-${activity.color}/10 rounded-full flex items-center justify-center`}>
                          <Icon className={`text-${activity.color} text-sm`} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{activity.text}</p>
                          <p className="text-xs text-gray-600">{activity.detail}</p>
                        </div>
                        <span className="text-xs text-gray-500">{activity.time}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order Management Section */}
        <div className="mt-8">
          <Card className="border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Order Management</h3>
                <Button 
                  className="bg-primary text-white hover:bg-primary/90"
                  onClick={() => setShowNewOrderModal(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Order
                </Button>
              </div>
            </div>
            <CardContent className="p-6">
              {/* Orders Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Order ID</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersLoading ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          Loading orders...
                        </td>
                      </tr>
                    ) : recentOrders?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-gray-500">
                          No orders found
                        </td>
                      </tr>
                    ) : (
                      recentOrders?.slice(0, 5).map((order: any) => (
                        <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-medium text-gray-900">{order.orderNumber}</span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                                <Users className="text-primary text-xs" />
                              </div>
                              <span className="text-sm text-gray-900">@{order.user?.username}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-gray-900">{order.description}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="font-medium text-gray-900">${order.totalCost}</span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={getStatusBadge(order.status)}>
                              {order.status.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-primary hover:text-primary/80"
                                onClick={() => handleUpdateStatus(order)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-gray-600 hover:text-gray-800"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <NewOrderModal 
        open={showNewOrderModal} 
        onOpenChange={setShowNewOrderModal} 
      />
      
      <StatusUpdateModal
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        order={selectedOrder}
      />
    </>
  );
}
