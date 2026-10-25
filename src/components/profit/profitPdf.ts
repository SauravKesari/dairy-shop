import type { jsPDF as JsPDF } from 'jspdf';
import type { ChartPoint } from './ProfitChart';

// Everything in the PDF is English: jsPDF's built-in fonts have no Devanagari or ₹ glyphs,
// so amounts print as plain numbers with "Amounts in Rs." in the footer (same as the Reports PDF)
export interface ProfitPdfInput {
  shopName: string;
  periodTitle: string; // e.g. "October 2026"
  generatedOn: string;
  summary: { label: string; current: number; previous: number; costLike?: boolean }[];
  marginPct: number;
  bills: number;
  chartTitle: string;
  chartColumn: string; // first column of the breakdown table: Category / Day / Month
  chart: ChartPoint[];
  showNet: boolean;
  topProducts: { name: string; qty: number; revenue: number; profit: number }[];
  belowCost: { name: string; qty: number; revenue: number; cost: number; profit: number }[];
  filename: string;
}

const money = (v: number) => v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pctText = (curr: number, prev: number) =>
  prev === 0 ? '—' : `${curr >= prev ? '+' : ''}${(((curr - prev) / Math.abs(prev)) * 100).toFixed(1)}%`;

// Axis labels: 1.2K / 3.4L / 1.1Cr keeps the left gutter narrow
const axisMoney = (v: number) => {
  const a = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (a >= 1e7) return `${s}${Number((a / 1e7).toFixed(1))}Cr`;
  if (a >= 1e5) return `${s}${Number((a / 1e5).toFixed(1))}L`;
  if (a >= 1e3) return `${s}${Number((a / 1e3).toFixed(1))}K`;
  return `${s}${Math.round(a)}`;
};

const GREEN: [number, number, number] = [16, 185, 129];
const RED: [number, number, number] = [239, 68, 68];
const DARK: [number, number, number] = [15, 23, 42];
const GRID: [number, number, number] = [226, 232, 240];
const MUTED: [number, number, number] = [100, 116, 139];

// Bar chart drawn with jsPDF shapes (no screenshot of the page), so it stays sharp when printed
const drawChart = (pdf: JsPDF, data: ChartPoint[], showNet: boolean, x: number, y: number, w: number, h: number) => {
  const values = data.flatMap(d => (showNet && d.net !== undefined ? [d.gross, d.net] : [d.gross]));
  const rawMax = Math.max(0, ...values);
  const rawMin = Math.min(0, ...values);
  // Round axis steps (500, 1K, 2.5K...) so the gridlines read cleanly
  const rough = (rawMax - rawMin || 1) / 5;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(v => v >= rough) ?? 10 * mag;
  const max = Math.ceil(rawMax / step) * step || step;
  const min = Math.floor(rawMin / step) * step;

  const gutter = 44;
  const plotX = x + gutter;
  const plotW = w - gutter;
  const yOf = (v: number) => y + ((max - v) / (max - min)) * h;

  // Grid + y labels
  pdf.setFontSize(7);
  pdf.setLineWidth(0.5);
  for (let v = min; v <= max + step / 2; v += step) {
    const ty = yOf(v);
    pdf.setDrawColor(...GRID);
    pdf.line(plotX, ty, plotX + plotW, ty);
    pdf.setTextColor(...MUTED);
    pdf.text(axisMoney(v), plotX - 4, ty + 2.5, { align: 'right' });
  }
  // Zero line
  pdf.setDrawColor(...MUTED);
  pdf.line(plotX, yOf(0), plotX + plotW, yOf(0));

  // Bars
  const slot = plotW / data.length;
  const barW = Math.max(1.5, Math.min(28, slot * 0.6));
  data.forEach((d, i) => {
    const cx = plotX + slot * i + slot / 2;
    const top = yOf(Math.max(0, d.gross));
    const bottom = yOf(Math.min(0, d.gross));
    pdf.setFillColor(...(d.gross < 0 ? RED : GREEN));
    if (bottom - top > 0) pdf.rect(cx - barW / 2, top, barW, bottom - top, 'F');
  });

  // Net line over the bars
  if (showNet) {
    pdf.setDrawColor(...DARK);
    pdf.setLineWidth(1.2);
    data.forEach((d, i) => {
      if (i === 0 || d.net === undefined || data[i - 1].net === undefined) return;
      pdf.line(plotX + slot * (i - 0.5), yOf(data[i - 1].net!), plotX + slot * (i + 0.5), yOf(d.net));
    });
  }

  // X labels: thinned out when there are many (31 days), shortened when long (category names)
  pdf.setTextColor(...MUTED);
  pdf.setFontSize(7);
  const every = Math.ceil(data.length / 16);
  data.forEach((d, i) => {
    if (i % every !== 0) return;
    const label = d.label.length > 12 ? `${d.label.slice(0, 11)}…` : d.label;
    pdf.text(label, plotX + slot * i + slot / 2, y + h + 10, { align: 'center' });
  });

  // Legend
  const ly = y + h + 24;
  pdf.setFillColor(...GREEN);
  pdf.rect(plotX, ly - 6, 8, 8, 'F');
  pdf.setTextColor(...DARK);
  pdf.text('Gross profit', plotX + 12, ly);
  if (showNet) {
    pdf.setDrawColor(...DARK);
    pdf.setLineWidth(1.2);
    pdf.line(plotX + 80, ly - 2, plotX + 92, ly - 2);
    pdf.text('Net profit (after expenses)', plotX + 96, ly);
  }
  pdf.setTextColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  return ly + 10;
};

