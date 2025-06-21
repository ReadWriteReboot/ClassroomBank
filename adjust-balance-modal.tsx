import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  account: {
    balance: string;
  };
}

interface AdjustBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  type: "add" | "subtract";
}

export default function AdjustBalanceModal({ isOpen, onClose, student, type }: AdjustBalanceModalProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const { toast } = useToast();

  const adjustBalanceMutation = useMutation({
    mutationFn: async ({ studentId, amount, description, type }: { 
      studentId: string; 
      amount: string; 
      description: string; 
      type: "add" | "subtract";
    }) => {
      const response = await apiRequest("POST", "/api/adjust-balance", {
        studentId,
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
        description: error.message || "Failed to adjust balance",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !student) {
      toast({
        title: "Missing Information",
        description: "Please fill in both the amount and description.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    // Check if subtraction would result in negative balance
    if (type === "subtract") {
      const currentBalance = parseFloat(student.account.balance);
      if (amountNum > currentBalance) {
        toast({
          title: "Insufficient Balance",
          description: "Cannot subtract more than the current balance.",
          variant: "destructive",
        });
        return;
      }
    }

    adjustBalanceMutation.mutate({
      studentId: student.id,
      amount: amountNum.toFixed(2),
      description,
      type,
    });
  };

  const handleClose = () => {
    setAmount("");
    setDescription("");
    onClose();
  };

  if (!student) return null;

  const isAdding = type === "add";
  const actionText = isAdding ? "Add Money" : "Subtract Money";
  const actionIcon = isAdding ? "💰" : "💸";
  const actionColor = isAdding ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader className="text-center">
          <div className={`w-16 h-16 ${isAdding ? "bg-green-100" : "bg-red-100"} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <span className="text-3xl">{actionIcon}</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-800">{actionText}</DialogTitle>
          <p className="text-gray-600">
            {isAdding ? "Add money to" : "Subtract money from"} {student.firstName} {student.lastName}'s account
          </p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="amount" className="text-lg font-semibold text-gray-700 flex items-center">
              {actionIcon} Amount
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={type === "subtract" ? student.account.balance : undefined}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg h-12"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Current balance: <span className="font-semibold">${student.account.balance}</span>
            </p>
          </div>

          <div>
            <Label htmlFor="description" className="text-lg font-semibold text-gray-700 flex items-center">
              📝 Reason
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2 text-lg resize-none"
              rows={3}
              placeholder={`Why are you ${isAdding ? "adding" : "subtracting"} this money?`}
            />
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-lg"
              disabled={adjustBalanceMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className={`flex-1 text-white h-12 text-lg ${actionColor}`}
              disabled={adjustBalanceMutation.isPending}
            >
              {adjustBalanceMutation.isPending ? "Processing..." : actionText}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
