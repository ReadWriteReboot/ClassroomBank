import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddStudentModal({ isOpen, onClose }: AddStudentModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const addStudentMutation = useMutation({
    mutationFn: async ({ firstName, lastName, email }: { 
      firstName: string; 
      lastName: string; 
      email: string;
    }) => {
      // Generate a simple student ID based on name
      const studentId = `student_${firstName.toLowerCase()}_${lastName.toLowerCase()}_${Date.now()}`;
      
      const response = await apiRequest("POST", "/api/add-student", {
        id: studentId,
        firstName,
        lastName,
        email,
        role: "student",
      });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Success",
        description: `Student ${firstName} ${lastName} has been added successfully!`,
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
        description: error.message || "Failed to add student",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstName || !lastName) {
      toast({
        title: "Missing Information",
        description: "Please fill in at least the first and last name.",
        variant: "destructive",
      });
      return;
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    addStudentMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
    });
  };

  const handleClose = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">👨‍🎓</span>
          </div>
          <DialogTitle className="text-2xl font-bold text-gray-800">Add New Student</DialogTitle>
          <p className="text-gray-600">Add a new student to your classroom bank</p>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="firstName" className="text-lg font-semibold text-gray-700 flex items-center">
              👤 First Name
            </Label>
            <Input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="mt-2 text-lg h-12"
              placeholder="Enter first name"
              required
            />
          </div>

          <div>
            <Label htmlFor="lastName" className="text-lg font-semibold text-gray-700 flex items-center">
              👤 Last Name
            </Label>
            <Input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="mt-2 text-lg h-12"
              placeholder="Enter last name"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-lg font-semibold text-gray-700 flex items-center">
              📧 Email (Optional)
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 text-lg h-12"
              placeholder="Enter email address"
            />
            <p className="text-sm text-gray-500 mt-1">
              Email is optional but helpful for student identification
            </p>
          </div>

          <div className="flex space-x-4">
            <Button 
              type="button"
              onClick={handleClose}
              variant="outline"
              className="flex-1 h-12 text-lg"
              disabled={addStudentMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              className="flex-1 bg-purple-500 hover:bg-purple-600 text-white h-12 text-lg"
              disabled={addStudentMutation.isPending}
            >
              {addStudentMutation.isPending ? "Adding..." : "Add Student"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
