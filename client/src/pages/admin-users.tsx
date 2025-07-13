import { useQuery } from "@tanstack/react-query";
import AdminHeader from "@/components/layout/admin-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, CreditCard, Package, Search, Plus, Edit, Eye, DollarSign } from "lucide-react";
import { useState } from "react";
import TopUpModal from "@/components/modals/top-up-modal";

export default function AdminUsers() {
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
  });

  const handleTopUp = (userId: number) => {
    setSelectedUserId(userId);
    setShowTopUpModal(true);
  };

  const filteredUsers = users?.filter((user: any) => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.telegramId.includes(searchTerm);
    return matchesSearch;
  });

  const userStats = {
    total: users?.length || 0,
    active: users?.filter((user: any) => parseFloat(user.balance) > 0).length || 0,
    highValue: users?.filter((user: any) => parseFloat(user.balance) > 100).length || 0,
    totalBalance: users?.reduce((sum: number, user: any) => sum + parseFloat(user.balance), 0) || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        title="Users Management" 
        description="Manage customer accounts and balances" 
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="text-green-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Value Users</p>
                  <p className="text-2xl font-bold text-purple-600">{userStats.highValue}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Balance</p>
                  <p className="text-2xl font-bold text-orange-600">${userStats.totalBalance.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-orange-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search users by username, name, or Telegram ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">User</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Telegram ID</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Balance</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Orders</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Status</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Joined</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {usersLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : filteredUsers?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-500">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    filteredUsers?.map((user: any) => (
                      <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <Users className="text-blue-600 w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">@{user.username}</p>
                              <p className="text-sm text-gray-600">
                                {user.firstName} {user.lastName}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="text-sm font-mono text-gray-900">{user.telegramId}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <span className={`font-medium ${
                              parseFloat(user.balance) > 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              ${user.balance}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleTopUp(user.id)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            <p className="font-medium">{user.orders?.length || 0}</p>
                            <p className="text-xs text-gray-500">orders</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={parseFloat(user.balance) > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                            {parseFloat(user.balance) > 0 ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{new Date(user.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700"
                              onClick={() => handleTopUp(user.id)}
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

      <TopUpModal 
        isOpen={showTopUpModal} 
        onClose={() => setShowTopUpModal(false)} 
        userId={selectedUserId}
      />
    </div>
  );
}