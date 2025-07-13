import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Users, Package, DollarSign, Clock } from "lucide-react";

interface AnalyticsData {
  stats: {
    totalOrders: number;
    activeUsers: number;
    totalRevenue: string;
    pendingOrders: number;
  };
  orders: any[];
  users: any[];
  transactions: any[];
}

export default function AnalyticsDashboard({ stats, orders, users, transactions }: AnalyticsData) {
  // Calculate growth metrics
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth - 1;
  
  const currentMonthOrders = orders?.filter(order => 
    new Date(order.createdAt).getMonth() === currentMonth
  ).length || 0;
  
  const lastMonthOrders = orders?.filter(order => 
    new Date(order.createdAt).getMonth() === lastMonth
  ).length || 0;
  
  const orderGrowth = lastMonthOrders > 0 ? 
    ((currentMonthOrders - lastMonthOrders) / lastMonthOrders * 100).toFixed(1) : 0;

  const currentMonthRevenue = orders?.filter(order => 
    new Date(order.createdAt).getMonth() === currentMonth
  ).reduce((sum, order) => sum + parseFloat(order.totalCost), 0) || 0;

  const lastMonthRevenue = orders?.filter(order => 
    new Date(order.createdAt).getMonth() === lastMonth
  ).reduce((sum, order) => sum + parseFloat(order.totalCost), 0) || 0;

  const revenueGrowth = lastMonthRevenue > 0 ? 
    ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1) : 0;

  const currentMonthUsers = users?.filter(user => 
    new Date(user.createdAt).getMonth() === currentMonth
  ).length || 0;

  const lastMonthUsers = users?.filter(user => 
    new Date(user.createdAt).getMonth() === lastMonth
  ).length || 0;

  const userGrowth = lastMonthUsers > 0 ? 
    ((currentMonthUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0;

  // Order status distribution
  const orderStatusCounts = {
    pending: orders?.filter(o => o.status === 'pending').length || 0,
    in_progress: orders?.filter(o => o.status === 'in_progress').length || 0,
    completed: orders?.filter(o => o.status === 'completed').length || 0,
    cancelled: orders?.filter(o => o.status === 'cancelled').length || 0,
  };

  const completionRate = stats.totalOrders > 0 ? 
    ((orderStatusCounts.completed / stats.totalOrders) * 100).toFixed(1) : 0;

  // Top performing users
  const userOrderCounts = users?.map(user => ({
    ...user,
    orderCount: orders?.filter(order => order.userId === user.id).length || 0,
    totalSpent: orders?.filter(order => order.userId === user.id)
      .reduce((sum, order) => sum + parseFloat(order.totalCost), 0) || 0
  })).sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);

  // Recent activity timeline
  const recentActivity = [
    ...orders?.slice(0, 3).map(order => ({
      type: 'order',
      description: `Order ${order.orderNumber} created`,
      user: order.user?.username,
      time: new Date(order.createdAt),
      status: order.status,
      amount: order.totalCost
    })) || [],
    ...transactions?.slice(0, 3).map(transaction => ({
      type: 'transaction',
      description: `${transaction.type.replace('_', ' ')} by ${transaction.user?.username}`,
      user: transaction.user?.username,
      time: new Date(transaction.createdAt),
      amount: transaction.amount
    })) || []
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Growth Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Order Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{currentMonthOrders}</p>
                <p className="text-sm text-gray-600">This month</p>
              </div>
              <div className="flex items-center space-x-1">
                {parseFloat(orderGrowth) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  parseFloat(orderGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {orderGrowth}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Revenue Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">${currentMonthRevenue.toFixed(2)}</p>
                <p className="text-sm text-gray-600">This month</p>
              </div>
              <div className="flex items-center space-x-1">
                {parseFloat(revenueGrowth) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  parseFloat(revenueGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {revenueGrowth}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">User Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">{currentMonthUsers}</p>
                <p className="text-sm text-gray-600">New users</p>
              </div>
              <div className="flex items-center space-x-1">
                {parseFloat(userGrowth) >= 0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  parseFloat(userGrowth) >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {userGrowth}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Completion Rate</span>
                <span className="text-lg font-bold text-green-600">{completionRate}%</span>
              </div>
              <div className="space-y-2">
                {Object.entries(orderStatusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant={status === 'completed' ? 'default' : 'secondary'}>
                        {status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="font-medium">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {userOrderCounts?.map((user, index) => (
                <div key={user.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">@{user.username}</p>
                      <p className="text-xs text-gray-600">{user.orderCount} orders</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">${user.totalSpent.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">total spent</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  activity.type === 'order' ? 'bg-blue-100' : 'bg-green-100'
                }`}>
                  {activity.type === 'order' ? (
                    <Package className="w-4 h-4 text-blue-600" />
                  ) : (
                    <DollarSign className="w-4 h-4 text-green-600" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.description}</p>
                  <p className="text-xs text-gray-600">
                    {activity.time.toLocaleDateString()} at {activity.time.toLocaleTimeString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">${activity.amount}</p>
                  {activity.status && (
                    <Badge variant="secondary" className="text-xs">
                      {activity.status}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}