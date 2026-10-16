import * as XLSX from 'xlsx';

const statementA = [
  { 'Line Item': 'Revenue', 'FY2022': '$3.8m', 'FY2023': '$6.1m', 'FY2024': '$9.6m' },
  { 'Line Item': 'Cost of Revenue', 'FY2022': '$1.75m', 'FY2023': '$2.60m', 'FY2024': '$3.92m' },
  { 'Line Item': 'Gross Profit', 'FY2022': '$2.05m', 'FY2023': '$3.50m', 'FY2024': '$5.68m' },
  { 'Line Item': 'Adjusted EBITDA', 'FY2022': '-$0.42m', 'FY2023': '$0.14m', 'FY2024': '$0.98m' },
  { 'Line Item': 'Net Profit', 'FY2022': '-$0.69m', 'FY2023': '-$0.16m', 'FY2024': '$0.43m' },
  { 'Line Item': 'Cash Balance', 'FY2022': '$1.6m', 'FY2023': '$2.1m', 'FY2024': '$2.8m' },
  { 'Line Item': 'Borrowings', 'FY2022': '$0.30m', 'FY2023': '$0.45m', 'FY2024': '$0.52m' },
  { 'Line Item': 'Net Burn', 'FY2022': '$85k', 'FY2023': '$52k', 'FY2024': '$25k' }
];

const statementB = [
  { 'Line Item': 'Revenue', 'FY2022': '$4.2m', 'FY2023': '$5.9m', 'FY2024': '$7.2m' },
  { 'Line Item': 'Cost of Revenue', 'FY2022': '$2.20m', 'FY2023': '$3.30m', 'FY2024': '$4.30m' },
  { 'Line Item': 'Gross Profit', 'FY2022': '$2.00m', 'FY2023': '$2.60m', 'FY2024': '$2.90m' },
  { 'Line Item': 'Adjusted EBITDA', 'FY2022': '$0.21m', 'FY2023': '$0.31m', 'FY2024': '-$0.08m' },
  { 'Line Item': 'Net Profit', 'FY2022': '$0.06m', 'FY2023': '$0.12m', 'FY2024': '-$0.26m' },
  { 'Line Item': 'Cash Balance', 'FY2022': '$0.9m', 'FY2023': '$1.05m', 'FY2024': '$0.85m' },
  { 'Line Item': 'Borrowings', 'FY2022': '$0.90m', 'FY2023': '$1.30m', 'FY2024': '$1.80m' },
  { 'Line Item': 'Net Burn', 'FY2022': '$70k', 'FY2023': '$65k', 'FY2024': '$115k' }
];

function writeWorkbook(rows, filename) {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({ wch: Math.max(15, key.length + 4) }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Income Statement');
  XLSX.writeFile(workbook, filename);
}

writeWorkbook(statementA, 'odin-financial-statement-a.xlsx');
writeWorkbook(statementB, 'odin-financial-statement-b.xlsx');
