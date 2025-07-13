import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";

if (!BOT_TOKEN) {
  console.warn("TELEGRAM_BOT_TOKEN not provided - Telegram bot features will be disabled");
}

export const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN, { polling: true }) : null;

// Service pricing
const SERVICE_PRICES = {
  standard: { base: 20, name: 'Standard Delivery' },
  express: { base: 35, name: 'Express Delivery' },
  same_day: { base: 50, name: 'Same Day Delivery' }
};

// User state management for multi-step flows
const userStates: Map<string, any> = new Map();

// Command handlers
if (bot) {
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  const username = msg.from?.username || `user_${telegramId}`;
  const firstName = msg.from?.first_name || "";
  const lastName = msg.from?.last_name || "";

  try {
    let user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      user = await storage.createUser({
        telegramId,
        username,
        firstName,
        lastName,
      });
      
      await bot.sendMessage(chatId, `🎉 Welcome to DocuBot, ${firstName}!\n\nYour account has been created successfully. Your current balance is $${user.balance}.\n\nUse /help to see available commands.`);
    } else {
      await bot.sendMessage(chatId, `👋 Welcome back, ${firstName}!\n\nYour current balance is $${user.balance}.\n\nUse /help to see available commands.`);
    }
  } catch (error) {
    console.error('Error in /start command:', error);
    await bot.sendMessage(chatId, '❌ Sorry, there was an error setting up your account. Please try again later.');
  }
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpText = `
🤖 *DocuBot Commands*

💰 *Balance & Account:*
/balance - Check your current balance
/history - View your order history

📦 *Orders:*
/order - Place a new delivery order
/status - Check order status

ℹ️ *Information:*
/help - Show this help message
/pricing - View service pricing

📞 *Support:*
Contact @admin for assistance
  `;
  
  await bot.sendMessage(chatId, helpText, { parse_mode: 'Markdown' });
});

bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Please use /start to register first.');
      return;
    }
    
    await bot.sendMessage(chatId, `💰 Your current balance: $${user.balance}`);
  } catch (error) {
    console.error('Error in /balance command:', error);
    await bot.sendMessage(chatId, '❌ Error retrieving balance. Please try again later.');
  }
});

bot.onText(/\/pricing/, async (msg) => {
  const chatId = msg.chat.id;
  
  const pricingText = `
💵 *Service Pricing*

🚚 *Standard Delivery* - $20
⚡ *Express Delivery* - $35
🏃 *Same Day Delivery* - $50

*Additional fees may apply based on distance.*

Use /order to place an order!
  `;
  
  await bot.sendMessage(chatId, pricingText, { parse_mode: 'Markdown' });
});

bot.onText(/\/order/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Please use /start to register first.');
      return;
    }
    
    userStates.set(telegramId, { step: 'description' });
    await bot.sendMessage(chatId, '📝 Please describe the documents you need delivered:');
  } catch (error) {
    console.error('Error in /order command:', error);
    await bot.sendMessage(chatId, '❌ Error starting order process. Please try again later.');
  }
});

bot.onText(/\/history/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Please use /start to register first.');
      return;
    }
    
    const orders = await storage.getUserOrders(user.id);
    
    if (orders.length === 0) {
      await bot.sendMessage(chatId, '📋 No orders found. Use /order to place your first order!');
      return;
    }
    
    let historyText = '📋 *Your Order History:*\n\n';
    
    orders.slice(0, 10).forEach(order => {
      const statusEmoji = {
        pending: '⏳',
        in_progress: '🚚',
        completed: '✅',
        cancelled: '❌'
      }[order.status] || '❓';
      
      historyText += `${statusEmoji} *${order.orderNumber}*\n`;
      historyText += `${order.description}\n`;
      historyText += `$${order.totalCost} - ${order.status.replace('_', ' ')}\n\n`;
    });
    
    await bot.sendMessage(chatId, historyText, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error in /history command:', error);
    await bot.sendMessage(chatId, '❌ Error retrieving order history. Please try again later.');
  }
});

bot.onText(/\/status/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    
    if (!user) {
      await bot.sendMessage(chatId, '❌ Please use /start to register first.');
      return;
    }
    
    await bot.sendMessage(chatId, '🔍 Please enter your order number (e.g., ORD-2024-123456):');
    userStates.set(telegramId, { step: 'status_check' });
  } catch (error) {
    console.error('Error in /status command:', error);
    await bot.sendMessage(chatId, '❌ Error checking order status. Please try again later.');
  }
});

