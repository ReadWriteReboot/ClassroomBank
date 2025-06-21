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

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: string;
}

export default function WithdrawalModal({ isOpen, onClose, currentBalance }: WithdrawalModalProps) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const { toast } = useToast();

  const submitRequestMutation = useMutation({
    mutationFn: async ({ amount, reason }: { amount: string; reason: string }) => {
      await apiRequest("POST", "/api/withdrawal-requests", {
        amount,
        reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      toast({
        title: "Success",
        description: "Withdrawal request submitted! Your teacher will review it soon. 🏦",
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
        description: error.message || "Failed to submit withdrawal request",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !reason) {
      toast({
        title: "Missing Information",
        description: "Please fill in both the amount and reason.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(amount);
    const balanceNum = parseFloat(currentBalance);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    if (amountNum > balanceNum) {
      toast({
        title: "Insufficient Balance",
        description: "You cannot withdraw more than your current balance.",
        variant: "destructive",
      });
      return;
    }

    submitRequestMutation.mutate({ amount: amountNum.toFixed(2), reason });
  };

  const handleClose = () => {
    setAmount("");
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💸</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-800">Request Withdrawal</DialogTitle>
          <p className="text-gray-600">Ask your teacher to withdraw money</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="amount" className="text-lg font-semibold text-gray-700 flex items-center">
              💰 Amount to Withdraw
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalance}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg h-12"
                placeholder="0.00"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Available balance: <span className="font-semibold">${currentBalance}</span>
            </p>
          </div>

          <div>
            <Label htmlFor="reason" className="text-lg font-semibold text-gray-700 flex items-center">
              📝 What do you need it for?
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 text-lg resize-none"
              rows={3}
              placeholder="Tell your teacher why you need this money..."
            />
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-lg"
              disabled={submitRequestMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-accent hover:bg-yellow-600 text-white h-12 text-lg"
              disabled={submitRequestMutation.isPending}
            >
              {submitRequestMutation.isPending ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
