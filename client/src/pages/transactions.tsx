import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, Users } from "lucide-react";
import { useState } from "react";

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["/api/transactions"],
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'top_up':
        return <ArrowUpCircle className="w-4 h-4 text-green-600" />;
      case 'order_payment':
        return <ArrowDownCircle className="w-4 h-4 text-red-600" />;
      case 'refund':
        return <RefreshCw className="w-4 h-4 text-blue-600" />;
      default:
        return <ArrowUpCircle className="w-4 h-4 text-gray-600" />;
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
    const matchesSearch = !searchQuery || 
      transaction.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.user?.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSearch;
  });

  return (
    <>
      <Header 
        title="Transactions" 
        description="View all financial transactions and user balance changes" 
      />
      
      <div className="p-6">
        <Card className="border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">All Transactions</h3>
          </div>
          
          <CardContent className="p-6">
            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="top_up">Top Up</SelectItem>
                  <SelectItem value="order_payment">Order Payment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="date"
                className="w-48"
              />
              
              <Input
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 min-w-0"
              />
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Description</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : filteredTransactions?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-gray-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions?.map((transaction: any) => (
                      <tr key={transaction.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-900">
                            {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                              <Users className="text-primary text-xs" />
                            </div>
                            <span className="text-sm text-gray-900">@{transaction.user?.username}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-2">
                            {getTypeIcon(transaction.type)}
                            <Badge className={getTypeBadge(transaction.type)}>
                              {transaction.type.replace('_', ' ')}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-900">{transaction.description}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`font-medium ${
                            transaction.amount.startsWith('-') ? 'text-red-600' : 'text-green-600'
                          }`}>
                            ${transaction.amount}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {transaction.order ? (
                            <span className="text-sm text-gray-600">{transaction.order.orderNumber}</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
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
                Showing {filteredTransactions?.length || 0} results
              </p>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">Previous</button>
                <button className="px-3 py-1 bg-primary text-white rounded text-sm">1</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">2</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">3</button>
                <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 transition-colors">Next</button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
