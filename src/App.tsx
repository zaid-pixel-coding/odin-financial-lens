import { ChangeEvent, DragEvent, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  LineChart,
  Paperclip,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wand2
} from 'lucide-react';
import { comparisonFinancials, exampleFinancials } from './data/example';
import { analyzeFinancials } from './lib/analysis';
import type { AnalysisResult, CompanyFinancials, DerivedMetric, FinancialInsight, MetricSeries, Severity } from './types';

const primarySamplePath = './odin-financial-statement-a.xlsx';
const comparisonSamplePath = './odin-financial-statement-b.xlsx';
const metricOrder = ['Revenue', 'Revenue growth', 'Gross margin', 'EBITDA margin', 'Cash runway'];
const severityOrder: Record<Severity, number> = { High: 4, Medium: 3, Low: 2, Info: 1 };

type StatementSlot = 'primary' | 'comparison';

interface StatementState {
  label: string;
  raw: string;
  fileNotice: string;
  fileError: string;
}

function displayDelimiter(delimiter: string) {
  if (delimiter === '\t') return 'tab';
  if (delimiter === ',') return 'comma';
  if (delimiter === '|') return 'pipe';
  if (delimiter === ';') return 'semicolon';
  return delimiter;
}

function severityClass(severity: Severity) {
  return `severity severity-${severity.toLowerCase()}`;
}

