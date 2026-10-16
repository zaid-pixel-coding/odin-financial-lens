import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { analyzeFinancials, parseTable } from './analysis';
import { comparisonFinancials, exampleFinancials } from '../data/example';

function workbookToCsv(path: string) {
  const workbook = XLSX.readFile(path);
  const firstSheet = workbook.SheetNames[0];
  return XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
}

describe('financial parser', () => {
  it('parses a single common wide financial statement by default', () => {
    const result = analyzeFinancials(exampleFinancials);
    expect(result.summary.companyCount).toBe(1);
    expect(result.summary.periodCount).toBe(3);
    expect(result.companies[0].metrics.some((metric) => metric.key === 'revenue')).toBe(true);
    expect(result.derivedMetrics.some((metric) => metric.label === 'Revenue growth')).toBe(true);
  });

  it('parses a second statement independently for comparison mode', () => {
    const result = analyzeFinancials(comparisonFinancials);
    expect(result.summary.companyCount).toBe(1);
    expect(result.companies[0].metrics.some((metric) => metric.key === 'debt')).toBe(true);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('handles blank input with useful warnings', () => {
    const result = analyzeFinancials('');
    expect(result.warnings.join(' ')).toContain('No financial data');
  });

  it('handles pipe-delimited pasted statements', () => {
    const parsed = parseTable('Metric | FY2023 | FY2024\nRevenue | 1000 | 1500\nEBITDA | -100 | 100');
    expect(parsed.delimiter).toBe('|');
    const result = analyzeFinancials('Metric | FY2023 | FY2024\nRevenue | 1000 | 1500\nEBITDA | -100 | 100');
    expect(result.summary.periodCount).toBe(2);
  });
});

describe('spreadsheet end-to-end', () => {
  it('loads independent statement A as one company statement', () => {
    const result = analyzeFinancials(workbookToCsv('odin-financial-statement-a.xlsx'));
    expect(result.summary.companyCount).toBe(1);
    expect(result.summary.periodCount).toBe(3);
    expect(result.derivedMetrics.some((metric) => metric.label === 'Gross margin')).toBe(true);
  });

  it('loads independent statement B as one company statement', () => {
    const result = analyzeFinancials(workbookToCsv('odin-financial-statement-b.xlsx'));
    expect(result.summary.companyCount).toBe(1);
    expect(result.summary.periodCount).toBe(3);
    expect(result.insights.length).toBeGreaterThan(0);
  });

  it('loads the deployed statement workbooks if present', () => {
    const workbookA = XLSX.read(readFileSync('public/odin-financial-statement-a.xlsx'), { type: 'buffer' });
    const workbookB = XLSX.read(readFileSync('public/odin-financial-statement-b.xlsx'), { type: 'buffer' });
    const resultA = analyzeFinancials(XLSX.utils.sheet_to_csv(workbookA.Sheets[workbookA.SheetNames[0]]));
    const resultB = analyzeFinancials(XLSX.utils.sheet_to_csv(workbookB.Sheets[workbookB.SheetNames[0]]));
    expect(resultA.summary.companyCount).toBe(1);
    expect(resultB.summary.companyCount).toBe(1);
  });
});
