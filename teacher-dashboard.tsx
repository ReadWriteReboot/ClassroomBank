import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import PaycheckModal from "@/components/paycheck-modal";
import AdjustBalanceModal from "@/components/adjust-balance-modal";
import QuickActionsModal from "@/components/quick-actions-modal";
import RentCollectionModal from "@/components/rent-collection-modal";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  account: {
    id: number;
    balance: string;
  };
}

interface WithdrawalRequest {
  id: number;
  amount: string;
  reason: string;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  };
  account: {
    balance: string;
  };
}

interface Stats {
  totalStudents: number;
  totalBalance: string;
  pendingRequests: number;
  weeklyTotal: string;
}

export default function TeacherDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("students");
  const [searchTerm, setSearchTerm] = useState("");
  const [showPaycheckModal, setShowPaycheckModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showQuickActionsModal, setShowQuickActionsModal] = useState(false);
  const [showRentModal, setShowRentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<"add" | "subtract">("add");

  const { data: students, isLoading: studentsLoading } = useQuery<Student[]>({
    queryKey: ["/api/students"],
    retry: false,
  });

  const { data: pendingRequests, isLoading: requestsLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ["/api/pending-requests"],
    retry: false,
  });

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    retry: false,
  });

  const approveRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/withdrawal-requests/${requestId}`, {
        status: "approved",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: "Withdrawal request approved! 💰",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to approve request",
        variant: "destructive",
      });
    },
  });

  const denyRequestMutation = useMutation({
    mutationFn: async (requestId: number) => {
      await apiRequest("PATCH", `/api/withdrawal-requests/${requestId}`, {
        status: "denied",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pending-requests"] });
      toast({
        title: "Success",
        description: "Withdrawal request denied.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to deny request",
        variant: "destructive",
      });
    },
  });

  // Redirect to home if not authenticated or not a teacher
  useEffect(() => {
    if (!authLoading && (!user || user.role !== "teacher")) {
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

  const handleAdjustBalance = (student: Student, type: "add" | "subtract") => {
    setSelectedStudent(student);
    setAdjustmentType(type);
    setShowAdjustModal(true);
  };

  const handleQuickActions = (student: Student) => {
    setSelectedStudent(student);
    setShowQuickActionsModal(true);
  };

  const filteredStudents = students?.filter(student => {
    const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours === 1) return "1 hour ago";
    if (diffInHours < 24) return `${diffInHours} hours ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "1 day ago";
    return `${diffInDays} days ago`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b-4 border-purple-500">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
                <p className="text-gray-600">Manage Student Accounts</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button 
                onClick={() => setShowPaycheckModal(true)}
                className="bg-secondary hover:bg-green-600 text-white font-semibold"
              >
                💰 Paycheck
              </Button>
              <Button 
                onClick={() => setShowRentModal(true)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold"
              >
                🏠 Collect Rent
              </Button>
              <Button 
                onClick={handleLogout}
                variant="destructive"
                className="font-semibold"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-semibold">Total Students</p>
                  <p className="text-3xl font-bold text-gray-800">
                    {statsLoading ? "..." : stats?.totalStudents || 0}
                  </p>
                </div>
                <span className="text-4xl">👥</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-semibold">Total Balance</p>
                  <p className="text-3xl font-bold text-secondary">
                    {statsLoading ? "..." : `$${stats?.totalBalance || "0.00"}`}
                  </p>
                </div>
                <span className="text-4xl">💰</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-semibold">Pending Requests</p>
                  <p className="text-3xl font-bold text-accent">
                    {statsLoading ? "..." : stats?.pendingRequests || 0}
                  </p>
                </div>
                <span className="text-4xl">⏳</span>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 font-semibold">This Week</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {statsLoading ? "..." : `$${stats?.weeklyTotal || "0.00"}`}
                  </p>
                </div>
                <span className="text-4xl">📊</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navigation Tabs */}
        <Card className="rounded-2xl shadow-lg mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button 
                onClick={() => setActiveTab("students")}
                className={`py-4 border-b-2 font-semibold ${
                  activeTab === "students"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                👨‍🎓 Student Accounts
              </button>
              <button 
                onClick={() => setActiveTab("requests")}
                className={`py-4 border-b-2 font-semibold ${
                  activeTab === "requests"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                📝 Withdrawal Requests
              </button>
            </nav>
          </div>

          {/* Student Accounts Tab */}
          {activeTab === "students" && (
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-800">Student Accounts</h3>
                <Input 
                  type="text" 
                  placeholder="Search students..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>

              {studentsLoading ? (
                <div className="grid gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl animate-pulse">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div>
                          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-24"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="h-6 bg-gray-200 rounded w-16"></div>
                        <div className="flex space-x-2">
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                          <div className="w-8 h-8 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredStudents && filteredStudents.length > 0 ? (
                <div className="grid gap-4">
                  {filteredStudents.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          <span>{getInitials(student.firstName, student.lastName)}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {student.firstName} {student.lastName}
                          </p>
                          <p className="text-gray-600 text-sm">{student.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="font-bold text-2xl text-secondary">
                          ${student.account.balance}
                        </span>
                        <div className="flex space-x-2">
                          <Button 
                            onClick={() => handleQuickActions(student)}
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg transition-colors"
                            title="Quick rewards and fines"
                          >
                            ⚡
                          </Button>
                          <Button 
                            onClick={() => handleAdjustBalance(student, "add")}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-lg transition-colors"
                          >
                            +
                          </Button>
                          <Button 
                            onClick={() => handleAdjustBalance(student, "subtract")}
                            size="sm"
                            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-colors"
                          >
                            -
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-4 block">👥</span>
                  <p className="text-lg">No students found</p>
                  {searchTerm && <p>Try adjusting your search term.</p>}
                </div>
              )}
            </CardContent>
          )}

          {/* Withdrawal Requests Tab */}
          {activeTab === "requests" && (
            <CardContent className="p-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">Pending Withdrawal Requests</h3>
              
              {requestsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-yellow-200 rounded-full"></div>
                          <div>
                            <div className="h-4 bg-yellow-200 rounded w-48 mb-2"></div>
                            <div className="h-3 bg-yellow-200 rounded w-32 mb-1"></div>
                            <div className="h-3 bg-yellow-200 rounded w-40"></div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <div className="w-20 h-8 bg-yellow-200 rounded"></div>
                          <div className="w-20 h-8 bg-yellow-200 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingRequests && pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <span className="text-xl">💸</span>
                          </div>
                          <div>
                            <p className="font-semibold text-gray-800">
                              {request.user.firstName} {request.user.lastName} wants to withdraw ${request.amount}
                            </p>
                            <p className="text-gray-600 text-sm">
                              Requested {getTimeAgo(request.createdAt)} • Current balance: ${request.account.balance}
                            </p>
                            <p className="text-gray-600 text-sm">
                              Reason: "{request.reason}"
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <Button 
                            onClick={() => approveRequestMutation.mutate(request.id)}
                            disabled={approveRequestMutation.isPending}
                            className="bg-green-500 hover:bg-green-600 text-white font-semibold"
                          >
                            ✓ Approve
                          </Button>
                          <Button 
                            onClick={() => denyRequestMutation.mutate(request.id)}
                            disabled={denyRequestMutation.isPending}
                            variant="destructive"
                            className="font-semibold"
                          >
                            ✗ Deny
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-4 block">📭</span>
                  <p className="text-lg">No pending withdrawal requests</p>
                  <p>All caught up! New requests will appear here.</p>
                </div>
              )}
            </CardContent>
          )}
        </Card>
      </main>

      <PaycheckModal
        isOpen={showPaycheckModal}
        onClose={() => setShowPaycheckModal(false)}
      />

      <AdjustBalanceModal
        isOpen={showAdjustModal}
        onClose={() => setShowAdjustModal(false)}
        student={selectedStudent}
        type={adjustmentType}
      />

      <QuickActionsModal
        isOpen={showQuickActionsModal}
        onClose={() => setShowQuickActionsModal(false)}
        student={selectedStudent}
      />

      <RentCollectionModal
        isOpen={showRentModal}
        onClose={() => setShowRentModal(false)}
      />
    </div>
  );
}
