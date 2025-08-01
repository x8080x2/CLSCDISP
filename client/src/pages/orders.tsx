import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Edit, Search, Filter, Plus, Users } from "lucide-react";
import StatusUpdateModal from "@/components/modals/status-update-modal";
import NewOrderModal from "@/components/modals/new-order-modal";

export default function Orders() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["/api/orders", selectedStatus],
    queryFn: async () => {
      const response = await fetch(`/api/orders?status=${selectedStatus}`);
      if (!response.ok) {
        throw new Error("Failed to fetch orders");
      }
      return response.json();
    },
  });

  const filteredOrders = useMemo(() => {
    if (!orders) return [];

    return orders.filter((order: any) => {
      const searchLower = searchTerm.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.description.toLowerCase().includes(searchLower) ||
        order.user?.username.toLowerCase().includes(searchLower) ||
        order.pickupAddress.toLowerCase().includes(searchLower) ||
        order.deliveryAddress.toLowerCase().includes(searchLower)
      );
    });
  }, [orders, searchTerm]);

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
        title="Orders" 
        description="Manage all document delivery orders" 
      />

      <div className="p-6">
        <Card className="border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Orders</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Pickup</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Delivery</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        Loading orders...
                      </td>
                    </tr>
                  ) : filteredOrders?.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-gray-500">
                        No orders found
                      </td>
                    </tr>
                  ) : (
                    filteredOrders?.map((order: any) => (
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
                          <span className="text-sm text-gray-600 max-w-32 truncate block">
                            {order.pickupAddress}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600 max-w-32 truncate block">
                            {order.deliveryAddress}
                          </span>
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

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-600">
                Showing {filteredOrders?.length || 0} results
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">Previous</Button>
                <Button variant="default" size="sm">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <Button variant="outline" size="sm">Next</Button>
              </div>
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
    </>
  );
}