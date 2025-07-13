import { pgTable, text, serial, integer, boolean, timestamp, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const orderStatusEnum = pgEnum('order_status', ['pending', 'in_progress', 'completed', 'cancelled']);
export const transactionTypeEnum = pgEnum('transaction_type', ['top_up', 'order_payment', 'refund']);
export const serviceTypeEnum = pgEnum('service_type', ['standard', 'express', 'same_day']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  username: text("username").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderNumber: text("order_number").notNull().unique(),
  description: text("description").notNull(),
  pickupAddress: text("pickup_address").notNull(),
  deliveryAddress: text("delivery_address").notNull(),
  serviceType: serviceTypeEnum("service_type").notNull(),
  baseCost: decimal("base_cost", { precision: 10, scale: 2 }).notNull(),
  distanceFee: decimal("distance_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  specialInstructions: text("special_instructions"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const deliveryAddresses = pgTable("delivery_addresses", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => orders.id),
  name: text("name").notNull(),
  address: text("address").notNull(),
  description: text("description"),
  attachedFiles: text("attached_files").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  orderId: integer("order_id").references(() => orders.id),
  type: transactionTypeEnum("type").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
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
export type DeliveryAddress = typeof deliveryAddresses.$inferSelect;

export type OrderWithUser = Order & { user: User };
export type OrderWithDetails = Order & { user: User; deliveryAddresses: DeliveryAddress[] };
export type TransactionWithDetails = Transaction & { user: User; order?: Order };
