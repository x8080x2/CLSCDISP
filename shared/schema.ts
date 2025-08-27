import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  telegramId: text("telegram_id").unique(), // Made optional for web-only users
  username: text("username").notNull(),
  email: text("email").unique(), // For web login
  password: text("password"), // Hashed password for web login
  firstName: text("first_name"),
  lastName: text("last_name"),
  balance: real("balance").notNull().default(0.00),
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  isAdmin: integer("is_admin", { mode: 'boolean' }).notNull().default(false),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  orderNumber: text("order_number").notNull().unique(),
  description: text("description").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  serviceType: text("service_type", { enum: ['standard', 'express', 'same_day'] }).notNull(),
  baseCost: real("base_cost").notNull(),
  distanceFee: real("distance_fee").notNull().default(0.00),
  totalCost: real("total_cost").notNull(),
  status: text("status", { enum: ['pending', 'in_progress', 'completed', 'cancelled'] }).notNull().default('pending'),
  approvalStatus: text("approval_status", { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: integer("approved_at", { mode: 'timestamp' }),
  rejectionReason: text("rejection_reason"),
  specialInstructions: text("special_instructions"),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const deliveryAddresses = sqliteTable("delivery_addresses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  attachedFiles: text("attached_files"), // JSON string for array storage
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  type: text("type", { enum: ['top_up', 'order_payment', 'refund'] }).notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  approvalStatus: text("approval_status", { enum: ['pending', 'approved', 'rejected'] }).notNull().default('pending'),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: integer("approved_at", { mode: 'timestamp' }),
  rejectionReason: text("rejection_reason"),
  createdAt: integer("created_at", { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  transactions: many(transactions),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  transactions: many(transactions),
  deliveryAddresses: many(deliveryAddresses),
}));

export const deliveryAddressesRelations = relations(deliveryAddresses, ({ one }) => ({
  order: one(orders, {
    fields: [deliveryAddresses.orderId],
    references: [orders.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  balance: true,
  isActive: true,
  createdAt: true,
});

// Auth schemas
export const signUpSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export type SignUpData = z.infer<typeof signUpSchema>;
export type SignInData = z.infer<typeof signInSchema>;

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  orderNumber: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertDeliveryAddressSchema = createInsertSchema(deliveryAddresses).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertDeliveryAddress = z.infer<typeof insertDeliveryAddressSchema>;
export type DeliveryAddress = typeof deliveryAddresses.$inferSelect & {
  attachedFiles?: string[] | null;
};

export type OrderWithUser = Order & { user: User };
export type OrderWithDetails = Order & { user: User; deliveryAddresses: DeliveryAddress[] };
export type TransactionWithDetails = Transaction & { user: User; order?: Order };
