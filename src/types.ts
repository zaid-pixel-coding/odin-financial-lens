export type Severity = 'High' | 'Medium' | 'Low' | 'Info';

export interface ParsedTable {
  headers: string[];
  rows: Record<string, string>[];
  warnings: string[];
  delimiter: string;
}

export interface MetricValue {
  period: string;
  value: number | null;
  source: string;
}

export interface MetricSeries {
  key: string;
  label: string;
  values: MetricValue[];
}

export interface CompanyFinancials {
  name: string;
  periods: string[];
  metrics: MetricSeries[];
  missing: string[];
}

export interface FinancialInsight {
  title: string;
  severity: Severity;
  explanation: string;
  evidence: string;
  nextStep: string;
}

export interface DerivedMetric {
  company: string;
  label: string;
  value: string;
  detail: string;
  severity: Severity;
}

export interface AnalysisResult {
  parsed: ParsedTable;
  companies: CompanyFinancials[];
  insights: FinancialInsight[];
  derivedMetrics: DerivedMetric[];
  comparisonRows: Array<{
    metric: string;
    companyA: string;
    companyB: string;
    delta: string;
  }>;
  warnings: string[];
  summary: {
    companyCount: number;
    periodCount: number;
    metricCount: number;
    latestPeriod: string;
  };
}
