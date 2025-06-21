import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface RentCollectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RentCollectionModal({ isOpen, onClose }: RentCollectionModalProps) {
  const [rentAmount, setRentAmount] = useState("50.00");
  const { toast } = useToast();

  const collectRentMutation = useMutation({
    mutationFn: async (amount: string) => {
      const response = await apiRequest("POST", "/api/collect-rent", { amount });
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
        description: error.message || "Failed to collect rent",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!rentAmount) {
      toast({
        title: "Missing Amount",
        description: "Please enter the rent amount.",
        variant: "destructive",
      });
      return;
    }

    const amountNum = parseFloat(rentAmount);

    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid amount greater than 0.",
        variant: "destructive",
      });
      return;
    }

    collectRentMutation.mutate(amountNum.toFixed(2));
  };

  const handleClose = () => {
    setRentAmount("50.00");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏠</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-800">Collect Monthly Rent</DialogTitle>
          <p className="text-gray-600">Deduct rent from all student accounts</p>
        </DialogHeader>
        
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="text-center">
              <p className="text-orange-800 font-semibold">⚠️ Important</p>
              <p className="text-orange-700 text-sm mt-1">
                This will deduct the rent amount from ALL student accounts at once. 
                Students with insufficient funds will have their balance go to $0.00.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="rentAmount" className="text-lg font-semibold text-gray-700 flex items-center">
              🏠 Monthly Rent Amount
            </Label>
            <div className="relative mt-2">
              <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl font-bold text-gray-500">$</span>
              <Input
                id="rentAmount"
                type="number"
                step="0.01"
                min="0.01"
                value={rentAmount}
                onChange={(e) => setRentAmount(e.target.value)}
                className="pl-10 text-lg h-12"
                placeholder="50.00"
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Typical classroom rent is $50.00 per month
            </p>
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-lg"
              disabled={collectRentMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white h-12 text-lg"
              disabled={collectRentMutation.isPending}
            >
              {collectRentMutation.isPending ? "Collecting..." : "Collect Rent"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}