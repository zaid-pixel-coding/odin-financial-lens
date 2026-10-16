import type { AnalysisResult, CompanyFinancials, DerivedMetric, FinancialInsight, MetricSeries, ParsedTable, Severity } from '../types';

const DELIMITERS = [',', '\t', '|', ';'];
const REQUIRED_METRICS = ['revenue', 'gross_profit', 'ebitda', 'net_income', 'cash'];

const METRIC_SYNONYMS: Record<string, string[]> = {
  revenue: ['revenue', 'sales', 'turnover', 'income from sales', 'total revenue'],
  arr: ['arr', 'annual recurring revenue', 'annualised recurring revenue'],
  cogs: ['cogs', 'cost of revenue', 'cost of sales', 'direct costs'],
  gross_profit: ['gross profit', 'gross margin dollars', 'gross income'],
  ebitda: ['ebitda', 'adjusted ebitda'],
  operating_income: ['operating income', 'operating profit', 'ebit'],
  net_income: ['net income', 'net profit', 'profit after tax', 'pat'],
  cash: ['cash', 'cash and equivalents', 'cash balance', 'cash at bank', 'cash equivalents'],
  debt: ['debt', 'total debt', 'borrowings', 'loans'],
  burn: ['monthly burn', 'burn', 'net burn', 'cash burn'],
  operating_cash_flow: ['operating cash flow', 'cash flow from operations', 'ocf'],
  capex: ['capex', 'capital expenditure', 'capital expenditures'],
  customers: ['customers', 'active customers', 'clients'],
  employees: ['employees', 'headcount', 'fte']
};

function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && next === '"' && inQuotes) {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      cells.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell.trim());
  return cells.map((value) => value.replace(/^"|"$/g, '').trim());
}

function detectDelimiter(lines: string[]): string {
  const sample = lines.slice(0, 8).join('\n');
  return DELIMITERS.map((delimiter) => ({ delimiter, count: (sample.match(new RegExp(`\\${delimiter}`, 'g')) || []).length }))
    .sort((a, b) => b.count - a.count)[0]?.delimiter || ',';
}

export function parseTable(raw: string): ParsedTable {
  const warnings: string[] = [];
  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [], warnings: ['No financial data was provided. Upload a spreadsheet or paste a table.'], delimiter: ',' };
  const delimiter = detectDelimiter(lines);
  const headers = splitCsvLine(lines[0], delimiter).map((header, index) => header || `column_${index + 1}`);
  const rows = lines.slice(1).map((line, rowIndex) => {
    const cells = splitCsvLine(line, delimiter);
    if (cells.length !== headers.length) warnings.push(`Row ${rowIndex + 2} has ${cells.length} cells but ${headers.length} headers; blank cells were tolerated.`);
    return headers.reduce<Record<string, string>>((record, header, index) => {
      record[header] = cells[index] || '';
      return record;
    }, {});
  });
  if (!rows.length) warnings.push('Only headers were found. Add rows to generate analysis.');
  return { headers, rows, warnings, delimiter };
}

