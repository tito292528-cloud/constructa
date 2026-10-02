import React, { useState } from 'react';
import { ShieldCheck, Search, Calendar, User, Activity } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { formatDate } from '../../lib/formatters.ts';
import { Card, Badge } from '../ui/Card.tsx';
import { Input } from '../ui/Input.tsx';
import type { AuditLog } from '../../types/index.ts';

interface AuditLogModuleProps {
  logs: AuditLog[];
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({ logs }) => {
  const { t, language, isRTL } = useLanguage();
  const [search, setSearch] = useState('');

  const filtered = logs.filter(l =>
    l.user.toLowerCase().includes(search.toLowerCase()) ||
    l.action.toLowerCase().includes(search.toLowerCase()) ||
    l.entity.toLowerCase().includes(search.toLowerCase()) ||
    l.details.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-amber-500" />
          {t.auditLogs}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          {isRTL ? 'سجل غير قابل للتعديل يوثق جميع العمليات المالية والهندسية بالمستخدم والتاريخ' : 'Immutable audit trail logging all financial & engineering actions'}
        </p>
      </div>

      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث في سجل الرقابة...' : 'Search audit records...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noData}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{isRTL ? 'التاريخ والوقت' : 'Timestamp'}</th>
                  <th className="p-3">{isRTL ? 'المستخدم' : 'Operator'}</th>
                  <th className="p-3">{isRTL ? 'نوع الإجراء' : 'Action'}</th>
                  <th className="p-3">{isRTL ? 'الكائن المستهدف' : 'Entity'}</th>
                  <th className="p-3">{isRTL ? 'التفاصيل' : 'Audit Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filtered.map(log => (
                  <tr key={log.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3 font-mono text-stone-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </td>
                    <td className="p-3 font-semibold text-stone-900 dark:text-stone-100 whitespace-nowrap">
                      {log.user}
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-stone-600 dark:text-stone-300">
                      {log.entity}
                    </td>
                    <td className="p-3 text-stone-600 dark:text-stone-400 max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
};
