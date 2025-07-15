import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Package, 
  CreditCard, 
  Users as UsersIcon,
  Send,
  Plus,
  Mail,
  Shield,
  CheckCircle
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import TopUpModal from "@/components/modals/top-up-modal";
import SendOutModal from "@/components/modals/send-out-modal";

const navigation = [
  { name: "Dashboard", href: "/admin", icon: BarChart3 },
  { name: "Orders", href: "/admin/orders", icon: Package },
  { name: "Users", href: "/admin/users", icon: UsersIcon },
  { name: "Transactions", href: "/admin/transactions", icon: CreditCard },
  { name: "Approvals", href: "/admin/approvals", icon: CheckCircle },
];

export default function AdminSidebar() {
  const [location] = useLocation();
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showSendOutModal, setShowSendOutModal] = useState(false);

  const { data: currentUser, isLoading: currentUserLoading } = useQuery({
    queryKey: ["/api/users/current"],
  });

  return (
    <aside className="w-64 bg-white shadow-lg border-r">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
            <Shield className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DocuBot Admin</h1>
            <p className="text-sm text-red-600 font-medium">Administration Panel</p>
          </div>
        </div>
      </div>

      <nav className="mt-6">
        <ul className="space-y-2 px-4">
          {navigation.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                      isActive
                        ? "bg-red-100 text-red-700 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 pt-6 border-t border-gray-200 space-y-3 px-4">
          <Button 
            onClick={() => setShowTopUpModal(true)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Top Up Balance
          </Button>

          <Button 
            onClick={() => setShowSendOutModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Mail className="w-4 h-4 mr-2" />
            Send Out
          </Button>
        </div>

        <div className="px-4 py-3 border-t border-gray-200 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Admin Balance</span>
            <span className="text-sm font-bold text-green-600">
              {currentUserLoading ? "..." : `$${currentUser?.balance || "0.00"}`}
            </span>
          </div>
        </div>
      </nav>
      
      <TopUpModal isOpen={showTopUpModal} onClose={() => setShowTopUpModal(false)} />
      <SendOutModal isOpen={showSendOutModal} onClose={() => setShowSendOutModal(false)} />
    </aside>
  );
}