function clean(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function findColumn(headers: string[], candidates: string[]) {
  return headers.find((header) => candidates.some((candidate) => clean(header) === clean(candidate) || clean(header).includes(clean(candidate))));
}

function isPeriodHeader(header: string) {
  const h = header.trim();
  return /^(fy)?20\d{2}$/i.test(h) || /^20\d{2}$/i.test(h) || /^(q[1-4]|h[1-2])\s*20\d{2}$/i.test(h) || /^20\d{2}\s*(q[1-4]|h[1-2])$/i.test(h);
}

function parseNumber(raw: string): number | null {
  if (!raw || ['-', '—', 'n/a', 'na', 'none'].includes(raw.trim().toLowerCase())) return null;
  let text = raw.trim().replace(/[$£€,%]/g, '').replace(/,/g, '');
  const negative = /^\(.*\)$/.test(text) || /^-/.test(text);
  text = text.replace(/[()]/g, '').replace(/^-/, '');
  const multiplier = /bn?$/i.test(text) ? 1_000_000_000 : /m$/i.test(text) ? 1_000_000 : /k$/i.test(text) ? 1_000 : 1;
  text = text.replace(/[a-z]+$/i, '');
  const parsed = Number(text);
  if (Number.isNaN(parsed)) return null;
  return (negative ? -1 : 1) * parsed * multiplier;
}

function canonicalMetric(label: string): { key: string; label: string } | null {
  const normalized = clean(label);
  for (const [key, synonyms] of Object.entries(METRIC_SYNONYMS)) {
    if (synonyms.some((synonym) => normalized === clean(synonym) || normalized.includes(clean(synonym)))) {
      return { key, label: titleCase(key.replace(/_/g, ' ')) };
    }
  }
  return null;
}

function titleCase(value: string) {
  return value.replace(/\b\w/g, (char) => char.toUpperCase());
}

function upsertMetric(company: CompanyFinancials, metricKey: string, metricLabel: string, period: string, rawValue: string, source: string) {
  let metric = company.metrics.find((candidate) => candidate.key === metricKey);
  if (!metric) {
    metric = { key: metricKey, label: metricLabel, values: [] };
    company.metrics.push(metric);
  }
  metric.values.push({ period, value: parseNumber(rawValue), source });
  if (!company.periods.includes(period)) company.periods.push(period);
}

function companyMapGet(map: Map<string, CompanyFinancials>, name: string) {
  const cleanName = name || 'Uploaded company';
  if (!map.has(cleanName)) map.set(cleanName, { name: cleanName, periods: [], metrics: [], missing: [] });
  return map.get(cleanName)!;
}

function fromLongFormat(parsed: ParsedTable): CompanyFinancials[] | null {
  const companyCol = findColumn(parsed.headers, ['company', 'business', 'name', 'issuer']);
  const periodCol = findColumn(parsed.headers, ['period', 'year', 'date', 'fiscal year', 'fy']);
  if (!periodCol) return null;
  const map = new Map<string, CompanyFinancials>();
  const metricColumns = parsed.headers.filter((header) => header !== companyCol && header !== periodCol);
  const recognized = metricColumns.map((header) => ({ header, metric: canonicalMetric(header) })).filter((item) => item.metric);
  if (recognized.length < 2) return null;

  parsed.rows.forEach((row, rowIndex) => {
    const company = companyMapGet(map, companyCol ? row[companyCol] : 'Uploaded company');
    const period = row[periodCol] || `Period ${rowIndex + 1}`;
    recognized.forEach(({ header, metric }) => {
      if (metric) upsertMetric(company, metric.key, metric.label, period, row[header], `${header}, row ${rowIndex + 2}`);
    });
  });
  return Array.from(map.values()).map(finalizeCompany);
}

function fromWideFormat(parsed: ParsedTable): CompanyFinancials[] {
  const company = companyMapGet(new Map(), 'Uploaded company');
  const labelCol = findColumn(parsed.headers, ['metric', 'line item', 'line_item', 'account', 'item']) || parsed.headers[0];
  const periodHeaders = parsed.headers.filter((header) => header !== labelCol && isPeriodHeader(header));
  const fallbackPeriodHeaders = periodHeaders.length ? periodHeaders : parsed.headers.slice(1).filter((header) => header !== labelCol);

  parsed.rows.forEach((row, rowIndex) => {
    const metric = canonicalMetric(row[labelCol]);
    if (!metric) return;
    fallbackPeriodHeaders.forEach((period) => upsertMetric(company, metric.key, metric.label, period, row[period], `${row[labelCol]}, row ${rowIndex + 2}`));
  });
  return [finalizeCompany(company)];
}

function finalizeCompany(company: CompanyFinancials): CompanyFinancials {
  company.periods = Array.from(new Set(company.periods)).sort();
  company.missing = REQUIRED_METRICS.filter((metric) => !company.metrics.some((candidate) => candidate.key === metric));
  return company;
}

function metric(company: CompanyFinancials, key: string): MetricSeries | undefined {
  return company.metrics.find((candidate) => candidate.key === key);
}

function valueFor(company: CompanyFinancials, key: string, period: string): number | null {
  return metric(company, key)?.values.find((value) => value.period === period)?.value ?? null;
}

function latestPeriod(company: CompanyFinancials) {
  return company.periods[company.periods.length - 1] || '';
}

function previousPeriod(company: CompanyFinancials) {
  return company.periods[company.periods.length - 2] || '';
}

function pct(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator === 0) return null;
  return numerator / denominator;
}