function formatValue(value: number | null) {
  if (value === null) return 'n/a';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function readSeries(company: CompanyFinancials | undefined, key: string): MetricSeries | undefined {
  return company?.metrics.find((metric) => metric.key === key);
}

function getFirstCompany(result: AnalysisResult): CompanyFinancials | undefined {
  return result.companies[0];
}

function getMetric(metrics: DerivedMetric[], label: string): DerivedMetric | undefined {
  return metrics.find((metric) => metric.label === label);
}

function MiniLine({ series, periods }: { series?: MetricSeries; periods: string[] }) {
  const values = periods.map((period) => series?.values.find((value) => value.period === period)?.value ?? null);
  const numeric = values.filter((value): value is number => value !== null);
  if (!series || numeric.length < 2) return <div className="mini-empty">Need more periods</div>;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const span = max - min || 1;
  const plot = { left: 22, right: 116, top: 10, bottom: 76 };
  const xFor = (index: number) => plot.left + (index / Math.max(1, values.length - 1)) * (plot.right - plot.left);
  const yFor = (value: number) => plot.bottom - ((value - min) / span) * (plot.bottom - plot.top);
  const pointList = values
    .map((value, index) => value === null ? null : `${xFor(index)},${yFor(value)}`)
    .filter(Boolean)
    .join(' ');

  return (
    <svg viewBox="0 0 128 104" className="mini-line" role="img" aria-label={`${series.label} trend`}>
      <line x1={plot.left} y1={plot.top} x2={plot.left} y2={plot.bottom} className="axis-line" />
      <line x1={plot.left} y1={plot.bottom} x2={plot.right} y2={plot.bottom} className="axis-line" />
      <text x="0" y={plot.top + 4} className="axis-label">{formatValue(max)}</text>
      <text x="0" y={plot.bottom + 4} className="axis-label">{formatValue(min)}</text>
      {periods.map((period, index) => (
        <text key={period} x={xFor(index)} y="98" textAnchor="middle" className="period-label">{period.replace('FY', '')}</text>
      ))}
      <polyline points={pointList} fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((value, index) => value !== null && (
        <circle key={`${index}-${value}`} cx={xFor(index)} cy={yFor(value)} r="4.2" tabIndex={0}>
          <title>{`${periods[index]} · ${series.label}: ${formatValue(value)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

function MetricCard({ metric, label }: { metric?: DerivedMetric; label: string }) {
  return (
    <article className="metric-card">
      <div className="metric-top"><span>{label}</span>{metric && <em className={severityClass(metric.severity)}>{metric.severity}</em>}</div>
      <h3>{metric?.value ?? 'n/a'}</h3>
      <strong>{metric?.label ?? 'Not detected'}</strong>
      <p>{metric?.detail ?? 'Upload a sheet with this line to calculate it.'}</p>
    </article>
  );
}

function CompareMetricCard({ label, primary, comparison }: { label: string; primary?: DerivedMetric; comparison?: DerivedMetric }) {
  return (
    <article className="compare-metric-card">
      <h3>{label}</h3>
      <div className="compare-values">
        <div><span>Statement 1</span><strong>{primary?.value ?? 'n/a'}</strong><p>{primary?.detail ?? 'Missing input'}</p></div>
        <div><span>Statement 2</span><strong>{comparison?.value ?? 'n/a'}</strong><p>{comparison?.detail ?? 'Missing input'}</p></div>
      </div>
    </article>
  );
}

function StatementChart({ title, result }: { title: string; result: AnalysisResult }) {
  const company = getFirstCompany(result);
  return (
    <article className="company-card">
      <div className="company-head">
        <div>
          <span>Rundown</span>
          <h3>{title}</h3>
        </div>
        <BadgeCheck size={22} />
      </div>
      <div className="spark-grid">
        <div><span>Revenue</span><MiniLine series={readSeries(company, 'revenue')} periods={company?.periods ?? []} /></div>
        <div><span>EBITDA</span><MiniLine series={readSeries(company, 'ebitda')} periods={company?.periods ?? []} /></div>
      </div>
      <div className="statement-preview">
        {(company?.metrics ?? []).slice(0, 6).map((metric) => {
          const latest = company?.periods[company.periods.length - 1] ?? '';
          const value = metric.values.find((entry) => entry.period === latest)?.value ?? null;
          return <div key={metric.key}><span>{metric.label}</span><strong>{formatValue(value)}</strong></div>;
        })}
      </div>
      {company?.missing.length ? <p className="missing">Missing: {company.missing.join(', ')}</p> : null}
    </article>
  );
}

function PairedTrendCharts({ primary, comparison }: { primary: AnalysisResult; comparison: AnalysisResult }) {
  const primaryCompany = getFirstCompany(primary);
  const comparisonCompany = getFirstCompany(comparison);
  const trendRows = [
    { key: 'revenue', label: 'Revenue' },
    { key: 'ebitda', label: 'EBITDA' },
    { key: 'gross_profit', label: 'Gross profit' },
    { key: 'cash', label: 'Cash' }
  ];
  return (
    <section className="paired-section">
      {trendRows.map((row) => (
        <article className="paired-chart-card" key={row.key}>
          <h3>{row.label}</h3>
          <div className="paired-charts">
            <div><span>Statement 1</span><MiniLine series={readSeries(primaryCompany, row.key)} periods={primaryCompany?.periods ?? []} /></div>
            <div><span>Statement 2</span><MiniLine series={readSeries(comparisonCompany, row.key)} periods={comparisonCompany?.periods ?? []} /></div>
          </div>
        </article>
      ))}
    </section>
  );
}

function InsightCard({ insight }: { insight: FinancialInsight }) {
  return (
    <article className="insight-item">
      <div><span className={severityClass(insight.severity)}>{insight.severity}</span><h3>{insight.title}</h3></div>
      <p>{insight.explanation}</p>
      <blockquote>{insight.evidence}</blockquote>
      <strong>{insight.nextStep}</strong>
    </article>
  );
}

async function readFinancialFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (extension === 'xlsx' || extension === 'xls') {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) throw new Error('No worksheet found in the uploaded file.');
    return XLSX.utils.sheet_to_csv(workbook.Sheets[firstSheet]);
  }
  return file.text();
}

function buildComparisonCsv(primary: DerivedMetric[], comparison: DerivedMetric[]) {
  const rows = metricOrder.map((label) => [label, getMetric(primary, label)?.value ?? 'n/a', getMetric(comparison, label)?.value ?? 'n/a']);
  return ['metric,statement_1,statement_2', ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
}

function StatementInput({ slot, statement, onUpload, onTextChange, onLoadSample, onRemove, canRemove, dragging, setDragging }: {
  slot: StatementSlot;
  statement: StatementState;
  onUpload: (slot: StatementSlot, file?: File) => void;
  onTextChange: (slot: StatementSlot, value: string) => void;
  onLoadSample: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
  dragging: string;
  setDragging: (slot: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const isDragging = dragging === slot;
  return (
    <div className="input-card">
      <div className="section-title input-title">
        <div className="title-left"><Upload size={20} /><div><h2>{statement.label}</h2><p>Paste or upload a statement.</p></div></div>
        <div className="mini-actions">
          <button onClick={onLoadSample} type="button"><FileSpreadsheet size={15} /> Sample</button>
          {canRemove && <button onClick={onRemove} type="button"><Trash2 size={15} /> Remove</button>}
        </div>
      </div>
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onDragOver={(event) => { event.preventDefault(); setDragging(slot); }}
        onDragLeave={() => setDragging('')}
        onDrop={(event: DragEvent<HTMLDivElement>) => { event.preventDefault(); setDragging(''); onUpload(slot, event.dataTransfer.files[0]); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input ref={inputRef} type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" onChange={(event: ChangeEvent<HTMLInputElement>) => { onUpload(slot, event.target.files?.[0]); event.target.value = ''; }} />
        <Paperclip size={22} />
        <div>
          <strong>Drop Excel or CSV here, or click to upload</strong>
          <span>{statement.fileNotice}</span>
          {statement.fileError && <em>{statement.fileError}</em>}
        </div>
      </div>
      <textarea aria-label={`Paste ${statement.label}`} value={statement.raw} onChange={(event) => onTextChange(slot, event.target.value)} spellCheck={false} />
    </div>
  );
}

export function App() {
  const [primary, setPrimary] = useState<StatementState>({ label: 'Statement 1', raw: exampleFinancials, fileNotice: 'Sample statement loaded. Replace it with your own sheet when ready.', fileError: '' });
  const [comparison, setComparison] = useState<StatementState | null>(null);
  const [dragging, setDragging] = useState('');
  const [copied, setCopied] = useState(false);
  const primaryResult = useMemo(() => analyzeFinancials(primary.raw), [primary.raw]);
  const comparisonResult = useMemo(() => comparison ? analyzeFinancials(comparison.raw) : null, [comparison]);
  const allWarnings = [...primaryResult.warnings, ...(comparisonResult?.warnings ?? [])];
  const topInsights = [...primaryResult.insights.map((insight) => ({ ...insight, title: comparisonResult ? `Statement 1: ${insight.title}` : insight.title })), ...(comparisonResult?.insights.map((insight) => ({ ...insight, title: `Statement 2: ${insight.title}` })) ?? [])]
    .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]).slice(0, 6);

  async function loadFile(slot: StatementSlot, file?: File) {
    if (!file) return;
    try {
      const text = await readFinancialFile(file);
      const patch = { raw: text, fileNotice: `Loaded ${file.name} · ${(file.size / 1024).toFixed(1)} KB`, fileError: '' };
      if (slot === 'primary') setPrimary((current) => ({ ...current, ...patch }));
      else setComparison((current) => ({ ...(current ?? { label: 'Statement 2', raw: '', fileNotice: '', fileError: '' }), ...patch }));
    } catch (error) {
      const fileError = error instanceof Error ? error.message : 'Could not read that file. Try CSV, TSV, TXT, XLS, or XLSX.';
      if (slot === 'primary') setPrimary((current) => ({ ...current, fileError }));
      else setComparison((current) => ({ ...(current ?? { label: 'Statement 2', raw: '', fileNotice: '', fileError: '' }), fileError }));
    }
  }

  function updateText(slot: StatementSlot, value: string) {
    if (slot === 'primary') setPrimary((current) => ({ ...current, raw: value }));
    else setComparison((current) => ({ ...(current ?? { label: 'Statement 2', raw: '', fileNotice: '', fileError: '' }), raw: value }));
  }

  async function copyComparison() {
    const csv = comparisonResult ? buildComparisonCsv(primaryResult.derivedMetrics, comparisonResult.derivedMetrics) : primaryResult.derivedMetrics.map((metric) => `${metric.label},${metric.value}`).join('\n');
    try {
      await navigator.clipboard.writeText(csv);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <div className="brand"><span>ODIN</span><em>Financial Lens</em></div>
        <div className="topbar-actions">
          <button onClick={() => setPrimary((current) => ({ ...current, raw: exampleFinancials, fileNotice: 'Sample statement loaded.', fileError: '' }))}><FileSpreadsheet size={16} /> Statement sample</button>
          <a href={primarySamplePath} download><Download size={16} /> Download test workbook</a>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={16} /> One statement first, comparison when needed</div>
          <h1>Fast read for one financial statement.</h1>
          <p>
            Upload one statement for an instant rundown. Add one more to compare metrics and trends side by side.
          </p>
          <div className="hero-points">
            <span><CheckCircle2 size={17} /> One statement first</span>
            <span><ShieldCheck size={17} /> Max two</span>
            <span><LineChart size={17} /> Side-by-side trends</span>
          </div>
        </div>
        <div className="summary-card">
          <span>{comparisonResult ? 'Comparison mode' : 'Single-statement mode'}</span>
          <strong>{comparisonResult ? '2 statements' : '1 statement'}</strong>
          <div className="summary-grid">
            <div><em>{primaryResult.summary.periodCount}</em><span>periods</span></div>
            <div><em>{primaryResult.summary.metricCount}</em><span>metrics</span></div>
            <div><em>{comparisonResult?.summary.periodCount ?? '—'}</em><span>periods</span></div>
            <div><em>{comparisonResult?.summary.metricCount ?? '—'}</em><span>metrics</span></div>
          </div>
        </div>
      </section>

      <section className="workspace statement-workspace">
        <StatementInput
          slot="primary"
          statement={primary}
          onUpload={loadFile}
          onTextChange={updateText}
          onLoadSample={() => setPrimary((current) => ({ ...current, raw: exampleFinancials, fileNotice: 'Sample statement loaded.', fileError: '' }))}
          dragging={dragging}
          setDragging={setDragging}
        />
        {comparison ? (
          <StatementInput
            slot="comparison"
            statement={comparison}
            onUpload={loadFile}
            onTextChange={updateText}
            onLoadSample={() => setComparison((current) => ({ ...(current ?? { label: 'Statement 2', raw: '', fileNotice: '', fileError: '' }), raw: comparisonFinancials, fileNotice: 'Comparison sample loaded.', fileError: '' }))}
            onRemove={() => setComparison(null)}
            canRemove
            dragging={dragging}
            setDragging={setDragging}
          />
        ) : (
          <aside className="insight-card add-card">
            <div className="section-title compact">
              <Wand2 size={20} />
              <div><h2>Add comparison</h2><p>Optional. Capped at two statements.</p></div>
            </div>
            <button className="add-comparison" onClick={() => setComparison({ label: 'Statement 2', raw: comparisonFinancials, fileNotice: 'Comparison sample loaded. Replace it with another workbook when ready.', fileError: '' })}><Plus size={18} /> Add second statement</button>
            <a className="secondary-download" href={comparisonSamplePath} download><Download size={16} /> Download comparison workbook</a>
            <div className="guardrail"><ShieldCheck size={18} /> Validate definitions and source data before making decisions.</div>
          </aside>
        )}
      </section>

      {allWarnings.length > 0 && (
        <section className="warnings">
          <AlertTriangle size={20} />
          <div>
            <h2>What the sheet does not fully support yet</h2>
            {Array.from(new Set(allWarnings)).map((warning) => <p key={warning}>{warning}</p>)}
          </div>
        </section>
      )}

      {comparisonResult ? (
        <PairedTrendCharts primary={primaryResult} comparison={comparisonResult} />
      ) : (
        <section className="company-grid single-company-grid">
          <StatementChart title="Statement rundown" result={primaryResult} />
        </section>
      )}

      <section className={comparisonResult ? 'metric-strip compare-strip' : 'metric-strip'}>
        {comparisonResult ? metricOrder.map((label) => <CompareMetricCard key={label} label={label} primary={getMetric(primaryResult.derivedMetrics, label)} comparison={getMetric(comparisonResult.derivedMetrics, label)} />)
          : metricOrder.map((label) => <MetricCard key={label} label="Statement 1" metric={getMetric(primaryResult.derivedMetrics, label)} />)}
      </section>

      {comparisonResult && (
        <section className="comparison-card">
          <div className="section-title compact"><BarChart3 size={20} /><div><h2>Side-by-side normalized view</h2><p>Each metric is calculated independently from the two uploaded statements.</p></div></div>
          <div className="comparison-table">
            <div className="comparison-header"><span>Metric</span><span>Statement 1</span><span>Statement 2</span><span>Read</span></div>
            {metricOrder.map((label) => {
              const left = getMetric(primaryResult.derivedMetrics, label);
              const right = getMetric(comparisonResult.derivedMetrics, label);
              return <div className="comparison-row" key={label}><strong>{label}</strong><span>{left?.value ?? 'n/a'}</span><span>{right?.value ?? 'n/a'}</span><em>{left && right ? 'Comparable' : 'Needs input'}</em></div>;
            })}
          </div>
        </section>
      )}

      <section className="insights-section">
        <div className="section-title compact"><Sparkles size={20} /><div><h2>Insights and follow-ups</h2><p>{comparisonResult ? 'Grouped across both statements.' : 'Quick rundown from the first statement.'}</p></div></div>
        <div className="insight-list">
          {topInsights.length ? topInsights.map((insight) => <InsightCard key={`${insight.title}-${insight.evidence}`} insight={insight} />) : <p className="muted">Upload a sheet with revenue, margin, cash, debt, or burn lines to generate insights.</p>}
        </div>
        <div className="input-footer final-footer">
          <span>Statement 1: {primaryResult.parsed.rows.length} rows · delimiter: {displayDelimiter(primaryResult.parsed.delimiter)}{comparisonResult ? ` · Statement 2: ${comparisonResult.parsed.rows.length} rows` : ''}</span>
          <button onClick={copyComparison}><Copy size={16} /> {copied ? 'Copied' : comparisonResult ? 'Copy comparison CSV' : 'Copy rundown CSV'}</button>
        </div>
      </section>
    </main>
  );
}
