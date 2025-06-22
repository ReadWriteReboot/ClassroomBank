import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertWithdrawalRequestSchema,
  updateWithdrawalRequestSchema,
  insertTransactionSchema,
  insertCustomQuickActionSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      let account = null;
      if (user.role === "student") {
        account = await storage.getAccount(userId);
      }

      res.json({ ...user, account });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Student routes
  app.post('/api/withdrawal-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "student") {
        return res.status(403).json({ message: "Only students can create withdrawal requests" });
      }

      const account = await storage.getAccount(userId);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const data = insertWithdrawalRequestSchema.parse(req.body);
      
      // Check if student has sufficient balance
      if (parseFloat(data.amount) > parseFloat(account.balance)) {
        return res.status(400).json({ message: "Insufficient balance" });
      }

      const request = await storage.createWithdrawalRequest({
        ...data,
        accountId: account.id,
      });

      res.json(request);
    } catch (error) {
      console.error("Error creating withdrawal request:", error);
      res.status(500).json({ message: "Failed to create withdrawal request" });
    }
  });

  app.get('/api/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const account = await storage.getAccount(userId);
      
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }

      const transactions = await storage.getTransactionsByAccount(account.id);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  // Teacher routes
  app.get('/api/students', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can view all students" });
      }

      const students = await storage.getAllStudents();
      res.json(students);
    } catch (error) {
      console.error("Error fetching students:", error);
      res.status(500).json({ message: "Failed to fetch students" });
    }
  });

  app.get('/api/pending-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can view withdrawal requests" });
      }

      const requests = await storage.getPendingWithdrawalRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  app.patch('/api/withdrawal-requests/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can approve/deny requests" });
      }

      const requestId = parseInt(req.params.id);
      const updateData = updateWithdrawalRequestSchema.parse({
        ...req.body,
        reviewedBy: userId,
      });

      const updatedRequest = await storage.updateWithdrawalRequest(requestId, updateData);

      // If approved, deduct from account balance and create transaction
      if (updateData.status === "approved") {
        const pendingRequests = await storage.getPendingWithdrawalRequests();
        const originalRequest = pendingRequests.find(r => r.id === requestId);
        
        if (originalRequest) {
          const currentBalance = parseFloat(originalRequest.account.balance);
          const withdrawalAmount = parseFloat(originalRequest.amount);
          const newBalance = (currentBalance - withdrawalAmount).toFixed(2);
          
          await storage.updateAccountBalance(originalRequest.user.id, newBalance);
          
          await storage.createTransaction({
            accountId: originalRequest.account.id,
            type: "withdrawal",
            amount: `-${originalRequest.amount}`,
            description: `Withdrawal: ${originalRequest.reason}`,
            createdBy: userId,
          });
        }
      }

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error updating withdrawal request:", error);
      res.status(500).json({ message: "Failed to update withdrawal request" });
    }
  });

  app.post('/api/distribute-paycheck', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can distribute paychecks" });
      }

      const { amount } = z.object({ amount: z.string() }).parse(req.body);
      const students = await storage.getAllStudents();

      const transactions = [];
      
      for (const student of students) {
        const currentBalance = parseFloat(student.account.balance);
        const paycheckAmount = parseFloat(amount);
        const newBalance = (currentBalance + paycheckAmount).toFixed(2);
        
        await storage.updateAccountBalance(student.id, newBalance);
        
        const transaction = await storage.createTransaction({
          accountId: student.account.id,
          type: "paycheck",
          amount: amount,
          description: "Weekly Paycheck",
          createdBy: userId,
        });
        
        transactions.push(transaction);
      }

      res.json({ message: `Paycheck of $${amount} distributed to ${students.length} students`, transactions });
    } catch (error) {
      console.error("Error distributing paycheck:", error);
      res.status(500).json({ message: "Failed to distribute paycheck" });
    }
  });

  app.post('/api/adjust-balance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can adjust balances" });
      }

      const { studentId, amount, description, type } = z.object({
        studentId: z.string(),
        amount: z.string(),
        description: z.string(),
        type: z.enum(["add", "subtract"])
      }).parse(req.body);

      const student = await storage.getUser(studentId);
      if (!student || student.role !== "student") {
        return res.status(404).json({ message: "Student not found" });
      }

      const account = await storage.getAccount(studentId);
      if (!account) {
        return res.status(404).json({ message: "Student account not found" });
      }

      const currentBalance = parseFloat(account.balance);
      const adjustmentAmount = parseFloat(amount);
      const newBalance = type === "add" 
        ? (currentBalance + adjustmentAmount).toFixed(2)
        : (currentBalance - adjustmentAmount).toFixed(2);

      if (parseFloat(newBalance) < 0) {
        return res.status(400).json({ message: "Balance cannot be negative" });
      }

      await storage.updateAccountBalance(studentId, newBalance);
      
      const transaction = await storage.createTransaction({
        accountId: account.id,
        type: type === "add" ? "bonus" : "withdrawal",
        amount: type === "add" ? amount : `-${amount}`,
        description,
        createdBy: userId,
      });

      res.json({ message: "Balance adjusted successfully", transaction });
    } catch (error) {
      console.error("Error adjusting balance:", error);
      res.status(500).json({ message: "Failed to adjust balance" });
    }
  });

  app.post('/api/collect-rent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can collect rent" });
      }

      const { amount } = z.object({ amount: z.string() }).parse(req.body);
      const students = await storage.getAllStudents();

      const transactions = [];
      let studentsAffected = 0;
      
      for (const student of students) {
        const currentBalance = parseFloat(student.account.balance);
        const rentAmount = parseFloat(amount);
        
        // Deduct rent, but don't let balance go below 0
        const newBalance = Math.max(0, currentBalance - rentAmount).toFixed(2);
        
        if (currentBalance > 0) {
          await storage.updateAccountBalance(student.id, newBalance);
          
          const actualDeduction = currentBalance - parseFloat(newBalance);
          if (actualDeduction > 0) {
            const transaction = await storage.createTransaction({
              accountId: student.account.id,
              type: "rent",
              amount: `-${actualDeduction.toFixed(2)}`,
              description: "Monthly Rent",
              createdBy: userId,
            });
            
            transactions.push(transaction);
            studentsAffected++;
          }
        }
      }

      res.json({ 
        message: `Monthly rent collected from ${studentsAffected} students`, 
        transactions,
        studentsAffected
      });
    } catch (error) {
      console.error("Error collecting rent:", error);
      res.status(500).json({ message: "Failed to collect rent" });
    }
  });

  app.get('/api/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can view stats" });
      }

      const [totalStudents, totalBalance, pendingRequests, weeklyTotal] = await Promise.all([
        storage.getTotalStudentCount(),
        storage.getTotalBalance(),
        storage.getPendingRequestCount(),
        storage.getWeeklyTotal(),
      ]);

      res.json({
        totalStudents,
        totalBalance,
        pendingRequests,
        weeklyTotal,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Custom quick actions routes
  app.get('/api/custom-actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can view custom actions" });
      }

      const actions = await storage.getCustomQuickActions(userId);
      res.json(actions);
    } catch (error) {
      console.error("Error fetching custom actions:", error);
      res.status(500).json({ message: "Failed to fetch custom actions" });
    }
  });

  app.post('/api/custom-actions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can create custom actions" });
      }

      const validatedData = insertCustomQuickActionSchema.parse({
        ...req.body,
        teacherId: userId,
      });

      const action = await storage.createCustomQuickAction(validatedData);
      res.json(action);
    } catch (error) {
      console.error("Error creating custom action:", error);
      res.status(500).json({ message: "Failed to create custom action" });
    }
  });

  app.delete('/api/custom-actions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== "teacher") {
        return res.status(403).json({ message: "Only teachers can delete custom actions" });
      }

      const actionId = parseInt(req.params.id);
      await storage.deleteCustomQuickAction(actionId, userId);
      res.json({ message: "Custom action deleted successfully" });
    } catch (error) {
      console.error("Error deleting custom action:", error);
      res.status(500).json({ message: "Failed to delete custom action" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