function formatMoney(value: number | null): string {
  if (value === null) return 'n/a';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatPct(value: number | null): string {
  return value === null ? 'n/a' : `${(value * 100).toFixed(1)}%`;
}

function addInsight(insights: FinancialInsight[], title: string, severity: Severity, explanation: string, evidence: string, nextStep: string) {
  insights.push({ title, severity, explanation, evidence, nextStep });
}

function deriveCompany(company: CompanyFinancials): { insights: FinancialInsight[]; derived: DerivedMetric[] } {
  const insights: FinancialInsight[] = [];
  const derived: DerivedMetric[] = [];
  const latest = latestPeriod(company);
  const previous = previousPeriod(company);
  const revenue = valueFor(company, 'revenue', latest);
  const previousRevenue = valueFor(company, 'revenue', previous);
  const grossProfit = valueFor(company, 'gross_profit', latest) ?? ((revenue !== null && valueFor(company, 'cogs', latest) !== null) ? revenue - valueFor(company, 'cogs', latest)! : null);
  const ebitda = valueFor(company, 'ebitda', latest);
  const netIncome = valueFor(company, 'net_income', latest);
  const cash = valueFor(company, 'cash', latest);
  const debt = valueFor(company, 'debt', latest);
  const burn = valueFor(company, 'burn', latest);
  const ocf = valueFor(company, 'operating_cash_flow', latest);
  const revenueGrowth = pct(revenue !== null && previousRevenue !== null ? revenue - previousRevenue : null, previousRevenue);
  const grossMargin = pct(grossProfit, revenue);
  const ebitdaMargin = pct(ebitda, revenue);
  const netMargin = pct(netIncome, revenue);
  const monthlyBurn = burn !== null ? Math.abs(burn) : ocf !== null && ocf < 0 ? Math.abs(ocf / 12) : null;
  const runway = pct(cash, monthlyBurn);

  derived.push({ company: company.name, label: 'Revenue', value: formatMoney(revenue), detail: `${latest} revenue`, severity: 'Info' });
  derived.push({ company: company.name, label: 'Revenue growth', value: formatPct(revenueGrowth), detail: previous ? `${previous} → ${latest}` : 'Need at least two periods', severity: revenueGrowth !== null && revenueGrowth < 0 ? 'Medium' : 'Info' });
  derived.push({ company: company.name, label: 'Gross margin', value: formatPct(grossMargin), detail: 'Gross profit / revenue', severity: grossMargin !== null && grossMargin < 0.4 ? 'Medium' : 'Info' });
  derived.push({ company: company.name, label: 'EBITDA margin', value: formatPct(ebitdaMargin), detail: 'EBITDA / revenue', severity: ebitdaMargin !== null && ebitdaMargin < 0 ? 'Medium' : 'Info' });
  derived.push({ company: company.name, label: 'Cash runway', value: runway === null ? 'n/a' : `${runway.toFixed(1)} mo`, detail: 'Cash / monthly burn estimate', severity: runway !== null && runway < 12 ? 'High' : 'Info' });

  if (revenueGrowth !== null && revenueGrowth > 0.3) addInsight(insights, `${company.name} is growing quickly`, 'Info', `Revenue increased ${formatPct(revenueGrowth)} in the latest comparable period.`, `${formatMoney(previousRevenue)} to ${formatMoney(revenue)} from ${previous} to ${latest}.`, 'Check whether growth is organic, one-off, or driven by pricing / volume mix.');
  if (grossMargin !== null && grossMargin < 0.45) addInsight(insights, `${company.name} has margin pressure`, 'Medium', `Gross margin is ${formatPct(grossMargin)}, which may limit operating leverage.`, `Gross profit ${formatMoney(grossProfit)} on revenue ${formatMoney(revenue)} in ${latest}.`, 'Review cost of revenue classification and whether low margin is structural or temporary.');
  if (ebitdaMargin !== null && ebitdaMargin < 0) addInsight(insights, `${company.name} is EBITDA-negative`, 'Medium', `EBITDA margin is ${formatPct(ebitdaMargin)}.`, `EBITDA ${formatMoney(ebitda)} on revenue ${formatMoney(revenue)} in ${latest}.`, 'Compare burn, runway, and planned financing needs before relying on growth alone.');
  if (runway !== null && runway < 12) addInsight(insights, `${company.name} may have limited runway`, 'High', `Estimated runway is ${runway.toFixed(1)} months from available cash and burn information.`, `Cash ${formatMoney(cash)} and monthly burn estimate ${formatMoney(monthlyBurn)} in ${latest}.`, 'Validate burn definition and check for committed financing or post-period cash movements.');
  if (debt !== null && cash !== null && debt > cash) addInsight(insights, `${company.name} has debt above cash`, 'Medium', `Debt exceeds cash in the latest period.`, `Debt ${formatMoney(debt)} vs cash ${formatMoney(cash)} in ${latest}.`, 'Review maturity, covenants, and whether debt is operationally meaningful.');
  if (company.missing.length) addInsight(insights, `${company.name} is missing key lines`, 'Low', `Some useful lines were not detected: ${company.missing.map(titleCase).join(', ')}.`, 'Analysis continued with available fields only.', 'Add the missing lines if you need valuation, profitability, or runway conclusions.');

  return { insights, derived };
}

function buildComparison(companies: CompanyFinancials[]) {
  if (companies.length < 2) return [];
  const [a, b] = companies;
  const latestA = latestPeriod(a);
  const latestB = latestPeriod(b);
  return ['revenue', 'gross_profit', 'ebitda', 'net_income', 'cash', 'debt'].map((key) => {
    const av = valueFor(a, key, latestA);
    const bv = valueFor(b, key, latestB);
    return {
      metric: titleCase(key.replace(/_/g, ' ')),
      companyA: formatMoney(av),
      companyB: formatMoney(bv),
      delta: av !== null && bv !== null ? formatMoney(av - bv) : 'n/a'
    };
  });
}

export function analyzeFinancials(raw: string): AnalysisResult {
  const parsed = parseTable(raw);
  const companies = fromLongFormat(parsed) ?? fromWideFormat(parsed);
  const allInsights: FinancialInsight[] = [];
  const allDerived: DerivedMetric[] = [];
  companies.forEach((company) => {
    const { insights, derived } = deriveCompany(company);
    allInsights.push(...insights);
    allDerived.push(...derived);
  });

  const latestPeriodLabel = companies.map(latestPeriod).filter(Boolean).sort().at(-1) || 'n/a';
  const warnings = [...parsed.warnings];
  if (!companies.length || companies.every((company) => company.metrics.length === 0)) warnings.push('No recognizable financial metrics were detected. Try columns like Revenue, Gross Profit, EBITDA, Net Income, Cash, Debt, Burn, or ARR.');

  return {
    parsed,
    companies,
    insights: allInsights.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    derivedMetrics: allDerived,
    comparisonRows: buildComparison(companies),
    warnings,
    summary: {
      companyCount: companies.length,
      periodCount: Math.max(0, ...companies.map((company) => company.periods.length)),
      metricCount: companies.reduce((sum, company) => sum + company.metrics.length, 0),
      latestPeriod: latestPeriodLabel
    }
  };
}

function severityRank(severity: Severity) {
  return severity === 'High' ? 4 : severity === 'Medium' ? 3 : severity === 'Low' ? 2 : 1;
}
