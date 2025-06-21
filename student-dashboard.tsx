import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import WithdrawalModal from "@/components/withdrawal-modal";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Transaction {
  id: number;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
}

export default function StudentDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);

  const { data: transactions, isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions"],
    retry: false,
  });

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [user, authLoading, toast]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🐷</span>
          </div>
          <p className="text-gray-600 text-lg text-center">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "paycheck":
        return "💰";
      case "bonus":
      case "reward":
        return "⭐";
      case "withdrawal":
        return "🛒";
      case "fine":
        return "⚠️";
      case "rent":
        return "🏠";
      default:
        return "💳";
    }
  };

  const getTransactionColor = (amount: string) => {
    return parseFloat(amount) >= 0 ? "text-green-600" : "text-red-600";
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return num >= 0 ? `+$${amount}` : `-$${Math.abs(num).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getFullName = () => {
    const firstName = user?.firstName || "";
    const lastName = user?.lastName || "";
    return `${firstName} ${lastName}`.trim() || "Student";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-primary">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">🐷</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Class Bank</h1>
                <p className="text-gray-600">Welcome back, {getFullName()}!</p>
              </div>
            </div>
            <Button 
              onClick={handleLogout}
              variant="destructive"
              className="font-semibold"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-secondary to-green-600 rounded-3xl p-8 text-white mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold mb-2">My Account Balance</h2>
              <div className="flex items-center space-x-2">
                <span className="text-5xl font-bold">
                  ${user?.account?.balance || "0.00"}
                </span>
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="text-right">
              <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-4xl">💳</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Button 
            onClick={() => setShowWithdrawalModal(true)}
            className="bg-accent hover:bg-yellow-600 text-white p-8 rounded-2xl font-bold text-xl transition-colors shadow-lg hover:shadow-xl h-auto"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-3xl">💸</span>
              <span>Request Withdrawal</span>
            </div>
          </Button>

          <Button 
            onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
            className="bg-blue-500 hover:bg-blue-600 text-white p-8 rounded-2xl font-bold text-xl transition-colors shadow-lg hover:shadow-xl h-auto"
          >
            <div className="flex items-center justify-center space-x-3">
              <span className="text-3xl">📊</span>
              <span>View History</span>
            </div>
          </Button>
        </div>

        {/* Recent Activity */}
        <Card className="rounded-2xl shadow-lg">
          <CardContent className="p-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
              <span className="text-3xl mr-3">📈</span>
              Recent Activity
            </h3>
            
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl animate-pulse">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-24"></div>
                      </div>
                    </div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-4">
                {transactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-xl">{getTransactionIcon(transaction.type)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800">{transaction.description}</p>
                        <p className="text-gray-600 text-sm">{formatDate(transaction.createdAt)}</p>
                      </div>
                    </div>
                    <span className={`font-bold text-lg ${getTransactionColor(transaction.amount)}`}>
                      {formatAmount(transaction.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <span className="text-4xl mb-4 block">📭</span>
                <p className="text-lg">No transactions yet!</p>
                <p>Your activity will appear here once you start using your account.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <WithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        currentBalance={user?.account?.balance || "0.00"}
      />
    </div>
  );
}
