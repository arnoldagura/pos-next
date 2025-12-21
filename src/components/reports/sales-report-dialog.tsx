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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Download, Loader2 } from 'lucide-react';
import { exportToCSV, exportToExcel, getExportFilename } from '@/lib/utils/export-utils';
import { formatCurrency } from '@/lib/utils';

interface SalesReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SalesReportDialog({
  open,
  onOpenChange,
}: SalesReportDialogProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const handleGenerateReport = async () => {
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        type: reportType,
      });

      const response = await fetch(`/api/reports/sales?${params}`);
      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData) return;

    let exportData: any[] = [];
    const filename = getExportFilename(`sales_report_${reportType}`, 'csv');

    if (reportType === 'summary' && reportData.topProducts) {
      exportData = reportData.topProducts.map((p: any) => ({
        Product: p.productName,
        'Total Quantity': p.totalQuantity,
        'Total Revenue': p.totalRevenue,
      }));
    } else if (reportType === 'detailed' && reportData.orders) {
      exportData = reportData.orders.map((o: any) => ({
        'Order Number': o.orderNumber,
        Customer: o.customerName || 'Walk-in',
        Location: o.locationName,
        'Payment Method': o.paymentMethod,
        Subtotal: o.subtotal,
        Discount: o.totalDiscount,
        Tax: o.totalTax,
        Total: o.total,
        Date: new Date(o.createdAt).toLocaleDateString(),
      }));
    } else if (reportType === 'daily' && reportData.dailySales) {
      exportData = reportData.dailySales.map((d: any) => ({
        Date: d.date,
        'Total Sales': d.totalSales,
        'Total Orders': d.totalOrders,
        'Avg Order Value': d.avgOrderValue,
      }));
    }

    if (exportData.length > 0) {
      exportToCSV(exportData, filename);
    }
  };

  const handleExportExcel = () => {
    if (!reportData) return;

    let exportData: any[] = [];
    const filename = getExportFilename(`sales_report_${reportType}`, 'xlsx');

    if (reportType === 'summary' && reportData.topProducts) {
      exportData = reportData.topProducts.map((p: any) => ({
        Product: p.productName,
        'Total Quantity': p.totalQuantity,
        'Total Revenue': p.totalRevenue,
      }));
    } else if (reportType === 'detailed' && reportData.orders) {
      exportData = reportData.orders.map((o: any) => ({
        'Order Number': o.orderNumber,
        Customer: o.customerName || 'Walk-in',
        Location: o.locationName,
        'Payment Method': o.paymentMethod,
        Subtotal: o.subtotal,
        Discount: o.totalDiscount,
        Tax: o.totalTax,
        Total: o.total,
        Date: new Date(o.createdAt).toLocaleDateString(),
      }));
    } else if (reportType === 'daily' && reportData.dailySales) {
      exportData = reportData.dailySales.map((d: any) => ({
        Date: d.date,
        'Total Sales': d.totalSales,
        'Total Orders': d.totalOrders,
        'Avg Order Value': d.avgOrderValue,
      }));
    }

    if (exportData.length > 0) {
      exportToExcel(exportData, filename);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sales Report
          </DialogTitle>
          <DialogDescription>
            Generate comprehensive sales reports and export to CSV or Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reportType">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="summary">Summary Report</SelectItem>
                <SelectItem value="detailed">Detailed Orders</SelectItem>
                <SelectItem value="daily">Daily Sales</SelectItem>
                <SelectItem value="category">Category Performance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerateReport}
            disabled={loading || !startDate || !endDate}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>

          {reportData && (
            <div className="border rounded-lg p-4 space-y-4">
              {reportType === 'summary' && reportData.summary && (
                <div>
                  <h3 className="font-semibold mb-3">Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border rounded p-3">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(parseFloat(reportData.summary.totalSales))}
                      </p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold">
                        {reportData.summary.totalOrders}
                      </p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-sm text-muted-foreground">Avg Order</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(parseFloat(reportData.summary.avgOrderValue))}
                      </p>
                    </div>
                    <div className="border rounded p-3">
                      <p className="text-sm text-muted-foreground">Total Tax</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(parseFloat(reportData.summary.totalTax))}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleExportCSV} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
                <Button onClick={handleExportExcel} variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Export Excel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
