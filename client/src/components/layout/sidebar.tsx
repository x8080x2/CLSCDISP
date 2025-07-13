import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  BarChart3, 
  Package, 
  Users, 
  CreditCard, 
  Settings, 
  Send 
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Orders", href: "/orders", icon: Package },
  { name: "Users", href: "/users", icon: Users },
  { name: "Transactions", href: "/transactions", icon: CreditCard },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <aside className="w-64 bg-white shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <Send className="text-white text-lg" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">DocuBot</h1>
            <p className="text-sm text-gray-500">Admin Panel</p>
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
                        ? "bg-primary/10 text-primary font-medium"
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
      </nav>
    </aside>
  );
}
