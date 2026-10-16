import * as XLSX from 'xlsx';

const rows = [
  {
    'Deal Name': 'Orion Growth SPV',
    'Investor / Entity': 'Aster Capital LLP',
    'Current Stage': 'Waiting documents',
    'Assigned To': 'Maya',
    'Outstanding Items': 'Proof of address',
    'Compliance Status': 'Pending review',
    'Money Status': 'Received',
    'Commitment': 125000,
    'Currency': 'GBP',
    'Last Contacted': '2026-10-09',
    'Target Close': '2026-10-25',
    'Approval Status': 'Not ready',
    'Notes': 'Investor sent subscription form; address evidence is missing.'
  },
  {
    'Deal Name': 'Orion Growth SPV',
    'Investor / Entity': 'Aster Capital',
    'Current Stage': 'Ready for review',
    'Assigned To': '',
    'Outstanding Items': 'None',
    'Compliance Status': 'Passed',
    'Money Status': 'Received',
    'Commitment': 125000,
    'Currency': 'GBP',
    'Last Contacted': '2026-10-14',
    'Target Close': '2026-10-25',
    'Approval Status': 'Pending manager',
    'Notes': 'Possible duplicate naming variant of Aster Capital LLP.'
  },
  {
    'Deal Name': 'Helix Robotics Fund',
    'Investor / Entity': 'Cedar Bridge Ventures',
    'Current Stage': 'Blocked',
    'Assigned To': 'Noah',
    'Outstanding Items': 'Source of funds clarification',
    'Compliance Status': 'Review',
    'Money Status': 'Partial',
    'Commitment': 500000,
    'Currency': 'USD',
    'Last Contacted': '2026-09-30',
    'Target Close': '2026-10-20',
    'Approval Status': 'Not ready',
    'Notes': 'Large commitment; partial wire received; compliance needs source-of-funds evidence.'
  },
  {
    'Deal Name': 'Helix Robotics Fund',
    'Investor / Entity': 'Northline Angels',
    'Current Stage': 'Ready to close',
    'Assigned To': 'Priya',
    'Outstanding Items': 'None',
    'Compliance Status': 'Passed',
    'Money Status': 'Received',
    'Commitment': 75000,
    'Currency': 'USD',
    'Last Contacted': '2026-10-15',
    'Target Close': '2026-10-20',
    'Approval Status': 'Approved',
    'Notes': 'Ready for fund admin summary.'
  },
  {
    'Deal Name': 'Atlas Compute Rollup',
    'Investor / Entity': 'Blue Oak Partners',
    'Current Stage': 'Needs ops check',
    'Assigned To': 'Iris',
    'Outstanding Items': '',
    'Compliance Status': 'Passed',
    'Money Status': 'Received',
    'Commitment': '',
    'Currency': 'EUR',
    'Last Contacted': '2026-10-13',
    'Target Close': '2026-10-27',
    'Approval Status': 'Pending manager',
    'Notes': 'Commitment value missing from tracker export.'
  },
  {
    'Deal Name': 'Atlas Compute Rollup',
    'Investor / Entity': 'Blue-Oak Partners',
    'Current Stage': 'Needs ops check',
    'Assigned To': 'Iris',
    'Outstanding Items': 'None',
    'Compliance Status': 'Passed',
    'Money Status': 'Received',
    'Commitment': 200000,
    'Currency': 'EUR',
    'Last Contacted': '2026-10-13',
    'Target Close': '2026-10-27',
    'Approval Status': 'Pending manager',
    'Notes': 'Name variant may match Blue Oak Partners.'
  }
];

const worksheet = XLSX.utils.json_to_sheet(rows);
worksheet['!cols'] = Object.keys(rows[0]).map((key) => ({ wch: Math.max(14, key.length + 4) }));
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, worksheet, 'Deal Ops Tracker');
XLSX.writeFile(workbook, 'odin-independent-test-tracker.xlsx');
