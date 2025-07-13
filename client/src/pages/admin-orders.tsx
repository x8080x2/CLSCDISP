import { useQuery } from "@tanstack/react-query";
import AdminHeader from "@/components/layout/admin-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Package, Users, Eye, Edit, Search, Plus, Filter } from "lucide-react";
import { useState } from "react";
import NewOrderModal from "@/components/modals/new-order-modal";
import StatusUpdateModal from "@/components/modals/status-update-modal";

export default function AdminOrders() {
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
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

  const handleUpdateStatus = (order: any) => {
    setSelectedOrder(order);
    setShowStatusModal(true);
  };

  const filteredOrders = orders?.filter((order: any) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.user?.username.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts = {
    all: orders?.length || 0,
    pending: orders?.filter((order: any) => order.status === 'pending').length || 0,
    in_progress: orders?.filter((order: any) => order.status === 'in_progress').length || 0,
    completed: orders?.filter((order: any) => order.status === 'completed').length || 0,
    cancelled: orders?.filter((order: any) => order.status === 'cancelled').length || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        title="Orders Management" 
        description="Monitor and manage all delivery orders" 
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("all")}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{statusCounts.all}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("pending")}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{statusCounts.pending}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("in_progress")}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{statusCounts.in_progress}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("completed")}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{statusCounts.completed}</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter("cancelled")}>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600">Cancelled</p>
              <p className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search orders, users, or descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders ({statusCounts.all})</SelectItem>
                <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                <SelectItem value="in_progress">In Progress ({statusCounts.in_progress})</SelectItem>
                <SelectItem value="completed">Completed ({statusCounts.completed})</SelectItem>
                <SelectItem value="cancelled">Cancelled ({statusCounts.cancelled})</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setShowNewOrderModal(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Order
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Order Details</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Customer</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Service</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Status</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Date</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    filteredOrders?.map((order: any) => (
                      <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Package className="text-blue-600 w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{order.orderNumber}</p>
                              <p className="text-sm text-gray-600 max-w-xs truncate">{order.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Users className="text-purple-600 w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">@{order.user?.username}</p>
                              <p className="text-xs text-gray-500">{order.user?.firstName} {order.user?.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            <p className="capitalize">{order.serviceType?.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500">{order.documentCount || 0} documents</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={getStatusBadge(order.status)}>
                            {order.status.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-medium text-gray-900">${order.totalCost}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            <p>{new Date(order.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
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

      <NewOrderModal 
        open={showNewOrderModal} 
        onOpenChange={setShowNewOrderModal} 
      />

      <StatusUpdateModal
        open={showStatusModal}
        onOpenChange={setShowStatusModal}
        order={selectedOrder}
      />
    </div>
  );
}