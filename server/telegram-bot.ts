import TelegramBot from 'node-telegram-bot-api';
import { storage } from './storage';
import fs from 'fs';
import path from 'path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || "";
const ADMIN_IDS = (process.env.TELEGRAM_ADMIN_IDS || "").split(",").map(id => id.trim()).filter(id => id);

if (!BOT_TOKEN) {
  console.warn("TELEGRAM_BOT_TOKEN not provided - Telegram bot features will be disabled");
}

if (ADMIN_IDS.length === 0) {
  console.warn("TELEGRAM_ADMIN_IDS not provided - Admin notifications will be disabled");
}

export const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN, { polling: true }) : null;

// Service pricing
const SERVICE_PRICES = {
  document: { pricePerDocument: 16.50, minDocuments: 3, name: 'Document Send Out' },
  shipping_label: { price: 11, name: 'Shipping Label' }
};

// User state management for multi-step flows
const userStates: Map<string, any> = new Map();

// Command handlers
if (bot) {
// Persistent inline keyboard for main menu
const getMainKeyboard = () => ({
  reply_markup: {
    inline_keyboard: [
      [
        { text: '💰 Balance', callback_data: 'main_balance' },
        { text: '📦 New Order', callback_data: 'main_order' }
      ],
      [
        { text: '💳 Top Up', callback_data: 'main_topup' },
        { text: '📋 Order History', callback_data: 'main_history' }
      ],
      [
        { text: '🔍 Order Status', callback_data: 'main_status' },
        { text: '💵 Pricing', callback_data: 'main_pricing' }
      ],
      [
        { text: 'ℹ️ Help', callback_data: 'main_help' }
      ]
    ]
  }
});

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

      await bot.sendMessage(chatId, `🎉 Welcome to DocuBot, ${firstName}!\n\nYour account has been created successfully. Your current balance is $${user.balance}.\n\nChoose an option below:`, getMainKeyboard());
    } else {
      await bot.sendMessage(chatId, `👋 Welcome back, ${firstName}!\n\nYour current balance is $${user.balance}.\n\nChoose an option below:`, getMainKeyboard());
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
Check your current balance

📦 *Orders:*
Place a new document sendout order

📋 *History:*
View your order history

🔍 *Status:*
Check order status

💵 *Pricing:*
View service pricing

📞 *Support:*
Contact @admin for assistance
  `;

  await bot.sendMessage(chatId, helpText, { ...getMainKeyboard(), parse_mode: 'Markdown' });
});

bot.onText(/\/balance/, async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";

  try {
    const user = await storage.getUserByTelegramId(telegramId);

    if (!user) {
      await bot.sendMessage(chatId, '❌ Please use /start to register first.', getMainKeyboard());
      return;
    }

    await bot.sendMessage(chatId, `💰 Your current balance: $${user.balance}`, getMainKeyboard());
  } catch (error) {
    console.error('Error in /balance command:', error);
    await bot.sendMessage(chatId, '❌ Error retrieving balance. Please try again later.', getMainKeyboard());
  }
});

bot.onText(/\/pricing/, async (msg) => {
  const chatId = msg.chat.id;

  const pricingText = `
💵 *Service Pricing*

📄 *Document Sendout* - $16.50 per document (minimum 3)
🏷️ *Shipping Label* - $11 each

*Additional fees may apply based on distance.*

Use the menu below to place an order!
  `;

  await bot.sendMessage(chatId, pricingText, { ...getMainKeyboard(), parse_mode: 'Markdown' });
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
        inline_keyboard: [
          [{ text: '📄 Document Sendout - $16.50 each', callback_data: 'service_document' }]
        ]
      }
    };

    await bot.sendMessage(chatId, '🚀 We offer Document Sendout service:\n\n📄 Document Sendout - $16.50 per document (minimum 3 documents)\n\nClick below to continue:', serviceOptions);
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
        await bot.sendMessage(chatId, '❌ Please use the inline button above to select the service.');
        return;

      case 'document_count':
        const documentCount = parseInt(msg.text || '0');
        if (documentCount < SERVICE_PRICES.document.minDocuments) {
          await bot.sendMessage(chatId, `❌ Minimum ${SERVICE_PRICES.document.minDocuments} documents required. Please enter a valid number:`);
          return;
        }
        userState.documentCount = documentCount;
        userState.step = 'description';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, '📝 Please describe the documents you need delivered:', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
            ]
          }
        });
        break;

      case 'description':
        userState.description = msg.text;
        userState.pickup = 'Not specified'; // Set default pickup address

        // Initialize delivery addresses array for document sendout
        if (userState.orderType === 'document') {
          userState.deliveryAddresses = [];
          userState.currentAddressIndex = 0;
          userState.step = 'delivery_address_info';
          userStates.set(telegramId, userState);
          await bot.sendMessage(chatId, `📍 *Delivery Address 1 of ${userState.documentCount}*\n\nPlease provide recipient name and address in this format:\nName: John Doe\nAddress: 123 Main Street, City, State ZIP`, { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          });
        } else {
          userState.step = 'delivery';
          userStates.set(telegramId, userState);
          await bot.sendMessage(chatId, '🎯 Please provide the delivery address:');
        }
        break;

      case 'delivery_address_info':
        if (!userState.deliveryAddresses) userState.deliveryAddresses = [];
        const currentIndex = userState.currentAddressIndex || 0;

        if (!userState.deliveryAddresses[currentIndex]) {
          userState.deliveryAddresses[currentIndex] = {};
        }

        const input = msg.text?.trim() || '';
        const lines = input.split('\n');

        // Parse name and address from input
        let name = '';
        let address = '';

        for (const line of lines) {
          if (line.toLowerCase().startsWith('name:')) {
            name = line.substring(5).trim();
          } else if (line.toLowerCase().startsWith('address:')) {
            address = line.substring(8).trim();
          }
        }

        // If format not followed, try to parse differently
        if (!name || !address) {
          if (lines.length >= 2) {
            name = lines[0].trim();
            address = lines.slice(1).join(' ').trim();
          } else {
            await bot.sendMessage(chatId, `❌ Please provide both name and address in this format:\nName: John Doe\nAddress: 123 Main Street, City, State ZIP`);
            return;
          }
        }

        userState.deliveryAddresses[currentIndex].name = name;
        userState.deliveryAddresses[currentIndex].address = address;
        userState.step = 'delivery_address_notes';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, `📝 Any special notes for this delivery? (Enter 'none' if no special instructions):`);
        break;

      case 'delivery_address_notes':
        const noteIndex = userState.currentAddressIndex || 0;
        userState.deliveryAddresses[noteIndex].description = msg.text === 'none' ? '' : msg.text;
        userState.deliveryAddresses[noteIndex].attachedFiles = [];
        userState.step = 'delivery_address_files';
        userStates.set(telegramId, userState);
        await bot.sendMessage(chatId, `📎 Please send any files for this delivery address, or click 'Done' to continue:`, {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Done - No files', callback_data: 'files_done' }]
            ]
          }
        });
        break;

      case 'delivery_address_files':
        await bot.sendMessage(chatId, '📎 Please send files one by one, or click "Done" button when finished with this address.');
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
`;

        if (userState.orderType === 'document') {
          confirmationText += `📄 *Documents:* ${userState.documentCount} × $${SERVICE_PRICES.document.pricePerDocument} = $${baseCost}\n\n`;

          // Add delivery addresses
          confirmationText += `🎯 *Delivery Addresses:*\n`;
          userState.deliveryAddresses.forEach((addr: any, index: number) => {
            confirmationText += `${index + 1}. ${addr.name} - ${addr.address}\n`;
            if (addr.description) confirmationText += `   Notes: ${addr.description}\n`;
            if (addr.attachedFiles && addr.attachedFiles.length > 0) {
              confirmationText += `   Files: ${addr.attachedFiles.length} file(s)\n`;
            }
          });
          confirmationText += `\n`;
        } else {
          confirmationText += `🎯 *Delivery:* ${userState.delivery}\n`;
          confirmationText += `🚀 *Service:* ${SERVICE_PRICES[serviceType as keyof typeof SERVICE_PRICES].name} - $${baseCost}\n`;
        }

        if (labelCount > 0) {
          confirmationText += `🏷️ *Shipping Labels:* ${labelCount} × $${SERVICE_PRICES.shipping_label.price} = $${labelCost}\n`;
        }

        confirmationText += `📏 *Distance Fee:* $${distanceFee}
💰 *Total Cost:* $${totalCost}

💳 *Your Balance:* $${user.balance}

Choose your payment method:`;

        const confirmButtons = [];

        if (parseFloat(user.balance) >= totalCost) {
          confirmButtons.push([{ text: '💳 Pay with Balance', callback_data: 'confirm_order' }]);
        }

        confirmButtons.push([{ text: '₿ Pay with Crypto', callback_data: 'crypto_payment' }]);
        confirmButtons.push([{ text: '❌ CANCEL', callback_data: 'cancel_order' }]);

        await bot.sendMessage(chatId, confirmationText, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: confirmButtons
          }
        });
        break;

      case 'confirm_order':
        await bot.sendMessage(chatId, '❌ Please use the inline buttons above to confirm or cancel your order.');
        break;



      case 'topup_amount':
        const topupAmount = parseFloat(msg.text?.trim() || '0');
        if (topupAmount < 10) {
          await bot.sendMessage(chatId, '❌ Minimum top-up amount is $10. Please enter a valid amount:', {
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
              ]
            }
          });
          return;
        }

        userState.topupAmount = topupAmount;
        userState.step = 'topup_payment_method';
        userStates.set(telegramId, userState);

        const topupText = `💳 *Top Up Confirmation*

💰 *Amount:* $${topupAmount}
💳 *Your Current Balance:* $${user.balance}
💵 *New Balance:* $${(parseFloat(user.balance) + topupAmount).toFixed(2)}

Choose your payment method:`;

        const topupButtons = [
          [{ text: '₿ Pay with Crypto', callback_data: 'topup_crypto' }],
          [{ text: '❌ Cancel', callback_data: 'back_to_menu' }]
        ];

        await bot.sendMessage(chatId, topupText, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: topupButtons
          }
        });
        break;

      case 'status_check':
        const orderNumber = msg.text.trim();
        const foundOrder = await storage.getOrderByNumber(orderNumber);

        if (!foundOrder || foundOrder.user.id !== user.id) {
          await bot.sendMessage(chatId, '❌ Order not found or does not belong to you.', getMainKeyboard());
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

          await bot.sendMessage(chatId, statusText, { ...getMainKeyboard(), parse_mode: 'Markdown' });
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

// Handle callback queries (inline keyboard presses)
bot.on('callback_query', async (query) => {
  const chatId = query.message?.chat.id;
  const telegramId = query.from.id.toString();
  const data = query.data;

  if (!chatId || !data) return;

  try {
    const user = await storage.getUserByTelegramId(telegramId);
    if (!user) {
      await bot.answerCallbackQuery(query.id, { text: 'Please use /start to register first.' });
      return;
    }

    const userState = userStates.get(telegramId);

    switch (data) {
      case 'main_balance':
        try {
          await bot.sendMessage(chatId, `💰 Your current balance: $${user.balance}`, getMainKeyboard());
        } catch (error) {
          console.error('Error in balance callback:', error);
          await bot.sendMessage(chatId, '❌ Error retrieving balance.', getMainKeyboard());
        }
        break;

      case 'main_order':
        userStates.set(telegramId, { step: 'service_type' });
        const serviceOptions = {
          reply_markup: {
            inline_keyboard: [
              [{ text: '📄 Document Sendout - $16.50 each', callback_data: 'service_document' }],
              [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
            ]
          }
        };
        await bot.sendMessage(chatId, '🚀 We offer Document Sendout service:\n\n📄 Document Sendout - $16.50 per document (minimum 3 documents)\n\nClick below to continue:', serviceOptions);
        break;

      case 'main_history':
        try {
          const orders = await storage.getUserOrders(user.id);
          if (orders.length === 0) {
            await bot.sendMessage(chatId, '📋 No orders found. Use the menu below to place your first order!', getMainKeyboard());
            break;
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

          await bot.sendMessage(chatId, historyText, { ...getMainKeyboard(), parse_mode: 'Markdown' });
        } catch (error) {
          console.error('Error in history callback:', error);
          await bot.sendMessage(chatId, '❌ Error retrieving order history.', getMainKeyboard());
        }
        break;

      case 'main_status':
        await bot.sendMessage(chatId, '🔍 Please enter your order number (e.g., ORD-2024-123456):', getMainKeyboard());
        userStates.set(telegramId, { step: 'status_check' });
        break;

      case 'main_pricing':
        const pricingText = `
💵 *Service Pricing*

📄 *Document Sendout* - $16.50 per document (minimum 3)
🏷️ *Shipping Label* - $11 each

*Additional fees may apply based on distance.*
        `;
        await bot.sendMessage(chatId, pricingText, { ...getMainKeyboard(), parse_mode: 'Markdown' });
        break;

      case 'main_topup':
        userStates.set(telegramId, { step: 'topup_amount' });
        await bot.sendMessage(chatId, '💳 *Top Up Your Balance*\n\nPlease enter the amount you want to add to your balance (minimum $10):', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Back to Menu', callback_data: 'back_to_menu' }]
            ]
          }
        });
        break;

      case 'main_help':
        const helpText = `
🤖 *DocuBot Help*

💰 *Balance:* Check your current balance
💳 *Top Up:* Add funds to your balance
📦 *New Order:* Place a document sendout order
📋 *Order History:* View your past orders
🔍 *Order Status:* Check specific order status
💵 *Pricing:* View service pricing

📞 *Support:* Contact @admin for assistance
        `;
        await bot.sendMessage(chatId, helpText, { ...getMainKeyboard(), parse_mode: 'Markdown' });
        break;

      case 'back_to_menu':
        await bot.sendMessage(chatId, '🏠 Main Menu - Choose an option:', getMainKeyboard());
        userStates.delete(telegramId);
        break;

      case 'service_document':
        if (userState?.step === 'service_type') {
          userState.orderType = 'document';
          userState.step = 'document_count';
          userStates.set(telegramId, userState);

          await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
            chat_id: chatId,
            message_id: query.message?.message_id
          });

          await bot.sendMessage(chatId, '📄 How many documents do you need to send? (Minimum 3)');
        }
        break;

      case 'files_done':
        if (userState?.step === 'delivery_address_files') {
          // Move to next address or continue order
          const nextIndex = (userState.currentAddressIndex || 0) + 1;

          await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
            chat_id: chatId,
            message_id: query.message?.message_id
          });

          if (nextIndex < userState.documentCount) {
            userState.currentAddressIndex = nextIndex;
            userState.step = 'delivery_address_info';
            userStates.set(telegramId, userState);
            await bot.sendMessage(chatId, `📍 *Delivery Address ${nextIndex + 1} of ${userState.documentCount}*\n\nPlease provide recipient name and address in this format:\nName: John Doe\nAddress: 123 Main Street, City, State ZIP`, { 
              parse_mode: 'Markdown'
            });
          } else {
            // All addresses collected, continue to shipping labels
            userState.step = 'shipping_labels';
            userStates.set(telegramId, userState);
            await bot.sendMessage(chatId, '🏷️ How many shipping labels do you need? (Enter 0 if none needed)');
          }
        }
        break;

      case 'confirm_order':
        if (userState?.step === 'confirm_order') {
          if (parseFloat(user.balance) < userState.totalCost) {
            await bot.answerCallbackQuery(query.id, { text: 'Insufficient balance!' });
            return;
          }

          await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
            chat_id: chatId,
            message_id: query.message?.message_id
          });

          // Create order
          const deliveryAddressText = userState.deliveryAddresses.map((addr: any) => `${addr.name} - ${addr.address}`).join(' | ');

          const order = await storage.createOrder({
            userId: user.id,
            description: userState.description,
            pickupAddress: userState.pickup,
            deliveryAddress: deliveryAddressText,
            serviceType: 'same_day',
            baseCost: userState.baseCost.toString(),
            distanceFee: userState.distanceFee.toString(),
            totalCost: userState.totalCost.toString(),
            specialInstructions: `Document sendout: ${userState.documentCount} documents${userState.labelCount > 0 ? `, ${userState.labelCount} shipping labels` : ''}`,
          });

          // Create delivery addresses
          if (userState.deliveryAddresses) {
            for (const address of userState.deliveryAddresses) {
              await storage.createDeliveryAddress({
                orderId: order.id,
                name: address.name,
                address: address.address,
                description: address.description || null,
                attachedFiles: address.attachedFiles || [],
              });
            }
          }

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

          const successText = `✅ *Order Placed Successfully!*

📋 *Order:* ${order.orderNumber}
💰 *Total:* $${order.totalCost}
💳 *New Balance:* $${newBalance}

Your order is now pending and will be processed soon!`;

          await bot.sendMessage(chatId, successText, { ...getMainKeyboard(), parse_mode: 'Markdown' });

          // Send notifications to admins
          try {
            const orderWithDetails = await storage.getOrderWithDetails(order.id);
            await sendNewOrderToAdmins(orderWithDetails);

            // Send files to admins if there are any
            if (orderWithDetails.deliveryAddresses && orderWithDetails.deliveryAddresses.length > 0) {
              await sendOrderFilesToAdmins(orderWithDetails, orderWithDetails.deliveryAddresses);
            }
          } catch (notifyError) {
            console.warn('Failed to send admin notifications:', notifyError);
          }

          userStates.delete(telegramId);
        }
        break;

        case 'crypto_payment':
          // Implement crypto payment logic here
          // This will involve showing crypto options, rates, and generating payment addresses
          const cryptoOptions = {
              reply_markup: {
                  inline_keyboard: [
                      [{ text: '₿ Bitcoin (BTC)', callback_data: 'crypto_btc' }],
                      [{ text: 'Ξ Ethereum (ETH)', callback_data: 'crypto_eth' }],
                      [{ text: 'USDT (ERC-20)', callback_data: 'crypto_usdt_erc20' }],
                      [{ text: 'USDT (TRC-20)', callback_data: 'crypto_usdt_trc20' }],
                      [{ text: 'Ł Litecoin (LTC)', callback_data: 'crypto_ltc' }],
                      [{ text: '❌ Cancel', callback_data: 'cancel_order' }]
                  ]
              }
          };
  
          await bot.sendMessage(chatId, 'Choose your preferred cryptocurrency:', cryptoOptions);
          break;

        case 'crypto_btc':
            // Handle Bitcoin payment
            await handleCryptoPayment(chatId, telegramId, 'BTC', query);
            break;
  
        case 'crypto_eth':
            // Handle Ethereum payment
            await handleCryptoPayment(chatId, telegramId, 'ETH', query);
            break;
  
        case 'crypto_usdt_erc20':
            // Handle USDT (ERC-20) payment
            await handleCryptoPayment(chatId, telegramId, 'USDT_ERC20', query);
            break;
  
        case 'crypto_usdt_trc20':
            // Handle USDT (TRC-20) payment
            await handleCryptoPayment(chatId, telegramId, 'USDT_TRC20', query);
            break;
  
        case 'crypto_ltc':
            // Handle Litecoin payment
            await handleCryptoPayment(chatId, telegramId, 'LTC', query);
            break;

        case 'topup_crypto':
          if (userState?.step === 'topup_payment_method') {
            const cryptoOptions = {
              reply_markup: {
                inline_keyboard: [
                  [{ text: '₿ Bitcoin (BTC)', callback_data: 'topup_crypto_btc' }],
                  [{ text: 'Ξ Ethereum (ETH)', callback_data: 'topup_crypto_eth' }],
                  [{ text: 'USDT (ERC-20)', callback_data: 'topup_crypto_usdt_erc20' }],
                  [{ text: 'USDT (TRC-20)', callback_data: 'topup_crypto_usdt_trc20' }],
                  [{ text: 'Ł Litecoin (LTC)', callback_data: 'topup_crypto_ltc' }],
                  [{ text: '❌ Cancel', callback_data: 'back_to_menu' }]
                ]
              }
            };
            await bot.sendMessage(chatId, 'Choose your preferred cryptocurrency for top-up:', cryptoOptions);
          }
          break;

        case 'topup_crypto_btc':
          await handleTopupCryptoPayment(chatId, telegramId, 'BTC', query);
          break;

        case 'topup_crypto_eth':
          await handleTopupCryptoPayment(chatId, telegramId, 'ETH', query);
          break;

        case 'topup_crypto_usdt_erc20':
          await handleTopupCryptoPayment(chatId, telegramId, 'USDT_ERC20', query);
          break;

        case 'topup_crypto_usdt_trc20':
          await handleTopupCryptoPayment(chatId, telegramId, 'USDT_TRC20', query);
          break;

        case 'topup_crypto_ltc':
          await handleTopupCryptoPayment(chatId, telegramId, 'LTC', query);
          break;
  
      case 'cancel_order':
        if (userState?.step === 'confirm_order') {
          await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
            chat_id: chatId,
            message_id: query.message?.message_id
          });

          await bot.sendMessage(chatId, '❌ Order cancelled.', getMainKeyboard());
          userStates.delete(telegramId);
        }
        break;
    }

    await bot.answerCallbackQuery(query.id);
  } catch (error) {
    console.error('Error handling callback query:', error);
    await bot.answerCallbackQuery(query.id, { text: 'Sorry, there was an error.' });
  }
});

