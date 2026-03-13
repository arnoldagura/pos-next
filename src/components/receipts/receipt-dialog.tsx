'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ReceiptTemplate } from './receipt-template';
import { printReceipt } from '@/lib/utils/receipt-printer';
import { Printer, Download, Share2, Mail } from 'lucide-react';
import { renderToString } from 'react-dom/server';

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

interface ReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptData: ReceiptData;
}

export function ReceiptDialog({
  open,
  onOpenChange,
  receiptData,
}: ReceiptDialogProps) {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const receiptHtml = renderToString(
        <ReceiptTemplate data={receiptData} />
      );
      printReceipt(receiptHtml);
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print receipt. Please try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownload = () => {
    const receiptHtml = renderToString(<ReceiptTemplate data={receiptData} />);
    const blob = new Blob([receiptHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${receiptData.orderNumber}.html`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt ${receiptData.orderNumber}`,
          text: `Order ${receiptData.orderNumber} - Total: $${receiptData.total}`,
        });
      } catch (error) {
        console.error('Share error:', error);
      }
    } else {
      alert('Sharing is not supported on this browser');
    }
  };

  const handleEmail = () => {
    // This would integrate with your email service
    alert('Email functionality will be implemented with email service integration');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt</DialogTitle>
          <DialogDescription>
            Order {receiptData.orderNumber} -{' '}
            {new Date(receiptData.orderDate).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        <div className="my-4">
          <ReceiptTemplate data={receiptData} />
        </div>

        <div className="flex gap-2 flex-wrap justify-center border-t pt-4">
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 min-w-[120px]"
          >
            <Printer className="h-4 w-4 mr-2" />
            {isPrinting ? 'Printing...' : 'Print'}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="flex-1 min-w-[120px]"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={handleShare}
            variant="outline"
            className="flex-1 min-w-[120px]"
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button
            onClick={handleEmail}
            variant="outline"
            className="flex-1 min-w-[120px]"
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