// Handle text messages for multi-step flows
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  const userState = userStates.get(telegramId);
  
  if (!userState) return;
  
  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) return;
    
    switch (userState.step) {
      case 'description':
        userState.description = msg.text;
        userState.step = 'pickup';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, '📍 Please provide the pickup address:');
        break;
        
      case 'pickup':
        userState.pickup = msg.text;
        userState.step = 'delivery';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, '🎯 Please provide the delivery address:');
        break;
        
      case 'delivery':
        userState.delivery = msg.text;
        userState.step = 'service';
        userStates.set(telegramId, userState);
        
        const serviceOptions = {
          reply_markup: {
            keyboard: [
              ['🚚 Standard Delivery - $20'],
              ['⚡ Express Delivery - $35'],
              ['🏃 Same Day Delivery - $50']
            ],
            one_time_keyboard: true,
            resize_keyboard: true
          }
        };
        
        await bot.sendMessage(chatId, '🚀 Choose your delivery service:', serviceOptions);
        break;
        
      case 'service':
        let serviceType = '';
        let baseCost = 0;
        
        if (msg.text?.includes('Standard')) {
          serviceType = 'standard';
          baseCost = SERVICE_PRICES.standard.base;
        } else if (msg.text?.includes('Express')) {
          serviceType = 'express';
          baseCost = SERVICE_PRICES.express.base;
        } else if (msg.text?.includes('Same Day')) {
          serviceType = 'same_day';
          baseCost = SERVICE_PRICES.same_day.base;
        } else {
          await bot.sendMessage(chatId, '❌ Please select a valid service option.');
          return;
        }
        
        const distanceFee = Math.floor(Math.random() * 10) + 5; // Simple distance calculation
        const totalCost = baseCost + distanceFee;
        
        if (parseFloat(user.balance) < totalCost) {
          await bot.sendMessage(chatId, `❌ Insufficient balance. You need $${totalCost} but have $${user.balance}.\n\nPlease contact @admin to top up your balance.`);
          userStates.delete(telegramId);
          return;
        }
        
        // Create order
        const order = await storage.createOrder({
          userId: user.id,
          description: userState.description,
          pickupAddress: userState.pickup,
          deliveryAddress: userState.delivery,
          serviceType: serviceType as any,
          baseCost: baseCost.toString(),
          distanceFee: distanceFee.toString(),
          totalCost: totalCost.toString(),
        });
        
        // Create transaction
        await storage.createTransaction({
          userId: user.id,
          orderId: order.id,
          type: 'order_payment',
          amount: `-${totalCost}`,
          description: `Payment for order ${order.orderNumber}`,
        });
        
        // Update user balance
        const newBalance = (parseFloat(user.balance) - totalCost).toFixed(2);
        await storage.updateUserBalance(user.id, newBalance);
        
        const confirmationText = `
✅ *Order Placed Successfully!*

📋 *Order:* ${order.orderNumber}
📝 *Description:* ${order.description}
📍 *Pickup:* ${order.pickupAddress}
🎯 *Delivery:* ${order.deliveryAddress}
🚀 *Service:* ${SERVICE_PRICES[serviceType as keyof typeof SERVICE_PRICES].name}
💰 *Total:* $${order.totalCost}

💳 *New Balance:* $${newBalance}

Your order is now pending and will be processed soon!
        `;
        
        await bot.sendMessage(chatId, confirmationText, { 
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true }
        });
        
        userStates.delete(telegramId);
        break;
        
      case 'status_check':
        const orderNumber = msg.text.trim();
        const foundOrder = await storage.getOrderByNumber(orderNumber);
        
        if (!foundOrder || foundOrder.user.id !== user.id) {
          await bot.sendMessage(chatId, '❌ Order not found or does not belong to you.');
        } else {
          const statusEmoji = {
            pending: '⏳',
            in_progress: '🚚',
            completed: '✅',
            cancelled: '❌'
          }[foundOrder.status] || '❓';
          
          const statusText = `
${statusEmoji} *Order Status: ${foundOrder.status.replace('_', ' ').toUpperCase()}*

📋 *Order:* ${foundOrder.orderNumber}
📝 *Description:* ${foundOrder.description}
📍 *Pickup:* ${foundOrder.pickupAddress}
🎯 *Delivery:* ${foundOrder.deliveryAddress}
💰 *Total:* $${foundOrder.totalCost}
📅 *Created:* ${new Date(foundOrder.createdAt).toLocaleString()}

${foundOrder.notes ? `📝 *Notes:* ${foundOrder.notes}` : ''}
          `;
          
          await bot.sendMessage(chatId, statusText, { parse_mode: 'Markdown' });
        }
        
        userStates.delete(telegramId);
        break;
    }
  } catch (error) {
    console.error('Error in message handler:', error);
    await bot.sendMessage(chatId, '❌ Sorry, there was an error processing your request. Please try again.');
    userStates.delete(telegramId);
  }
});

console.log('Telegram bot initialized successfully');
} else {
  console.log('Telegram bot disabled - no token provided');
}

// Function to send order status updates
export async function sendOrderUpdate(telegramId: string, orderNumber: string, newStatus: string, notes?: string) {
  if (!bot) {
    console.log('Telegram bot not available - order update not sent');
    return;
  }
  
  try {
    const statusEmoji = {
      pending: '⏳',
      in_progress: '🚚',
      completed: '✅',
      cancelled: '❌'
    }[newStatus] || '❓';
    
    let message = `${statusEmoji} *Order Update*\n\n`;
    message += `📋 Order ${orderNumber} status changed to: *${newStatus.replace('_', ' ').toUpperCase()}*\n\n`;
    
    if (notes) {
      message += `📝 *Update Notes:* ${notes}\n\n`;
    }
    
    if (newStatus === 'completed') {
      message += '🎉 Your order has been delivered successfully!';
    } else if (newStatus === 'in_progress') {
      message += '🚚 Your order is now out for delivery!';
    }
    
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error('Error sending order update:', error);
  }
}
