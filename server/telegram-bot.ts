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
  same_day: { base: 50, name: 'Same Day Delivery' },
  document: { pricePerDocument: 16.50, minDocuments: 3, name: 'Document Sendout' },
  shipping_label: { price: 11, name: 'Shipping Label' }
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

📄 *Document Sendout* - $16.50 per document (min 3)
🏷️ *Shipping Label* - $11 each

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
    
    userStates.set(telegramId, { step: 'service_type' });
    
    const serviceOptions = {
      reply_markup: {
        keyboard: [
          ['🚚 Standard Delivery - $20'],
          ['⚡ Express Delivery - $35'],
          ['🏃 Same Day Delivery - $50'],
          ['📄 Document Sendout - $16 each']
        ],
        one_time_keyboard: true,
        resize_keyboard: true
      }
    };
    
    await bot.sendMessage(chatId, '🚀 Choose your service type:', serviceOptions);
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
      case 'service_type':
        let orderType = '';
        
        if (msg.text?.includes('Standard')) {
          orderType = 'standard';
          userState.orderType = 'standard';
          userState.step = 'description';
          userStates.set(telegramId, userState);
          await bot.sendMessage(chatId, '📝 Please describe the documents you need delivered:');
        } else if (msg.text?.includes('Express')) {
          orderType = 'express';
          userState.orderType = 'express';
          userState.step = 'description';
          userStates.set(telegramId, userState);
          await bot.sendMessage(chatId, '📝 Please describe the documents you need delivered:');
        } else if (msg.text?.includes('Same Day')) {
          orderType = 'same_day';
          userState.orderType = 'same_day';
          userState.step = 'description';
          userStates.set(telegramId, userState);
          await bot.sendMessage(chatId, '📝 Please describe the documents you need delivered:');
        } else if (msg.text?.includes('Document Sendout')) {
          orderType = 'document';
          userState.orderType = 'document';
          userState.step = 'document_count';
          userStates.set(telegramId, userState);
          await bot.sendMessage(chatId, '📄 How many documents do you need to send? (Minimum 3)');
        } else {
          await bot.sendMessage(chatId, '❌ Please select a valid service option.');
          return;
        }
        break;
        
      case 'document_count':
        const documentCount = parseInt(msg.text || '0');
        if (documentCount < SERVICE_PRICES.document.minDocuments) {
          await bot.sendMessage(chatId, `❌ Minimum ${SERVICE_PRICES.document.minDocuments} documents required. Please enter a valid number:`);
          return;
        }
        userState.documentCount = documentCount;
        userState.step = 'description';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, '📝 Please describe the documents you need delivered:');
        break;
        
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
        userState.step = 'shipping_labels';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, '🏷️ How many shipping labels do you need? (Enter 0 if none needed)');
        break;
        
      case 'shipping_labels':
        const labelCount = parseInt(msg.text || '0');
        if (labelCount < 0) {
          await bot.sendMessage(chatId, '❌ Please enter a valid number of labels (0 or more):');
          return;
        }
        userState.labelCount = labelCount;
        userState.step = 'confirm_order';
        userStates.set(telegramId, userState);
        
        // Calculate total cost
        let baseCost = 0;
        let serviceType = userState.orderType;
        
        if (userState.orderType === 'document') {
          baseCost = userState.documentCount * SERVICE_PRICES.document.pricePerDocument;
        } else {
          baseCost = SERVICE_PRICES[serviceType as keyof typeof SERVICE_PRICES].base;
        }
        
        const distanceFee = Math.floor(Math.random() * 10) + 5;
        const labelCost = labelCount * SERVICE_PRICES.shipping_label.price;
        const totalCost = baseCost + distanceFee + labelCost;
        
        userState.baseCost = baseCost;
        userState.distanceFee = distanceFee;
        userState.labelCost = labelCost;
        userState.totalCost = totalCost;
        userStates.set(telegramId, userState);
        
        let confirmationText = `
📋 *Order Summary*

📝 *Description:* ${userState.description}
📍 *Pickup:* ${userState.pickup}
🎯 *Delivery:* ${userState.delivery}
`;

        if (userState.orderType === 'document') {
          confirmationText += `📄 *Documents:* ${userState.documentCount} × $${SERVICE_PRICES.document.pricePerDocument} = $${baseCost}\n`;
        } else {
          confirmationText += `🚀 *Service:* ${SERVICE_PRICES[serviceType as keyof typeof SERVICE_PRICES].name} - $${baseCost}\n`;
        }
        
        if (labelCount > 0) {
          confirmationText += `🏷️ *Shipping Labels:* ${labelCount} × $${SERVICE_PRICES.shipping_label.price} = $${labelCost}\n`;
        }
        
        confirmationText += `📏 *Distance Fee:* $${distanceFee}
💰 *Total Cost:* $${totalCost}

💳 *Your Balance:* $${user.balance}

Type 'CONFIRM' to place the order or 'CANCEL' to cancel.`;
        
        if (parseFloat(user.balance) < totalCost) {
          confirmationText += `\n\n❌ *Insufficient balance!* You need $${totalCost} but have $${user.balance}. Please contact @admin to top up your balance.`;
        }
        
        await bot.sendMessage(chatId, confirmationText, { 
          parse_mode: 'Markdown',
          reply_markup: { remove_keyboard: true }
        });
        break;
        
      case 'confirm_order':
        if (msg.text?.toUpperCase() === 'CONFIRM') {
          if (parseFloat(user.balance) < userState.totalCost) {
            await bot.sendMessage(chatId, '❌ Insufficient balance. Please contact @admin to top up your balance.');
            userStates.delete(telegramId);
            return;
          }
          
          // Create order
          const order = await storage.createOrder({
            userId: user.id,
            description: userState.description,
            pickupAddress: userState.pickup,
            deliveryAddress: userState.delivery,
            serviceType: userState.orderType === 'document' ? 'standard' : userState.orderType,
            baseCost: userState.baseCost.toString(),
            distanceFee: userState.distanceFee.toString(),
            totalCost: userState.totalCost.toString(),
            specialInstructions: userState.orderType === 'document' 
              ? `Document sendout: ${userState.documentCount} documents${userState.labelCount > 0 ? `, ${userState.labelCount} shipping labels` : ''}`
              : userState.labelCount > 0 ? `${userState.labelCount} shipping labels` : undefined,
          });
          
          // Create transaction
          await storage.createTransaction({
            userId: user.id,
            orderId: order.id,
            type: 'order_payment',
            amount: `-${userState.totalCost}`,
            description: `Payment for order ${order.orderNumber}`,
          });
          
          // Update user balance
          const newBalance = (parseFloat(user.balance) - userState.totalCost).toFixed(2);
          await storage.updateUserBalance(user.id, newBalance);
          
          const successText = `
✅ *Order Placed Successfully!*

📋 *Order:* ${order.orderNumber}
💰 *Total:* $${order.totalCost}
💳 *New Balance:* $${newBalance}

Your order is now pending and will be processed soon!
          `;
          
          await bot.sendMessage(chatId, successText, { parse_mode: 'Markdown' });
          
        } else if (msg.text?.toUpperCase() === 'CANCEL') {
          await bot.sendMessage(chatId, '❌ Order cancelled.');
        } else {
          await bot.sendMessage(chatId, "Please type 'CONFIRM' to place the order or 'CANCEL' to cancel.");
          return;
        }
        
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