// Function to handle crypto payments
async function handleCryptoPayment(chatId: number, telegramId: string, cryptoType: string, query: any) {
    const userState = userStates.get(telegramId);
  
    if (!userState || !userState.totalCost) {
        await bot.sendMessage(chatId, '❌ Error: Total cost not found. Please start the order again.');
        return;
    }
  
    try {
      // Fetch live crypto rate
      const cryptoRate = await getCryptoRate(cryptoType, 'USD');
  
      if (!cryptoRate) {
          await bot.sendMessage(chatId, `❌ Error fetching ${cryptoType} rate. Please try again later.`);
          return;
      }
  
      const amountInCrypto = (userState.totalCost / cryptoRate).toFixed(8);
  
      // Generate crypto payment address (replace with actual implementation)
      const paymentAddress = generateCryptoAddress(cryptoType);
  
      const paymentInstructions = `
  Pay ${amountInCrypto} ${cryptoType} to the following address:
  
  \`${paymentAddress}\`
  
  Once the payment is confirmed, send the transaction ID to @admin for verification.
  `;
  
        await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
          chat_id: chatId,
          message_id: query.message?.message_id
        });

      await bot.sendMessage(chatId, paymentInstructions, { parse_mode: 'Markdown' });
  
    } catch (error) {
      console.error(`Error handling ${cryptoType} payment:`, error);
      await bot.sendMessage(chatId, `❌ Error processing ${cryptoType} payment. Please try again later.`);
    }
}

