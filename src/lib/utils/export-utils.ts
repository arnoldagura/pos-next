/**
 * Export utilities for generating CSV, Excel, and PDF reports
 */

/**
 * Convert data to CSV format
 */
export function exportToCSV<T extends Record<string, string | number | null>>(
  data: T[],
  filename: string = 'export.csv'
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          // Escape values containing commas or quotes
          if (
            typeof value === 'string' &&
            (value.includes(',') || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        })
        .join(',')
    ),
  ].join('\n');

  downloadFile(csvContent, filename, 'text/csv');
}

/**
 * Export data to Excel format using simple HTML table method
 */
export function exportToExcel<T extends Record<string, string | number | null>>(
  data: T[],
  filename: string = 'export.xlsx',
  sheetName: string = 'Sheet1'
): void {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);

  // Create HTML table
  const htmlTable = `
    <table>
      <thead>
        <tr>
          ${headers.map((h) => `<th>${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${data
          .map(
            (row) => `
          <tr>
            ${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}
          </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
  `;

  // Convert to Excel format
  const excelContent = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${sheetName}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        ${htmlTable}
      </body>
    </html>
  `;

  downloadFile(excelContent, filename, 'application/vnd.ms-excel');
}

/**
 * Helper function to trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Format date for export filenames
 */
export function getExportFilename(
  prefix: string,
  extension: string = 'csv'
): string {
  const date = new Date();
  const dateStr = date.toISOString().split('T')[0];
  const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${prefix}_${dateStr}_${timeStr}.${extension}`;
}

/**
 * Export JSON data
 */
export function exportToJSON<T>(
  data: T,
  filename: string = 'export.json'
): void {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, filename, 'application/json');
}