export const downloadProfitPdf = async (input: ProfitPdfInput) => {
  // Loaded on demand so the PDF library stays out of the main bundle
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const left = 40;
  const width = pageW - left * 2;
  const tableStyle = {
    styles: { fontSize: 8 },
    headStyles: { fillColor: DARK },
    footStyles: { fillColor: [241, 245, 249] as [number, number, number], textColor: DARK },
    margin: { left, right: left },
    // columnStyles only reach the body, so line the header and total up with the right-aligned numbers
    didParseCell: (hook: { section: string; column: { index: number }; cell: { styles: { halign: string } } }) => {
      if (hook.section !== 'body' && hook.column.index > 0) hook.cell.styles.halign = 'right';
    },
  };
  const lastY = () => (pdf as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // Next section starts on a new page if it would not fit
  const ensureSpace = (y: number, needed: number) => {
    if (y + needed <= pageH - 40) return y;
    pdf.addPage();
    return 50;
  };
  const heading = (text: string, y: number) => {
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text(text, left, y);
    pdf.setFont('helvetica', 'normal');
    return y + 8;
  };

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(input.shopName, left, 40);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Profit report · ${input.periodTitle}`, left, 58);
  pdf.setFontSize(8);
  pdf.setTextColor(...MUTED);
  pdf.text(
    `Generated ${input.generatedOn} · ${input.bills} bills · Gross margin ${input.marginPct.toFixed(1)}%`,
    left,
    72
  );
  pdf.setTextColor(0, 0, 0);

  // 1. Summary with change against the previous period
  autoTable(pdf, {
    ...tableStyle,
    startY: 84,
    head: [['', 'This period', 'Previous period', 'Change']],
    body: input.summary.map(s => [s.label, money(s.current), money(s.previous), pctText(s.current, s.previous)]),
    columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } },
  });

  // 2. Chart
  let y = ensureSpace(lastY() + 26, 230);
  if (input.chart.length > 0) {
    y = heading(input.chartTitle, y);
    y = drawChart(pdf, input.chart, input.showNet, left, y + 8, width, 160);
  }

  // 3. The chart's numbers as a table
  if (input.chart.length > 0) {
    y = ensureSpace(y + 18, 60);
    y = heading(`${input.chartTitle} (table)`, y);
    autoTable(pdf, {
      ...tableStyle,
      startY: y + 4,
      head: [input.showNet ? [input.chartColumn, 'Gross profit', 'Net profit'] : [input.chartColumn, 'Gross profit']],
      body: input.chart.map(d => (input.showNet ? [d.label, money(d.gross), money(d.net ?? 0)] : [d.label, money(d.gross)])),
      foot: [
        [
          'Total',
          money(input.chart.reduce((sum, d) => sum + d.gross, 0)),
          ...(input.showNet ? [money(input.chart.reduce((sum, d) => sum + (d.net ?? 0), 0))] : []),
        ],
      ],
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    });
    y = lastY();
  }

  // 4. Products
  y = ensureSpace(y + 26, 60);
  y = heading('Top products by profit', y);
  autoTable(pdf, {
    ...tableStyle,
    startY: y + 4,
    head: [['Product', 'Qty', 'Sales', 'Profit', 'Margin']],
    body:
      input.topProducts.length > 0
        ? input.topProducts.map(p => [
            p.name,
            String(p.qty),
            money(p.revenue),
            money(p.profit),
            p.revenue > 0 ? `${((p.profit / p.revenue) * 100).toFixed(1)}%` : '—',
          ])
        : [['No product sales in this period', '', '', '', '']],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  y = ensureSpace(lastY() + 26, 60);
  y = heading('Sold below cost', y);
  autoTable(pdf, {
    ...tableStyle,
    startY: y + 4,
    head: [['Product', 'Qty', 'Sales', 'Cost', 'Loss']],
    body:
      input.belowCost.length > 0
        ? input.belowCost.map(p => [p.name, String(p.qty), money(p.revenue), money(p.cost), money(p.profit)])
        : [['None, every product sold at or above cost', '', '', '', '']],
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', textColor: RED } },
  });

  // Footer on every page
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(...MUTED);
    pdf.text(`Page ${i} of ${pages} · Amounts in Rs.`, pageW - left, pageH - 20, { align: 'right' });
  }

  pdf.save(input.filename);
};
