import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { cryptoService } from "./crypto-service";
import { insertOrderSchema, insertTransactionSchema, insertDeliveryAddressSchema } from "@shared/schema";
import { sendOrderUpdate, sendNewOrderToAdmins, sendOrderFilesToAdmins, sendTransactionToAdmins, sendOrderToAdmins } from "./telegram-bot";
import { requireAuth, requireAdmin } from "./auth";
import { requireAdminCode } from "./admin-auth";
import { z } from "zod";
import multer from "multer";
import path from "path";
import { mkdir } from "fs/promises";

export async function registerRoutes(app: Express): Promise<Server> {
  // Create uploads directory if it doesn't exist
  try {
    await mkdir("uploads", { recursive: true });
  } catch (error) {
    console.log("Uploads directory already exists or could not be created");
  }

  // Set up multer for file uploads
  const storage_multer = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    },
  });

  const upload = multer({ 
    storage: storage_multer,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      // Allow common document types
      const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
      const fileExtension = path.extname(file.originalname).toLowerCase();
      if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, JPG, JPEG, PNG files are allowed.'));
      }
    }
  });
  // Crypto rates endpoint
  app.get("/api/crypto/rates", async (req, res) => {
    try {
      const rates = cryptoService.getRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching crypto rates:", error);
      res.status(500).json({ message: "Failed to fetch crypto rates" });
    }
  });

  // Create payment request endpoint
  app.post("/api/crypto/payment", async (req, res) => {
    try {
      const { amount, cryptoSymbol, userId } = req.body;
      
      if (!amount || !cryptoSymbol || !userId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const orderId = `topup_${Date.now()}`;
      const paymentRequest = cryptoService.createPaymentRequest(orderId, userId, parseFloat(amount), cryptoSymbol);
      
      res.json(paymentRequest);
    } catch (error) {
      console.error("Error creating payment request:", error);
      res.status(500).json({ message: "Failed to create payment request" });
    }
  });

  // Stats endpoint with caching
  let statsCache: { data: any; timestamp: number } = { data: null, timestamp: 0 };
  const CACHE_DURATION = 30000; // 30 seconds

  app.get("/api/stats", requireAdminCode, async (req, res) => {
    try {
      const now = Date.now();
      
      // Return cached data if still valid
      if (statsCache.data && (now - statsCache.timestamp) < CACHE_DURATION) {
        return res.json(statsCache.data);
      }
      
      const stats = await storage.getStats();
      
      // Update cache
      statsCache = { data: stats, timestamp: now };
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      // Return cached data if available, otherwise default stats
      if (statsCache.data) {
        return res.json(statsCache.data);
      }
      res.json({
        totalOrders: 0,
        totalUsers: 0,
        totalRevenue: 0,
        pendingOrders: 0
      });
    }
  });

  // Users endpoints
  app.get("/api/users", requireAdminCode, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/current", async (req, res) => {
    try {
      // For demo purposes, return the first user or create a default one
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        res.json(users[0]);
      } else {
        // Create a default user if none exists
        const defaultUser = await storage.createUser({
          telegramId: "demo_user",
          username: "demo",
          firstName: "Demo User",
        });
        res.json(defaultUser);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      // Return a fallback response instead of 500
      res.json({ 
        id: 1, 
        username: "demo", 
        firstName: "Demo User", 
        balance: "0.00",
        telegramId: "demo_user",
        createdAt: new Date().toISOString()
      });
    }
  });

  // Customer-specific endpoints
  app.get("/api/orders/my", async (req, res) => {
    try {
      // For demo purposes, get orders for the first user
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        const userOrders = await storage.getUserOrders(users[0].id);
        res.json(userOrders);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching user orders:", error);
      res.status(500).json({ message: "Failed to fetch user orders" });
    }
  });

  app.get("/api/transactions/my", async (req, res) => {
    try {
      // For demo purposes, get transactions for the first user
      const users = await storage.getAllUsers();
      if (users.length > 0) {
        const userTransactions = await storage.getUserTransactions(users[0].id);
        res.json(userTransactions);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching user transactions:", error);
      res.status(500).json({ message: "Failed to fetch user transactions" });
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
      
      // Validate minimum deposit amount
      const depositAmount = parseFloat(amount);
      if (depositAmount < 50) {
        return res.status(400).json({ message: "Minimum deposit amount is $50" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create transaction record (requires approval)
      const transaction = await storage.createTransaction({
        userId,
        type: 'top_up',
        amount: depositAmount.toString(),
        description: description || `Balance top-up of $${depositAmount}`,
      });

      // Send notification to admin
      const transactionWithUser = await storage.getUserTransactions(userId);
      const newTransaction = transactionWithUser.find(t => t.id === transaction.id);
      if (newTransaction) {
        await sendTransactionToAdmins(newTransaction);
      }

      // Don't update balance immediately - wait for approval
      // The balance will be updated when the transaction is approved
      const updatedUser = await storage.getUser(userId);

      res.json({ message: "Top-up request submitted for approval", user: updatedUser });
    } catch (error) {
      console.error("Error updating user balance:", error);
      res.status(500).json({ message: "Failed to update balance" });
    }
  });

  // Balance top-up endpoint (for sidebar)
  app.post("/api/balance/topup", async (req, res) => {
    try {
      const { amount, description, cryptoSymbol } = req.body;
      
      // Validate minimum deposit amount
      const depositAmount = parseFloat(amount);
      if (depositAmount < 50) {
        return res.status(400).json({ message: "Minimum deposit amount is $50" });
      }
      
      // Validate crypto symbol if provided
      if (cryptoSymbol && !cryptoService.getRate(cryptoSymbol)) {
        return res.status(400).json({ message: "Unsupported cryptocurrency" });
      }
      
      // For demo purposes, use the first user or create a default admin user
      let users = await storage.getAllUsers();
      let user;
      
      if (users.length === 0) {
        // Create admin user if none exists
        user = await storage.createUser({
          telegramId: "admin",
          username: "admin",
          firstName: "Admin",
        });
      } else {
        user = users[0];
      }

      // Create transaction record (requires approval)
      const transaction = await storage.createTransaction({
        userId: user.id,
        type: 'top_up',
        amount: depositAmount.toString(),
        description: description || `Balance top-up of $${depositAmount}`,
      });

      // Send notification to admin
      const transactionWithUser = await storage.getUserTransactions(user.id);
      const newTransaction = transactionWithUser.find(t => t.id === transaction.id);
      if (newTransaction) {
        await sendTransactionToAdmins(newTransaction);
      }

      // Don't update balance immediately - wait for approval
      // The balance will be updated when the transaction is approved

      res.json({ message: "Top-up request submitted for approval", user });
    } catch (error) {
      console.error("Error updating balance:", error);
      res.status(500).json({ message: "Failed to update balance" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.array('files', 10), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      const fileNames = files.map(file => file.filename);
      res.json({ files: fileNames });
    } catch (error) {
      console.error("Error uploading files:", error);
      res.status(500).json({ message: "Failed to upload files" });
    }
  });

  // Orders endpoints
  app.get("/api/orders", requireAdminCode, async (req, res) => {
    try {
      const { status, approval } = req.query;
      let orders;
      
      if (approval && approval !== 'all') {
        orders = await storage.getOrdersByApprovalStatus(approval as string);
      } else if (status && status !== 'all') {
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

  app.post("/api/orders/:id/approve", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { approvedBy } = req.body;
      
      if (!approvedBy) {
        return res.status(400).json({ message: "Approved by user ID is required" });
      }

      const order = await storage.approveOrder(orderId, approvedBy);
      
      // Find and approve the associated payment transaction
      const orderTransactions = await storage.getAllTransactions();
      const paymentTransaction = orderTransactions.find(t => 
        t.orderId === orderId && t.type === 'order_payment' && t.approvalStatus === 'pending'
      );
      
      if (paymentTransaction) {
        await storage.approveTransaction(paymentTransaction.id, approvedBy);
        
        // Update user balance by deducting the payment amount
        const user = await storage.getUser(paymentTransaction.userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(paymentTransaction.amount)).toFixed(2);
          await storage.updateUserBalance(paymentTransaction.userId, newBalance);
        }
      }
      
      // Send notification to user via Telegram
      const orderWithUser = await storage.getOrder(orderId);
      if (orderWithUser) {
        await sendOrderUpdate(orderWithUser.user.telegramId, orderWithUser.orderNumber, "approved");
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error approving order:", error);
      res.status(500).json({ message: "Failed to approve order" });
    }
  });

  app.post("/api/orders/:id/reject", async (req, res) => {
    try {
      const orderId = parseInt(req.params.id);
      const { rejectionReason, rejectedBy } = req.body;
      
      if (!rejectionReason || !rejectedBy) {
        return res.status(400).json({ message: "Rejection reason and rejected by user ID are required" });
      }

      const order = await storage.rejectOrder(orderId, rejectionReason, rejectedBy);
      
      // Send notification to user via Telegram
      const orderWithUser = await storage.getOrder(orderId);
      if (orderWithUser) {
        await sendOrderUpdate(orderWithUser.user.telegramId, orderWithUser.orderNumber, "rejected", rejectionReason);
      }
      
      res.json(order);
    } catch (error) {
      console.error("Error rejecting order:", error);
      res.status(500).json({ message: "Failed to reject order" });
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
      const { deliveryAddresses, ...orderData } = req.body;
      const validatedOrderData = insertOrderSchema.parse(orderData);
      
      // Verify user exists
      const user = await storage.getUser(validatedOrderData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Verify balance including pending transactions
      const totalCost = parseFloat(validatedOrderData.totalCost);
      
      // Get user's pending transactions to calculate effective balance
      const userTransactions = await storage.getUserTransactions(validatedOrderData.userId);
      const pendingTransactions = userTransactions.filter(t => t.approvalStatus === 'pending');
      const pendingAmount = pendingTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0);
      const effectiveBalance = parseFloat(user.balance) + pendingAmount;
      
      if (effectiveBalance < totalCost) {
        return res.status(400).json({ 
          message: `Insufficient balance. Required: $${totalCost}, Available: $${effectiveBalance.toFixed(2)} (including pending transactions)` 
        });
      }

      // Check for existing pending orders (optional business rule)
      const userOrders = await storage.getUserOrders(validatedOrderData.userId);
      const activeOrders = userOrders.filter(order => ['pending', 'in_progress'].includes(order.status));
      if (activeOrders.length >= 5) {
        return res.status(400).json({ 
          message: "Maximum of 5 active orders allowed per user" 
        });
      }

      // Create order
      const order = await storage.createOrder(validatedOrderData);

      // Create delivery addresses if provided
      if (deliveryAddresses && Array.isArray(deliveryAddresses)) {
        for (const address of deliveryAddresses) {
          if (address.name && address.address) {
            await storage.createDeliveryAddress({
              orderId: order.id,
              name: address.name,
              address: address.address,
              description: address.description || null,
              attachedFiles: address.attachedFiles || [],
            });
          }
        }
      }

      // Create transaction (requires approval)
      const transaction = await storage.createTransaction({
        userId: validatedOrderData.userId,
        orderId: order.id,
        type: 'order_payment',
        amount: `-${totalCost}`,
        description: `Payment for order ${order.orderNumber}`,
      });

      // Don't update balance immediately - wait for approval
      // The balance will be updated when the order is approved

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

      // Get order with details including delivery addresses
      const orderWithDetails = await storage.getOrderWithDetails(order.id);
      
      // Send notifications to admins
      try {
        // Send order notification
        await sendOrderToAdmins(orderWithDetails);
        
        // Send transaction notification
        const transactionWithUser = await storage.getUserTransactions(validatedOrderData.userId);
        const newTransaction = transactionWithUser.find(t => t.id === transaction.id);
        if (newTransaction) {
          await sendTransactionToAdmins(newTransaction);
        }
        
        // Send files to admins if there are any
        if (orderWithDetails && orderWithDetails.deliveryAddresses && orderWithDetails.deliveryAddresses.length > 0) {
          await sendOrderFilesToAdmins(orderWithDetails, orderWithDetails.deliveryAddresses);
        }
      } catch (notifyError) {
        console.warn('Failed to send admin notifications:', notifyError);
        // Don't fail the order creation if admin notification fails
      }
      
      res.json(orderWithDetails);
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
  app.get("/api/transactions", requireAdminCode, async (req, res) => {
    try {
      const { userId, approval } = req.query;
      let transactions;
      
      if (approval && approval !== 'all') {
        transactions = await storage.getTransactionsByApprovalStatus(approval as string);
      } else if (userId) {
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

  app.post("/api/transactions/:id/approve", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { approvedBy } = req.body;
      
      if (!approvedBy) {
        return res.status(400).json({ message: "Approved by user ID is required" });
      }

      const transaction = await storage.approveTransaction(transactionId, approvedBy);
      
      // If it's a top-up transaction, update user balance
      if (transaction.type === 'top_up') {
        const user = await storage.getUser(transaction.userId);
        if (user) {
          const newBalance = (parseFloat(user.balance) + parseFloat(transaction.amount)).toFixed(2);
          await storage.updateUserBalance(transaction.userId, newBalance);
        }
      }
      
      res.json(transaction);
    } catch (error) {
      console.error("Error approving transaction:", error);
      res.status(500).json({ message: "Failed to approve transaction" });
    }
  });

  app.post("/api/transactions/:id/reject", async (req, res) => {
    try {
      const transactionId = parseInt(req.params.id);
      const { rejectionReason, rejectedBy } = req.body;
      
      if (!rejectionReason || !rejectedBy) {
        return res.status(400).json({ message: "Rejection reason and rejected by user ID are required" });
      }

      const transaction = await storage.rejectTransaction(transactionId, rejectionReason, rejectedBy);
      res.json(transaction);
    } catch (error) {
      console.error("Error rejecting transaction:", error);
      res.status(500).json({ message: "Failed to reject transaction" });
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

  // Crypto endpoints
  app.get("/api/crypto/rates", async (req, res) => {
    try {
      const rates = cryptoService.getRates();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching crypto rates:", error);
      res.status(500).json({ message: "Failed to fetch crypto rates" });
    }
  });

  app.post("/api/crypto/payment", async (req, res) => {
    try {
      const { orderId, userId, amountUsd, cryptoSymbol } = req.body;
      
      if (!orderId || !userId || !amountUsd || !cryptoSymbol) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const paymentRequest = cryptoService.createPaymentRequest(
        orderId,
        userId,
        amountUsd,
        cryptoSymbol
      );

      res.json(paymentRequest);
    } catch (error) {
      console.error("Error creating crypto payment:", error);
      res.status(500).json({ message: "Failed to create crypto payment" });
    }
  });

  app.post("/api/crypto/confirm", async (req, res) => {
    try {
      const { paymentId, transactionHash } = req.body;
      
      // In a real implementation, you would verify the transaction on the blockchain
      // For now, we'll create a manual confirmation endpoint for admins
      
      res.json({ message: "Payment confirmation received" });
    } catch (error) {
      console.error("Error confirming crypto payment:", error);
      res.status(500).json({ message: "Failed to confirm crypto payment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
