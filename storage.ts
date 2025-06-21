import {
  users,
  accounts,
  transactions,
  withdrawalRequests,
  customQuickActions,
  type User,
  type UpsertUser,
  type Account,
  type InsertAccount,
  type Transaction,
  type InsertTransaction,
  type WithdrawalRequest,
  type InsertWithdrawalRequest,
  type UpdateWithdrawalRequest,
  type CustomQuickAction,
  type InsertCustomQuickAction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Account operations
  getAccount(userId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccountBalance(userId: string, newBalance: string): Promise<void>;
  
  // Student operations
  getAllStudents(): Promise<(User & { account: Account })[]>;
  
  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransactionsByAccount(accountId: number): Promise<Transaction[]>;
  
  // Withdrawal request operations
  createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest>;
  getPendingWithdrawalRequests(): Promise<(WithdrawalRequest & { user: User, account: Account })[]>;
  updateWithdrawalRequest(id: number, update: UpdateWithdrawalRequest): Promise<WithdrawalRequest>;
  
  // Stats operations
  getTotalStudentCount(): Promise<number>;
  getTotalBalance(): Promise<string>;
  getPendingRequestCount(): Promise<number>;
  getWeeklyTotal(): Promise<string>;
  
  // Custom quick actions operations
  getCustomQuickActions(teacherId: string): Promise<CustomQuickAction[]>;
  createCustomQuickAction(action: InsertCustomQuickAction): Promise<CustomQuickAction>;
  deleteCustomQuickAction(id: number, teacherId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    // Create account if user is a student and doesn't have one
    if (user.role === "student") {
      const existingAccount = await this.getAccount(user.id);
      if (!existingAccount) {
        await this.createAccount({ userId: user.id });
      }
    }
    
    return user;
  }

  // Account operations
  async getAccount(userId: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.userId, userId));
    return account;
  }

  async createAccount(account: InsertAccount): Promise<Account> {
    const [newAccount] = await db.insert(accounts).values(account).returning();
    return newAccount;
  }

  async updateAccountBalance(userId: string, newBalance: string): Promise<void> {
    await db
      .update(accounts)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(accounts.userId, userId));
  }

  // Student operations
  async getAllStudents(): Promise<(User & { account: Account })[]> {
    const results = await db
      .select()
      .from(users)
      .leftJoin(accounts, eq(users.id, accounts.userId))
      .where(eq(users.role, "student"))
      .orderBy(users.firstName, users.lastName);

    return results.map(row => ({
      ...row.users,
      account: row.accounts!,
    }));
  }

  // Transaction operations
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByAccount(accountId: number): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.accountId, accountId))
      .orderBy(desc(transactions.createdAt));
  }

  // Withdrawal request operations
  async createWithdrawalRequest(request: InsertWithdrawalRequest): Promise<WithdrawalRequest> {
    const [newRequest] = await db.insert(withdrawalRequests).values(request).returning();
    return newRequest;
  }

  async getPendingWithdrawalRequests(): Promise<(WithdrawalRequest & { user: User, account: Account })[]> {
    const results = await db
      .select()
      .from(withdrawalRequests)
      .leftJoin(accounts, eq(withdrawalRequests.accountId, accounts.id))
      .leftJoin(users, eq(accounts.userId, users.id))
      .where(eq(withdrawalRequests.status, "pending"))
      .orderBy(desc(withdrawalRequests.createdAt));

    return results.map(row => ({
      ...row.withdrawal_requests,
      user: row.users!,
      account: row.accounts!,
    }));
  }

  async updateWithdrawalRequest(id: number, update: UpdateWithdrawalRequest): Promise<WithdrawalRequest> {
    const [updatedRequest] = await db
      .update(withdrawalRequests)
      .set({ ...update, reviewedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Stats operations
  async getTotalStudentCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.role, "student"));
    return result.count;
  }

  async getTotalBalance(): Promise<string> {
    const [result] = await db
      .select({ total: sql<string>`coalesce(sum(balance), 0)` })
      .from(accounts);
    return result.total || "0.00";
  }

  async getPendingRequestCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "pending"));
    return result.count;
  }

  async getWeeklyTotal(): Promise<string> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const [result] = await db
      .select({ total: sql<string>`coalesce(sum(amount), 0)` })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "paycheck"),
          sql`${transactions.createdAt} >= ${oneWeekAgo}`
        )
      );
    return result.total || "0.00";
  }

  // Custom quick actions operations
  async getCustomQuickActions(teacherId: string): Promise<CustomQuickAction[]> {
    return await db
      .select()
      .from(customQuickActions)
      .where(eq(customQuickActions.teacherId, teacherId))
      .orderBy(customQuickActions.name);
  }

  async createCustomQuickAction(action: InsertCustomQuickAction): Promise<CustomQuickAction> {
    const [newAction] = await db
      .insert(customQuickActions)
      .values(action)
      .returning();
    return newAction;
  }

  async deleteCustomQuickAction(id: number, teacherId: string): Promise<void> {
    await db
      .delete(customQuickActions)
      .where(
        and(
          eq(customQuickActions.id, id),
          eq(customQuickActions.teacherId, teacherId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
