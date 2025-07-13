
export class OrderValidation {
  static validateDocumentCount(serviceType: string, documentCount?: string): { valid: boolean; error?: string } {
    if (serviceType === 'document') {
      const count = parseInt(documentCount || '0');
      if (count < 3) {
        return { valid: false, error: 'Document sendout requires a minimum of 3 documents' };
      }
    }
    return { valid: true };
  }

  static calculateOrderCost(serviceType: string, documentCount: string = '0', shippingLabels: string = '0'): number {
    const servicePrices = {
      standard: 20,
      express: 35,
      same_day: 50,
      document: 16,
    };

    let baseCost = 0;
    
    if (serviceType === 'document') {
      const docCount = parseInt(documentCount) || 0;
      baseCost = docCount * servicePrices.document;
    } else {
      baseCost = servicePrices[serviceType as keyof typeof servicePrices] || 0;
    }

    const labelCount = parseInt(shippingLabels) || 0;
    const labelCost = labelCount * 11;
    const distanceFee = Math.floor(Math.random() * 10) + 5; // Random distance fee between 5-15

    return baseCost + labelCost + distanceFee;
  }

  static validateUserBalance(userBalance: string, orderCost: number): { valid: boolean; error?: string } {
    const balance = parseFloat(userBalance);
    if (balance < orderCost) {
      return { 
        valid: false, 
        error: `Insufficient balance. Required: $${orderCost}, Available: $${balance}` 
      };
    }
    return { valid: true };
  }
}
