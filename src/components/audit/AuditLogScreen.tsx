import React, { useState, useMemo } from 'react';
import { useDairy } from '../../context/DairyContext';
import { ShieldCheck, Search, Filter, Calendar } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

export const AuditLogScreen: React.FC = () => {
  const { auditLogs, currentUser } = useDairy();
  const { t } = useLanguage();
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchAction = filterAction === 'all' || log.action === filterAction;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        log.action.toLowerCase().includes(q) ||
        log.user_name.toLowerCase().includes(q) ||
        JSON.stringify(log.details).toLowerCase().includes(q);
      return matchAction && matchSearch;
    });
  }, [auditLogs, filterAction, searchQuery]);

  const uniqueActions = useMemo(() => {
    return Array.from(new Set(auditLogs.map(l => l.action)));
  }, [auditLogs]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>{t('audit.title')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('audit.subtitle')}
          </p>
        </div>

        <div className="text-xs text-slate-500 font-mono-numbers bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs">
          {t('audit.eventCount', { count: auditLogs.length })}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t('audit.searchPh')}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>

          <select
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
            className="py-1.5 px-3 border border-slate-200 rounded-lg bg-slate-50"
          >
            <option value="all">{t('audit.allActions')}</option>
            {uniqueActions.map(act => (
              <option key={act} value={act}>
                {act.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {filterAction !== 'all' && (
          <button
            onClick={() => setFilterAction('all')}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {t('audit.showAll')}
          </button>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <th className="py-3 px-4 font-semibold">{t('audit.timestamp')}</th>
              <th className="py-3 px-4 font-semibold">{t('audit.user')}</th>
              <th className="py-3 px-4 font-semibold">{t('audit.action')}</th>
              <th className="py-3 px-4 font-semibold">{t('audit.entity')}</th>
              <th className="py-3 px-4 font-semibold">{t('audit.details')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono-numbers">
            {filteredLogs.map(log => (
              <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString()}{' '}
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </td>
                <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                  {log.user_name}
                </td>
                <td className="py-3 px-4 font-sans whitespace-nowrap">
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] uppercase ${
                      log.action.includes('CANCEL')
                        ? 'bg-red-50 text-red-700'
                        : log.action.includes('REOPEN')
                        ? 'bg-amber-50 text-amber-800'
                        : log.action.includes('ADJUST')
                        ? 'bg-purple-50 text-purple-700'
                        : log.action.includes('PRICE')
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {log.action.replace('_', ' ')}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 font-sans uppercase text-[11px]">
                  {log.entity}
                </td>
                <td className="py-3 px-4 font-sans text-slate-700">
                  <pre className="text-[11px] font-mono-numbers bg-slate-50 p-1.5 rounded border border-slate-100 whitespace-pre-wrap max-w-xl">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
