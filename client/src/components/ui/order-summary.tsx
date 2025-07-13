
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OrderSummaryProps {
  serviceType: string;
  documentCount?: string;
  shippingLabels?: string;
  baseCost: number;
  labelCost: number;
  distanceFee: number;
  totalCost: number;
}

export function OrderSummary({
  serviceType,
  documentCount,
  shippingLabels,
  baseCost,
  labelCost,
  distanceFee,
  totalCost
}: OrderSummaryProps) {
  const getServiceName = (type: string) => {
    const names = {
      standard: 'Standard Delivery',
      express: 'Express Delivery',
      same_day: 'Same Day Delivery',
      document: 'Document Sendout'
    };
    return names[type as keyof typeof names] || type;
  };

  return (
    <Card className="bg-gray-50">
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-700">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">{getServiceName(serviceType)}</span>
          <Badge variant="secondary">${baseCost}</Badge>
        </div>
        
        {serviceType === 'document' && documentCount && (
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>{documentCount} documents × $16</span>
            <span>${parseInt(documentCount) * 16}</span>
          </div>
        )}
        
        {shippingLabels && parseInt(shippingLabels) > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Shipping Labels ({shippingLabels})</span>
            <Badge variant="secondary">${labelCost}</Badge>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Distance Fee</span>
          <Badge variant="secondary">${distanceFee}</Badge>
        </div>
        
        <hr className="border-gray-200" />
        
        <div className="flex justify-between items-center font-medium">
          <span className="text-gray-900">Total Cost</span>
          <Badge className="bg-primary text-white">${totalCost}</Badge>
        </div>
      </CardContent>
    </Card>
  );
}
