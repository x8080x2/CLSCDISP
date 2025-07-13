
import axios from 'axios';

export interface CryptoRate {
  symbol: string;
  name: string;
  price_usd: number;
  network?: string;
}

export interface PaymentRequest {
  orderId: string;
  userId: string;
  amount_usd: number;
  crypto_symbol: string;
  crypto_amount: number;
  wallet_address: string;
  expires_at: Date;
}

class CryptoService {
  private rates: Map<string, CryptoRate> = new Map();
  private paymentRequests: Map<string, PaymentRequest> = new Map();

  // Wallet addresses for receiving payments (configure these in your .env)
  private wallets = {
    BTC: process.env.BTC_WALLET || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    ETH: process.env.ETH_WALLET || '0x742d35Cc6634C0532925a3b8D4F5e13e5c8e1f5D',
    USDT_ERC: process.env.USDT_ERC_WALLET || '0x742d35Cc6634C0532925a3b8D4F5e13e5c8e1f5D',
    USDT_TRC: process.env.USDT_TRC_WALLET || 'TQn9Y2khEsLJW1ChVWFMSMeRDow5CNYEER',
    LTC: process.env.LTC_WALLET || 'LdPdNqWj9CQdGQvtaKbLfAWc3PcV6J8CZK'
  };

  async updateRates(): Promise<void> {
    try {
      // Using CoinGecko API (free tier)
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'bitcoin,ethereum,tether,litecoin',
          vs_currencies: 'usd'
        }
      });

      const data = response.data;
      
      this.rates.set('BTC', {
        symbol: 'BTC',
        name: 'Bitcoin',
        price_usd: data.bitcoin?.usd || 0
      });

      this.rates.set('ETH', {
        symbol: 'ETH',
        name: 'Ethereum',
        price_usd: data.ethereum?.usd || 0
      });

      this.rates.set('USDT_ERC', {
        symbol: 'USDT',
        name: 'Tether (ERC-20)',
        price_usd: data.tether?.usd || 1,
        network: 'ERC-20'
      });

      this.rates.set('USDT_TRC', {
        symbol: 'USDT',
        name: 'Tether (TRC-20)',
        price_usd: data.tether?.usd || 1,
        network: 'TRC-20'
      });

      this.rates.set('LTC', {
        symbol: 'LTC',
        name: 'Litecoin',
        price_usd: data.litecoin?.usd || 0
      });

      console.log('Crypto rates updated successfully');
    } catch (error) {
      console.error('Error updating crypto rates:', error);
    }
  }

  getRates(): CryptoRate[] {
    return Array.from(this.rates.values());
  }

  getRate(symbol: string): CryptoRate | undefined {
    return this.rates.get(symbol);
  }

  calculateCryptoAmount(usdAmount: number, cryptoSymbol: string): number {
    const rate = this.getRate(cryptoSymbol);
    if (!rate || rate.price_usd === 0) return 0;
    return Number((usdAmount / rate.price_usd).toFixed(8));
  }

  getWalletAddress(cryptoSymbol: string): string {
    return this.wallets[cryptoSymbol as keyof typeof this.wallets] || '';
  }

  createPaymentRequest(orderId: string, userId: string, amountUsd: number, cryptoSymbol: string): PaymentRequest {
    const cryptoAmount = this.calculateCryptoAmount(amountUsd, cryptoSymbol);
    const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const paymentRequest: PaymentRequest = {
      orderId,
      userId,
      amount_usd: amountUsd,
      crypto_symbol: cryptoSymbol,
      crypto_amount: cryptoAmount,
      wallet_address: this.getWalletAddress(cryptoSymbol),
      expires_at: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
    };

    this.paymentRequests.set(paymentId, paymentRequest);
    return paymentRequest;
  }

  getPaymentRequest(paymentId: string): PaymentRequest | undefined {
    return this.paymentRequests.get(paymentId);
  }

  isPaymentExpired(paymentRequest: PaymentRequest): boolean {
    return new Date() > paymentRequest.expires_at;
  }

  cleanExpiredPayments(): void {
    const now = new Date();
    for (const [id, payment] of this.paymentRequests.entries()) {
      if (now > payment.expires_at) {
        this.paymentRequests.delete(id);
      }
    }
  }
}

export const cryptoService = new CryptoService();

// Update rates every 5 minutes
setInterval(() => {
  cryptoService.updateRates();
}, 5 * 60 * 1000);

// Clean expired payments every hour
setInterval(() => {
  cryptoService.cleanExpiredPayments();
}, 60 * 60 * 1000);

// Initial rate update
cryptoService.updateRates();
