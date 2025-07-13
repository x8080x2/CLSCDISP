import { useQuery } from "@tanstack/react-query";
import AdminHeader from "@/components/layout/admin-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreditCard, TrendingUp, TrendingDown, DollarSign, Search, Users, Package } from "lucide-react";
import { useState } from "react";

export default function AdminTransactions() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'top_up':
        return <TrendingUp className="w-4 h-4" />;
      case 'order_payment':
        return <TrendingDown className="w-4 h-4" />;
      case 'refund':
        return <DollarSign className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      top_up: "bg-green-100 text-green-800",
      order_payment: "bg-red-100 text-red-800",
      refund: "bg-blue-100 text-blue-800",
    };
    return variants[type as keyof typeof variants] || "bg-gray-100 text-gray-800";
  };

  const filteredTransactions = transactions?.filter((transaction: any) => {
    const matchesType = typeFilter === "all" || transaction.type === typeFilter;
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.user?.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.amount.includes(searchTerm);
    return matchesType && matchesSearch;
  });

  const transactionStats = {
    total: transactions?.length || 0,
    topUps: transactions?.filter((t: any) => t.type === 'top_up').length || 0,
    payments: transactions?.filter((t: any) => t.type === 'order_payment').length || 0,
    refunds: transactions?.filter((t: any) => t.type === 'refund').length || 0,
    totalAmount: transactions?.reduce((sum: number, t: any) => {
      return sum + (t.type === 'top_up' ? parseFloat(t.amount) : -parseFloat(t.amount));
    }, 0) || 0,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader 
        title="Transactions" 
        description="Monitor all financial transactions and payments" 
      />

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold text-gray-900">{transactionStats.total}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="text-blue-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Top-ups</p>
                  <p className="text-2xl font-bold text-green-600">{transactionStats.topUps}</p>
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
                  <p className="text-sm font-medium text-gray-600">Payments</p>
                  <p className="text-2xl font-bold text-red-600">{transactionStats.payments}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <TrendingDown className="text-red-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Net Balance</p>
                  <p className={`text-2xl font-bold ${transactionStats.totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${transactionStats.totalAmount.toFixed(2)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="text-purple-600 w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search transactions, users, or amounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types ({transactionStats.total})</SelectItem>
                <SelectItem value="top_up">Top-ups ({transactionStats.topUps})</SelectItem>
                <SelectItem value="order_payment">Payments ({transactionStats.payments})</SelectItem>
                <SelectItem value="refund">Refunds ({transactionStats.refunds})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Transaction</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">User</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Type</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Order</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : filteredTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions?.map((transaction: any) => (
                      <tr key={transaction.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              transaction.type === 'top_up' ? 'bg-green-100' :
                              transaction.type === 'order_payment' ? 'bg-red-100' : 'bg-blue-100'
                            }`}>
                              {getTypeIcon(transaction.type)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {transaction.type === 'top_up' ? 'Balance Top-up' :
                                 transaction.type === 'order_payment' ? 'Order Payment' : 'Refund'}
                              </p>
                              <p className="text-sm text-gray-600 max-w-xs truncate">{transaction.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <Users className="text-purple-600 w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">@{transaction.user?.username}</p>
                              <p className="text-xs text-gray-500">{transaction.user?.firstName} {transaction.user?.lastName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={getTypeBadge(transaction.type)}>
                            {transaction.type.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`font-medium ${
                            transaction.type === 'top_up' ? 'text-green-600' :
                            transaction.type === 'order_payment' ? 'text-red-600' : 'text-blue-600'
                          }`}>
                            {transaction.type === 'top_up' ? '+' : '-'}${transaction.amount}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          {transaction.order ? (
                            <div className="flex items-center space-x-2">
                              <Package className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-900">{transaction.order.orderNumber}</span>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-500">-</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-sm text-gray-900">
                            <p>{new Date(transaction.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-gray-500">{new Date(transaction.createdAt).toLocaleTimeString()}</p>
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
  );
}