// Function to handle crypto payments for top-ups
async function handleTopupCryptoPayment(chatId: number, telegramId: string, cryptoType: string, query: any) {
  const userState = userStates.get(telegramId);

  if (!userState || !userState.topupAmount) {
    await bot.sendMessage(chatId, '❌ Error: Top-up amount not found. Please start the top-up process again.');
    return;
  }

  try {
    // Fetch live crypto rate
    const cryptoRate = await getCryptoRate(cryptoType, 'USD');

    if (!cryptoRate) {
      await bot.sendMessage(chatId, `❌ Error fetching ${cryptoType} rate. Please try again later.`);
      return;
    }

    const amountInCrypto = (userState.topupAmount / cryptoRate).toFixed(8);

    // Generate crypto payment address (replace with actual implementation)
    const paymentAddress = generateCryptoAddress(cryptoType);

    const paymentInstructions = `
💳 *Top-Up Payment Instructions*

💰 *Amount:* $${userState.topupAmount}
₿ *Pay:* ${amountInCrypto} ${cryptoType}

📍 *Payment Address:*
\`${paymentAddress}\`

⚠️ *Important:*
- Send EXACTLY ${amountInCrypto} ${cryptoType}
- Once payment is confirmed, send the transaction ID to @admin
- Your balance will be updated after verification
- Payment expires in 30 minutes

💳 *Current Balance:* $${userState.user?.balance || '0.00'}
💵 *Balance After Top-up:* $${(parseFloat(userState.user?.balance || '0') + userState.topupAmount).toFixed(2)}
`;

    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, {
      chat_id: chatId,
      message_id: query.message?.message_id
    });

    await bot.sendMessage(chatId, paymentInstructions, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠 Back to Menu', callback_data: 'back_to_menu' }]
        ]
      }
    });

    // Clear user state
    userStates.delete(telegramId);

  } catch (error) {
    console.error(`Error handling ${cryptoType} top-up payment:`, error);
    await bot.sendMessage(chatId, `❌ Error processing ${cryptoType} payment. Please try again later.`);
  }
}

