import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  account: {
    balance: string;
  };
}

interface QuickActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

interface CustomAction {
  id: number;
  name: string;
  amount: string;
  type: "reward" | "fine";
}

const QUICK_REWARDS = [
  { name: "Class Helper", amount: "10.00", icon: "🏆" },
  { name: "Green Folder Returned", amount: "5.00", icon: "📁" },
  { name: "All Paperwork Returned", amount: "50.00", icon: "📋" },
  { name: "Signed Forms Returned", amount: "20.00", icon: "✅" },
  { name: "Perfect Weekly Attendance", amount: "20.00", icon: "⭐" },
];

const QUICK_FINES = [
  { name: "Talking Back", amount: "20.00", icon: "🗣️" },
  { name: "Removed from Class", amount: "50.00", icon: "🚪" },
  { name: "Cheating/Fighting/Office", amount: "100.00", icon: "⚠️" },
];

export default function QuickActionsModal({ isOpen, onClose, student }: QuickActionsModalProps) {
  const [customAmount, setCustomAmount] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [newActionName, setNewActionName] = useState("");
  const [newActionAmount, setNewActionAmount] = useState("");
  const [newActionType, setNewActionType] = useState<"reward" | "fine">("reward");
  const { toast } = useToast();

  // Fetch custom actions
  const { data: customActions = [] } = useQuery<CustomAction[]>({
    queryKey: ["/api/custom-actions"],
    enabled: isOpen,
  });

  const quickActionMutation = useMutation({
    mutationFn: async ({ amount, description, type }: { 
      amount: string; 
      description: string; 
      type: "add" | "subtract";
    }) => {
      if (!student) throw new Error("No student selected");
      
      const response = await apiRequest("POST", "/api/adjust-balance", {
        userId: student.id,
        amount,
        description,
        type,
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: data.message,
      });
      handleClose();
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
        description: error.message || "Failed to process action",
        variant: "destructive",
      });
    },
  });

  const createCustomActionMutation = useMutation({
    mutationFn: async ({ name, amount, type }: { name: string; amount: string; type: "reward" | "fine" }) => {
      const response = await apiRequest("POST", "/api/custom-actions", {
        name,
        amount,
        type,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-actions"] });
      setNewActionName("");
      setNewActionAmount("");
      setNewActionType("reward");
      toast({
        title: "Success",
        description: "Custom action created successfully",
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
        description: "Failed to create custom action",
        variant: "destructive",
      });
    },
  });

  const deleteCustomActionMutation = useMutation({
    mutationFn: async (actionId: number) => {
      const response = await apiRequest("DELETE", `/api/custom-actions/${actionId}`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-actions"] });
      toast({
        title: "Success",
        description: "Custom action deleted successfully",
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
        description: "Failed to delete custom action",
        variant: "destructive",
      });
    },
  });

  const handleQuickAction = (amount: string, description: string, type: "add" | "subtract") => {
    quickActionMutation.mutate({ amount, description, type });
  };

  const handleCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!customAmount || !customDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in both amount and description.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(customAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    quickActionMutation.mutate({
      amount: amountNum.toFixed(2),
      description: customDescription,
      type: "add",
    });
  };

  const handleCreateCustomAction = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newActionName || !newActionAmount) {
      toast({
        title: "Missing Information",
        description: "Please fill in both name and amount.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(newActionAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    createCustomActionMutation.mutate({
      name: newActionName,
      amount: amountNum.toFixed(2),
      type: newActionType,
    });
  };

  const handleClose = () => {
    setCustomAmount("");
    setCustomDescription("");
    setNewActionName("");
    setNewActionAmount("");
    setNewActionType("reward");
    onClose();
  };

  if (!student) return null;

  const customRewards = customActions.filter(action => action.type === "reward");
  const customFines = customActions.filter(action => action.type === "fine");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚡</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-800">Quick Actions</DialogTitle>
          <p className="text-gray-600">
            Rewards and fines for {student.firstName} {student.lastName}
          </p>
          <p className="text-sm text-gray-500">
            Current balance: <span className="font-semibold">${student.account.balance}</span>
          </p>
        </DialogHeader>

        <Tabs defaultValue="rewards" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="rewards">💰 Rewards</TabsTrigger>
            <TabsTrigger value="fines">📉 Fines</TabsTrigger>
            <TabsTrigger value="my-actions">⭐ My Actions</TabsTrigger>
            <TabsTrigger value="custom">✏️ Custom</TabsTrigger>
          </TabsList>

          <TabsContent value="rewards" className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold text-green-600 mb-4">Quick Rewards</h3>
            <div className="grid gap-3">
              {QUICK_REWARDS.map((reward) => (
                <Card key={reward.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{reward.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{reward.name}</p>
                          <p className="text-green-600 font-bold">+${reward.amount}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleQuickAction(reward.amount, reward.name, "add")}
                        disabled={quickActionMutation.isPending}
                        className="bg-green-500 hover:bg-green-600 text-white"
                      >
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="fines" className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Quick Fines</h3>
            <div className="grid gap-3">
              {QUICK_FINES.map((fine) => (
                <Card key={fine.name} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{fine.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-800">{fine.name}</p>
                          <p className="text-red-600 font-bold">-${fine.amount}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleQuickAction(fine.amount, fine.name, "subtract")}
                        disabled={quickActionMutation.isPending}
                        className="bg-red-500 hover:bg-red-600 text-white"
                      >
                        Deduct
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-actions" className="space-y-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-purple-600">Your Custom Actions</h3>
              <p className="text-sm text-gray-500">{customActions.length} custom actions</p>
            </div>

            {customActions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No custom actions yet</p>
                <p className="text-sm text-gray-400">Create your own frequently used rewards and fines</p>
              </div>
            ) : (
              <div className="space-y-3">
                {customRewards.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-green-600 mb-2">Custom Rewards</h4>
                    {customRewards.map((action) => (
                      <Card key={action.id} className="hover:shadow-md transition-shadow mb-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">⭐</span>
                              <div>
                                <p className="font-semibold text-gray-800">{action.name}</p>
                                <p className="text-green-600 font-bold">+${action.amount}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleQuickAction(action.amount, action.name, "add")}
                                disabled={quickActionMutation.isPending}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                Add
                              </Button>
                              <Button
                                onClick={() => deleteCustomActionMutation.mutate(action.id)}
                                disabled={deleteCustomActionMutation.isPending}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {customFines.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-red-600 mb-2">Custom Fines</h4>
                    {customFines.map((action) => (
                      <Card key={action.id} className="hover:shadow-md transition-shadow mb-2">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <span className="text-2xl">⚠️</span>
                              <div>
                                <p className="font-semibold text-gray-800">{action.name}</p>
                                <p className="text-red-600 font-bold">-${action.amount}</p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                onClick={() => handleQuickAction(action.amount, action.name, "subtract")}
                                disabled={quickActionMutation.isPending}
                                className="bg-red-500 hover:bg-red-600 text-white"
                              >
                                Deduct
                              </Button>
                              <Button
                                onClick={() => deleteCustomActionMutation.mutate(action.id)}
                                disabled={deleteCustomActionMutation.isPending}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Card className="border-dashed border-2 border-purple-300">
              <CardContent className="p-6">
                <h4 className="text-md font-semibold text-purple-600 mb-4">Create New Quick Action</h4>
                <form onSubmit={handleCreateCustomAction} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="action-name">Action Name</Label>
                      <Input
                        id="action-name"
                        value={newActionName}
                        onChange={(e) => setNewActionName(e.target.value)}
                        placeholder="e.g., Homework Complete"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="action-amount">Amount ($)</Label>
                      <Input
                        id="action-amount"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={newActionAmount}
                        onChange={(e) => setNewActionAmount(e.target.value)}
                        placeholder="0.00"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="action-type">Action Type</Label>
                    <Select value={newActionType} onValueChange={(value: "reward" | "fine") => setNewActionType(value)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reward">💰 Reward (Add Money)</SelectItem>
                        <SelectItem value="fine">📉 Fine (Subtract Money)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    disabled={createCustomActionMutation.isPending || !newActionName || !newActionAmount}
                    className="w-full bg-purple-500 hover:bg-purple-600 text-white"
                  >
                    {createCustomActionMutation.isPending ? "Creating..." : "Create Quick Action"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="custom" className="space-y-4 mt-6">
            <h3 className="text-lg font-semibold text-blue-600 mb-4">Custom Amount</h3>
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleCustomAction} className="space-y-4">
                  <div>
                    <Label htmlFor="custom-amount">Amount ($)</Label>
                    <Input
                      id="custom-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      placeholder="0.00"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="custom-description">Description</Label>
                    <Textarea
                      id="custom-description"
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                      placeholder="Reason for this reward..."
                      className="mt-1"
                      rows={3}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={quickActionMutation.isPending || !customAmount || !customDescription}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {quickActionMutation.isPending ? "Processing..." : "Add Custom Reward"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}