/**
 * Receipt Printer Utility
 * Provides functions to print receipts to thermal printers or generate printable HTML
 */

interface PrintReceiptOptions {
  autoPrint?: boolean;
  paperWidth?: number; // in mm (default: 80mm)
}

/**
 * Print receipt using browser print dialog
 */
export function printReceipt(receiptHtml: string, options: PrintReceiptOptions = {}): void {
  const { autoPrint = true, paperWidth = 80 } = options;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) {
    throw new Error('Unable to open print window. Please check popup blocker.');
  }

  const styles = `
    <style>
      @media print {
        @page {
          size: ${paperWidth}mm auto;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
        }
      }
      body {
        font-family: 'Courier New', monospace;
        margin: 0;
        padding: 0;
        background: white;
      }
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    </style>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt</title>
        ${styles}
      </head>
      <body>
        ${receiptHtml}
      </body>
    </html>
  `);
  printWindow.document.close();

  if (autoPrint) {
    printWindow.onload = () => {
      printWindow.print();
      // Close window after printing (optional)
      printWindow.onafterprint = () => {
        printWindow.close();
      };
    };
  }
}

/**
 * Generate ESC/POS commands for thermal printer
 * This is a simplified version - you may need a library like 'escpos' for production
 */
export function generateESCPOS(receiptData: {
  header: string[];
  items: string[];
  footer: string[];
}): string {
  const ESC = '\x1B';
  const GS = '\x1D';

  let commands = '';

  // Initialize printer
  commands += ESC + '@';

  // Header (centered, bold)
  receiptData.header.forEach((line) => {
    commands += ESC + 'a' + '\x01'; // Center
    commands += ESC + 'E' + '\x01'; // Bold on
    commands += line + '\n';
    commands += ESC + 'E' + '\x00'; // Bold off
  });

  commands += '\n';

  // Items
  receiptData.items.forEach((line) => {
    commands += ESC + 'a' + '\x00'; // Left align
    commands += line + '\n';
  });

  commands += '\n';

  // Footer (centered)
  receiptData.footer.forEach((line) => {
    commands += ESC + 'a' + '\x01'; // Center
    commands += line + '\n';
  });

  // Cut paper
  commands += '\n\n\n';
  commands += GS + 'V' + '\x00';

  return commands;
}

/**
 * Download receipt as HTML file
 */
export function downloadReceiptAsHTML(
  receiptHtml: string,
  filename: string = 'receipt.html'
): void {
  const blob = new Blob([receiptHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Share receipt via Web Share API (mobile-friendly)
 */
export async function shareReceipt(receiptData: {
  title: string;
  text: string;
  url?: string;
}): Promise<void> {
  if (!navigator.share) {
    throw new Error('Web Share API not supported in this browser');
  }

  try {
    await navigator.share({
      title: receiptData.title,
      text: receiptData.text,
      url: receiptData.url,
    });
  } catch (error) {
    if (error instanceof Error && error.name !== 'AbortError') {
      throw error;
    }
  }
}
