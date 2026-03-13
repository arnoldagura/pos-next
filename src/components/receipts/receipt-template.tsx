'use client';

import { formatCurrency } from '@/lib/utils';

interface ReceiptItem {
  productName: string;
  productSku?: string | null;
  quantity: number;
  unitPrice: string;
  discount: string;
  total: string;
}

interface ReceiptData {
  orderNumber: string;
  orderDate: Date;
  location?: {
    name: string;
    address?: string;
    phone?: string;
  };
  items: ReceiptItem[];
  subtotal: string;
  totalDiscount: string;
  totalTax: string;
  total: string;
  paymentMethod: string | null;
  amountPaid: string;
  changeGiven: string;
  customerName?: string | null;
  tableNumber?: string | null;
}

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export function ReceiptTemplate({ data }: ReceiptTemplateProps) {
  return (
    <div className="w-full max-w-sm mx-auto p-6 font-mono text-sm bg-white">
      {/* Header */}
      <div className="text-center mb-4 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold mb-1">
          {data.location?.name || 'POS System'}
        </h1>
        {data.location?.address && (
          <p className="text-xs">{data.location.address}</p>
        )}
        {data.location?.phone && (
          <p className="text-xs">Tel: {data.location.phone}</p>
        )}
      </div>

      {/* Order Info */}
      <div className="mb-4 text-xs">
        <div className="flex justify-between">
          <span>Order #:</span>
          <span className="font-bold">{data.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date:</span>
          <span>{new Date(data.orderDate).toLocaleString()}</span>
        </div>
        {data.tableNumber && (
          <div className="flex justify-between">
            <span>Table:</span>
            <span>{data.tableNumber}</span>
          </div>
        )}
        {data.customerName && (
          <div className="flex justify-between">
            <span>Customer:</span>
            <span>{data.customerName}</span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="border-t-2 border-dashed border-black pt-2 mb-2">
        {data.items.map((item, index) => (
          <div key={index} className="mb-3">
            <div className="flex justify-between font-semibold">
              <span className="flex-1">{item.productName}</span>
              <span>{formatCurrency(parseFloat(item.total))}</span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 ml-2">
              <span>
                {item.quantity} x {formatCurrency(parseFloat(item.unitPrice))}
                {parseFloat(item.discount) > 0 &&
                  ` (-${formatCurrency(parseFloat(item.discount))})`}
              </span>
            </div>
            {item.productSku && (
              <div className="text-xs text-gray-500 ml-2">
                SKU: {item.productSku}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Totals */}
      <div className="border-t-2 border-black pt-2 mb-2">
        <div className="flex justify-between mb-1">
          <span>Subtotal:</span>
          <span>{formatCurrency(parseFloat(data.subtotal))}</span>
        </div>
        {parseFloat(data.totalDiscount) > 0 && (
          <div className="flex justify-between mb-1 text-red-600">
            <span>Discount:</span>
            <span>-{formatCurrency(parseFloat(data.totalDiscount))}</span>
          </div>
        )}
        {parseFloat(data.totalTax) > 0 && (
          <div className="flex justify-between mb-1">
            <span>Tax:</span>
            <span>{formatCurrency(parseFloat(data.totalTax))}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2 mt-2">
          <span>TOTAL:</span>
          <span>{formatCurrency(parseFloat(data.total))}</span>
        </div>
      </div>

      {/* Payment */}
      <div className="border-t-2 border-dashed border-black pt-2 mb-4">
        <div className="flex justify-between mb-1">
          <span>Payment Method:</span>
          <span className="uppercase">{data.paymentMethod}</span>
        </div>
        <div className="flex justify-between mb-1">
          <span>Amount Paid:</span>
          <span>{formatCurrency(parseFloat(data.amountPaid))}</span>
        </div>
        {parseFloat(data.changeGiven) > 0 && (
          <div className="flex justify-between font-bold">
            <span>Change:</span>
            <span>{formatCurrency(parseFloat(data.changeGiven))}</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center text-xs border-t-2 border-black pt-4">
        <p className="mb-1">Thank you for your business!</p>
        <p>Please come again</p>
      </div>
    </div>
  );
}