// Dummy function to get crypto rate
async function getCryptoRate(cryptoType: string, fiatType: string): Promise<number | null> {
    // Replace this with a real API call to a crypto exchange
    // Example: CoinGecko, CoinMarketCap, etc.
    // This is a dummy implementation
    const rates: { [key: string]: number } = {
        'BTC': 60000,
        'ETH': 3000,
        'USDT_ERC20': 1,
        'USDT_TRC20': 1,
        'LTC': 200
    };
  
    if (rates[cryptoType]) {
        return rates[cryptoType];
    }
  
    return null;
}
  
  // Dummy function to generate crypto address
function generateCryptoAddress(cryptoType: string): string {
    // Replace this with a real address generation logic
    return `FAKE_${cryptoType}_ADDRESS_${Date.now()}`;
}

// Handle document uploads
bot.on('document', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  const userState = userStates.get(telegramId);

  if (!userState || userState.step !== 'delivery_address_files'){
    await bot.sendMessage(chatId, '❌ Please start an order with /order first.');
    return;
  }

  try {
    const document = msg.document;
    if (!document) return;

    // Check file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(document.mime_type || '')) {
      await bot.sendMessage(chatId, '❌ Only PDF, DOC, DOCX, and TXT files are allowed.');
      return;
    }

    // Check file size (10MB limit)
    if (document.file_size && document.file_size > 10 * 1024 * 1024) {
      await bot.sendMessage(chatId, '❌ File size must be less than 10MB.');
      return;
    }

    // Download and save file
    const fileId = document.file_id;
    const file = await bot.getFile(fileId);
    const fileName = `${Date.now()}_${document.file_name}`;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);

    if (file.file_path) {
      const fileStream = await bot.downloadFile(fileId, uploadsDir);
      fs.renameSync(path.join(uploadsDir, path.basename(file.file_path)), filePath);
    }

    // Add file to current address
    const currentIndex = userState.currentAddressIndex || 0;
    if (!userState.deliveryAddresses[currentIndex].attachedFiles) {
      userState.deliveryAddresses[currentIndex].attachedFiles = [];
    }

    userState.deliveryAddresses[currentIndex].attachedFiles.push(fileName);
    userStates.set(telegramId, userState);

    await bot.sendMessage(chatId, `✅ File "${document.file_name}" uploaded successfully! Send more files or type "done" to continue.`);

  } catch (error) {
    console.error('Error handling document upload:', error);
    await bot.sendMessage(chatId, '❌ Error uploading file. Please try again.');
  }
});

