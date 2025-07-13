import { users, orders, transactions, type User, type InsertUser, type Order, type InsertOrder, type Transaction, type InsertTransaction, type OrderWithUser, type TransactionWithDetails } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(userId: number, newBalance: string): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Orders
  getOrder(id: number): Promise<OrderWithUser | undefined>;
  getOrderByNumber(orderNumber: string): Promise<OrderWithUser | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string, notes?: string): Promise<Order>;
  getUserOrders(userId: number): Promise<OrderWithUser[]>;
  getAllOrders(): Promise<OrderWithUser[]>;
  getOrdersByStatus(status: string): Promise<OrderWithUser[]>;

  // Transactions
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getUserTransactions(userId: number): Promise<TransactionWithDetails[]>;
  getAllTransactions(): Promise<TransactionWithDetails[]>;

  // Stats
  getStats(): Promise<{
    totalOrders: number;
    activeUsers: number;
    totalRevenue: string;
    pendingOrders: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserBalance(userId: number, newBalance: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getOrder(id: number): Promise<OrderWithUser | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id));

    if (!order || !order.users) return undefined;

    return {
      ...order.orders,
      user: order.users,
    };
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderWithUser | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.orderNumber, orderNumber));

    if (!order || !order.users) return undefined;

    return {
      ...order.orders,
      user: order.users,
    };
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    // Generate a more readable order number
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6); // Last 6 digits
    const orderNumber = `ORD-${year}${month}${day}-${timestamp}`;

    const [order] = await db
      .insert(orders)
      .values({ ...insertOrder, orderNumber })
      .returning();
    return order;
  }

  async updateOrderStatus(id: number, status: string, notes?: string): Promise<Order> {
    const updateData: any = { 
      status: status as any, 
      updatedAt: new Date() 
    };
    if (notes) updateData.notes = notes;

    const [order] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async getUserOrders(userId: number): Promise<OrderWithUser[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));

    return result
      .filter(row => row.users)
      .map(row => ({
        ...row.orders,
        user: row.users!,
      }));
  }

  async getAllOrders(): Promise<OrderWithUser[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));

    return result
      .filter(row => row.users)
      .map(row => ({
        ...row.orders,
        user: row.users!,
      }));
  }

  async getOrdersByStatus(status: string): Promise<OrderWithUser[]> {
    const result = await db
      .select()
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.status, status as any))
      .orderBy(desc(orders.createdAt));

    return result
      .filter(row => row.users)
      .map(row => ({
        ...row.orders,
        user: row.users!,
      }));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(insertTransaction)
      .returning();
    return transaction;
  }

  async getUserTransactions(userId: number): Promise<TransactionWithDetails[]> {
    const result = await db
      .select()
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));

    return result
      .filter(row => row.users)
      .map(row => ({
        ...row.transactions,
        user: row.users!,
        order: row.orders || undefined,
      }));
  }

  async getAllTransactions(): Promise<TransactionWithDetails[]> {
    const result = await db
      .select()
      .from(transactions)
      .leftJoin(users, eq(transactions.userId, users.id))
      .leftJoin(orders, eq(transactions.orderId, orders.id))
      .orderBy(desc(transactions.createdAt));

    return result
      .filter(row => row.users)
      .map(row => ({
        ...row.transactions,
        user: row.users!,
        order: row.orders || undefined,
      }));
  }

  async getStats(): Promise<{
    totalOrders: number;
    activeUsers: number;
    totalRevenue: string;
    pendingOrders: number;
  }> {
    const [totalOrdersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders);

    const [activeUsersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(eq(users.isActive, true));

    const [totalRevenueResult] = await db
      .select({ total: sql<string>`sum(total_cost)` })
      .from(orders)
      .where(eq(orders.status, 'completed'));

    const [pendingOrdersResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(orders)
      .where(eq(orders.status, 'pending'));

    return {
      totalOrders: totalOrdersResult.count,
      activeUsers: activeUsersResult.count,
      totalRevenue: totalRevenueResult.total || "0.00",
      pendingOrders: pendingOrdersResult.count,
    };
  }
}

export const storage = new DatabaseStorage();