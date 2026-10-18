import React from 'react';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend, Cell } from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';

export interface ChartPoint {
  label: string;
  gross: number;
  net?: number;
}

const inr = (v: number) => `₹${Math.round(v).toLocaleString('en-IN')}`;
const tooltipFormatter = (value: unknown, name: unknown) => [inr(Number(value)), String(name)] as [string, string];

// Loaded on demand from ProfitScreen so Recharts stays out of the main bundle
const ProfitChart: React.FC<{ data: ChartPoint[]; showNet: boolean }> = ({ data, showNet }) => {
  const { t } = useLanguage();
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: Math.max(480, data.length * 28) }} className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {showNet ? (
            <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
              <YAxis tickFormatter={inr} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={72} />
              <Tooltip formatter={tooltipFormatter} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="gross" name={t('profit.chart.gross')} fill="#10b981" radius={[3, 3, 0, 0]} />
              <Line dataKey="net" name={t('profit.chart.net')} stroke="#0f172a" strokeWidth={2} dot={false} type="monotone" />
            </ComposedChart>
          ) : (
            <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} interval={0} />
              <YAxis tickFormatter={inr} tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} width={72} />
              <Tooltip formatter={tooltipFormatter} />
              <Bar dataKey="gross" name={t('profit.chart.gross')} radius={[3, 3, 0, 0]}>
                {data.map(d => (
                  <Cell key={d.label} fill={d.gross < 0 ? '#ef4444' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProfitChart;
