import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface PaycheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaycheckModal({ isOpen, onClose }: PaycheckModalProps) {
  const [amount, setAmount] = useState("");
  const { toast } = useToast();

  const distributePaycheckMutation = useMutation({
    mutationFn: async (amount: string) => {
      const response = await apiRequest("POST", "/api/distribute-paycheck", { amount });
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
        description: error.message || "Failed to distribute paycheck",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount) {
      toast({
        title: "Missing Amount",
        description: "Please enter the paycheck amount.",
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

    distributePaycheckMutation.mutate(amountNum.toFixed(2));
  };

  const handleClose = () => {
    setAmount("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💰</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-800">Distribute Paycheck</DialogTitle>
          <p className="text-gray-600">Give all students their weekly paycheck</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="amount" className="text-lg font-semibold text-gray-700 flex items-center">
              💵 Paycheck Amount (per student)
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-10 text-lg h-12"
                placeholder="15.00"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              This amount will be added to each student's account.
            </p>
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-lg"
              disabled={distributePaycheckMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-secondary hover:bg-green-600 text-white h-12 text-lg"
              disabled={distributePaycheckMutation.isPending}
            >
              {distributePaycheckMutation.isPending ? "Distributing..." : "Distribute Paycheck"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