// Handle photo uploads
bot.on('photo', async (msg) => {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id.toString() || "";
  const userState = userStates.get(telegramId);

  if (!userState || userState.step !== 'delivery_address_files') {
    await bot.sendMessage(chatId, '❌ Please start an order with /order first.');
    return;
  }

  try {
    const photo = msg.photo?.[msg.photo.length - 1]; // Get highest resolution
    if (!photo) return;

    // Check file size (10MB limit)
    if (photo.file_size && photo.file_size > 10 * 1024 * 1024) {
      await bot.sendMessage(chatId, '❌ File size must be less than 10MB.');
      return;
    }

    // Download and save photo
    const fileId = photo.file_id;
    const file = await bot.getFile(fileId);
    const fileName = `${Date.now()}_photo.jpg`;
    const uploadsDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);

    if (file.file_path) {
      const fileStream = await bot.downloadFile(fileId, uploadsDir);
      fs.renameSync(path.join(uploadsDir, path.basename(file.file_path)), filePath);
    }

    // Add file to current address
    const currentIndex = userState.currentAddressIndex || 0;
    if (!userState.deliveryAddresses[currentIndex].attachedFiles) {
      userState.deliveryAddresses[currentIndex].attachedFiles = [];
    }

    userState.deliveryAddresses[currentIndex].attachedFiles.push(fileName);
    userStates.set(telegramId, userState);

    await bot.sendMessage(chatId, `✅ Photo uploaded successfully! Send more files or type "done" to continue.`);

  } catch (error) {
    console.error('Error handling photo upload:', error);
    await bot.sendMessage(chatId, '❌ Error uploading photo. Please try again.');
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

// Function to send new order notification to all admins
export async function sendNewOrderToAdmins(orderDetails: any) {
  if (!bot || ADMIN_IDS.length === 0) {
    console.log('Telegram bot not available or no admin IDs configured - admin notification not sent');
    return;
  }

  try {
    let message = `🔔 *New Order Received*\n\n`;
    message += `📋 *Order:* ${orderDetails.orderNumber}\n`;
    message += `👤 *Customer:* ${orderDetails.user.firstName} ${orderDetails.user.lastName || ''} (@${orderDetails.user.username})\n`;
    message += `📝 *Description:* ${orderDetails.description}\n`;
    message += `📍 *Pickup:* ${orderDetails.pickupAddress}\n`;
    message += `🎯 *Delivery:* ${orderDetails.deliveryAddress}\n`;
    message += `💰 *Total:* $${orderDetails.totalCost}\n`;
    message += `📅 *Created:* ${new Date(orderDetails.createdAt).toLocaleString()}\n\n`;

    if (orderDetails.specialInstructions) {
      message += `📝 *Special Instructions:* ${orderDetails.specialInstructions}\n\n`;
    }

    // Send to all admin IDs
    for (const adminId of ADMIN_IDS) {
      try {
        await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(`Error sending notification to admin ${adminId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending new order notification to admins:', error);
  }
}

// Function to send order files to all admins
export async function sendOrderFilesToAdmins(orderDetails: any, deliveryAddresses: any[]) {
  if (!bot || ADMIN_IDS.length === 0) {
    console.log('Telegram bot not available or no admin IDs configured - admin files not sent');
    return;
  }

  try {
    for (const adminId of ADMIN_IDS) {
      try {
        // Send order summary first
        let message = `📎 *Order Files - ${orderDetails.orderNumber}*\n\n`;
        message += `👤 *Customer:* ${orderDetails.user.firstName} ${orderDetails.user.lastName || ''}\n`;
        message += `📝 *Description:* ${orderDetails.description}\n\n`;

        await bot.sendMessage(adminId, message, { parse_mode: 'Markdown' });

        // Send files for each delivery address
        for (let i = 0; i < deliveryAddresses.length; i++) {
          const address = deliveryAddresses[i];

          if (address.attachedFiles && address.attachedFiles.length > 0) {
            // Send address info
            const addressMessage = `📍 *Delivery Address ${i + 1}:*\n` +
              `Name: ${address.name}\n` +
              `Address: ${address.address}\n` +
              `${address.description ? `Notes: ${address.description}\n` : ''}\n` +
              `Files: ${address.attachedFiles.length} file(s)`;

            await bot.sendMessage(adminId, addressMessage, { parse_mode: 'Markdown' });

            // Send each file
            for (const fileName of address.attachedFiles) {
              try {
                const filePath = `uploads/${fileName}`;
                await bot.sendDocument(adminId, filePath, {
                  caption: `📎 File for ${address.name} - ${address.address}`
                });
              } catch (fileError) {
                console.error(`Error sending file ${fileName} to admin ${adminId}:`, fileError);
                await bot.sendMessage(adminId, `❌ Failed to send file: ${fileName}`, { parse_mode: 'Markdown' });
              }
            }
          } else {
            // Send address info without files
            const addressMessage = `📍 *Delivery Address ${i + 1}:*\n` +
              `Name: ${address.name}\n` +
              `Address: ${address.address}\n` +
              `${address.description ? `Notes: ${address.description}\n` : ''}` +
              `Files: No files attached`;

            await bot.sendMessage(adminId, addressMessage, { parse_mode: 'Markdown' });
          }
        }
      } catch (error) {
        console.error(`Error sending files to admin ${adminId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error sending order files to admins:', error);
  }
}