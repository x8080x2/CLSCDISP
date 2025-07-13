import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertOrderSchema, insertTransactionSchema } from "@shared/schema";
import { sendOrderUpdate } from "./telegram-bot";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Stats endpoint
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Users endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(parseInt(req.params.id));
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users/:id/balance", async (req, res) => {
    try {
      const { amount, description } = req.body;
      const userId = parseInt(req.params.id);
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const newBalance = (parseFloat(user.balance) + parseFloat(amount)).toFixed(2);
      const updatedUser = await storage.updateUserBalance(userId, newBalance);

      // Create transaction record
      await storage.createTransaction({
        userId,
        type: 'top_up',
        amount: amount.toString(),
        description: description || `Balance top-up of $${amount}`,
      });

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user balance:", error);
      res.status(500).json({ message: "Failed to update balance" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", async (req, res) => {
    try {
      const { status } = req.query;
      let orders;
      
      if (status && status !== 'all') {
        orders = await storage.getOrdersByStatus(status as string);
      } else {
        orders = await storage.getAllOrders();
      }
      
      res.json(orders);
    } catch (error) {
      console.error("Error fetching orders:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      if (isNaN(orderId)) {
        return res.status(400).json({ message: "Invalid order ID" });
      }
      
      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      console.error("Error fetching order:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const orderData = insertOrderSchema.parse(req.body);
      
      // Verify user exists
      const user = await storage.getUser(orderData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Validate order data
      const { documentCount, shippingLabels, serviceType } = req.body;
      
      // Validate document count for document orders
      if (serviceType === 'document') {
        const docCount = parseInt(documentCount || '0');
        if (docCount < 3) {
          return res.status(400).json({ 
            message: "Document sendout requires a minimum of 3 documents" 
          });
        }
      }

      // Verify balance
      const totalCost = parseFloat(orderData.totalCost);
      if (parseFloat(user.balance) < totalCost) {
        return res.status(400).json({ 
          message: `Insufficient balance. Required: $${totalCost}, Available: $${user.balance}` 
        });
      }

      // Check for existing pending orders (optional business rule)
      const userOrders = await storage.getUserOrders(orderData.userId);
      const activeOrders = userOrders.filter(order => ['pending', 'in_progress'].includes(order.status));
      if (activeOrders.length >= 5) {
        return res.status(400).json({ 
          message: "Maximum of 5 active orders allowed per user" 
        });
      }

      // Create order
      const order = await storage.createOrder(orderData);

      // Create transaction
      await storage.createTransaction({
        userId: orderData.userId,
        orderId: order.id,
        type: 'order_payment',
        amount: `-${totalCost}`,
        description: `Payment for order ${order.orderNumber}`,
      });

      // Update user balance
      const newBalance = (parseFloat(user.balance) - totalCost).toFixed(2);
      await storage.updateUserBalance(orderData.userId, newBalance);

      // Send notification to user if Telegram bot is enabled
      if (user.telegramId) {
        try {
          await sendOrderUpdate(
            user.telegramId, 
            order.orderNumber, 
            'pending',
            'Your order has been created and is pending processing.'
          );
        } catch (notifyError) {
          console.warn('Failed to send order notification:', notifyError);
          // Don't fail the order creation if notification fails
        }
      }

      // Get order with user data
      const orderWithUser = await storage.getOrder(order.id);
      res.json(orderWithUser);
    } catch (error) {
      console.error("Error creating order:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid order data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const { status, notes, notifyUser = true } = req.body;
      const orderId = parseInt(req.params.id);

      const order = await storage.getOrder(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      const updatedOrder = await storage.updateOrderStatus(orderId, status, notes);

      // Send Telegram notification if requested
      if (notifyUser && order.user.telegramId) {
        await sendOrderUpdate(order.user.telegramId, order.orderNumber, status, notes);
      }

      const orderWithUser = await storage.getOrder(orderId);
      res.json(orderWithUser);
    } catch (error) {
      console.error("Error updating order status:", error);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Transactions endpoints
  app.get("/api/transactions", async (req, res) => {
    try {
      const { userId } = req.query;
      let transactions;
      
      if (userId) {
        transactions = await storage.getUserTransactions(parseInt(userId as string));
      } else {
        transactions = await storage.getAllTransactions();
      }
      
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const transactionData = insertTransactionSchema.parse(req.body);
      const transaction = await storage.createTransaction(transactionData);
      res.json(transaction);
    } catch (error) {
      console.error("Error creating transaction:", error);
      res.status(500).json({ message: "Failed to create transaction" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
