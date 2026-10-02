import React, { useState } from 'react';
import { 
  BarChart3, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Building2, 
  Scale, 
  Calendar,
  FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { formatCurrency, formatPercent, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import type { 
  FinancialSummary, 
  Project, 
  Partner, 
  Client, 
  Supplier, 
  Invoice, 
  Expense, 
  Purchase, 
  Material 
} from '../../types/index.ts';

interface ReportsModuleProps {
  summary: FinancialSummary;
  projects: Project[];
  partners: Partner[];
  clients: Client[];
  suppliers: Supplier[];
  invoices: Invoice[];
  expenses: Expense[];
  purchases: Purchase[];
  materials: Material[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  summary,
  projects,
  partners,
  clients,
  suppliers,
  invoices,
  expenses,
  purchases,
  materials
}) => {
  const { t, language, isRTL } = useLanguage();
  const [reportType, setReportType] = useState<'pnl' | 'projects' | 'partners' | 'receivables' | 'payables' | 'inventory'>('pnl');

  const exportCSV = (filename: string, rows: (string | number)[][]) => {
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExport = () => {
    if (reportType === 'projects') {
      const rows = [
        ['Project Code', 'Project Name', 'Client', 'Contract Value', 'Actual Cost', 'Gross Profit', 'Margin %', 'Status'],
        ...projects.map(p => [
          p.code,
          `"${p.name}"`,
          `"${p.clientName}"`,
          p.contractValue,
          p.actualCost,
          (p.totalInvoiced || 0) - (p.actualCost || 0),
          p.contractValue > 0 ? (((p.totalInvoiced || 0) - (p.actualCost || 0)) / p.contractValue * 100).toFixed(1) : 0,
          p.status
        ])
      ];
      exportCSV('constructa_projects_profitability', rows);
    } else if (reportType === 'partners') {
      const rows = [
        ['Partner Name', 'Ownership %', 'Profit Share %', 'Capital Contribution', 'Current Balance', 'Total Withdrawals'],
        ...partners.map(p => [
          `"${p.name}"`,
          p.ownershipPercentage,
          p.profitSharePercentage,
          p.capitalContribution,
          p.currentBalance,
          p.totalWithdrawals
        ])
      ];
      exportCSV('constructa_partners_equity', rows);
    } else if (reportType === 'pnl') {
      const rows = [
        ['Category', 'Line Item', 'Amount (EGP)'],
        ['Revenue', 'Total Collected Progress Invoices', summary.totalRevenue],
        ['Direct Job Cost', 'Procurement & Material Purchases', -summary.totalPurchases],
        ['Direct Job Cost', 'Site Operating Expenses', -summary.totalExpenses],
        ['Profit', 'Project Gross Profit', summary.projectGrossProfit],
        ['Profit', 'Company Net Profit', summary.netProfit]
      ];
      exportCSV('constructa_profit_and_loss', rows);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-amber-500" />
            {t.reportsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.reportsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={<FileSpreadsheet className="w-4 h-4 text-emerald-500" />} onClick={handleExport}>
            {t.exportCSV}
          </Button>
          <Button variant="secondary" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
            {t.print}
          </Button>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-stone-200 dark:border-stone-800">
        {[
          { id: 'pnl', label: t.reportProfitLoss },
          { id: 'projects', label: t.reportProjectProfitability },
          { id: 'partners', label: t.reportPartnerEquity },
          { id: 'receivables', label: t.reportCustomerReceivables },
          { id: 'payables', label: t.reportSupplierPayables },
          { id: 'inventory', label: t.reportInventoryValuation }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id as any)}
            className={`px-3.5 py-2 rounded-xl font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              reportType === tab.id
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* REPORT 1: PROFIT & LOSS STATEMENT */}
      {reportType === 'pnl' && (
        <Card className="space-y-6">
          <div className="text-center pb-4 border-b border-stone-200 dark:border-stone-800 space-y-1">
            <h3 className="text-lg font-black uppercase text-stone-900 dark:text-stone-100">
              {isRTL ? 'قائمة الدخل والأرباح والخسائر الختامية (P&L)' : 'Profit & Loss Statement (P&L)'}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isRTL ? 'بيانات حقيقية مستخرجة من قاعدة البيانات' : 'Consolidated from live transaction ledgers'}
            </p>
          </div>

          <div className="max-w-3xl mx-auto rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden font-mono text-xs">
            <table className="w-full text-left rtl:text-right">
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {/* Revenue */}
                <tr className="bg-stone-50 dark:bg-stone-800/60 font-bold font-sans">
                  <td colSpan={2} className="p-3 text-stone-900 dark:text-stone-100">1. {isRTL ? 'الإيرادات التشغيلية المعتمدة' : 'Operating Revenue'}</td>
                </tr>
                <tr>
                  <td className="p-3 font-sans text-stone-700 dark:text-stone-300 pl-6 rtl:pl-0 rtl:pr-6">
                    {isRTL ? 'إجمالي مستخلصات المشاريع المحصلة' : 'Collected Progress Bill Certificates'}
                  </td>
                  <td className="p-3 text-right rtl:text-left font-bold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(summary.totalRevenue, 'EGP', language)}
                  </td>
                </tr>

                {/* Direct Costs */}
                <tr className="bg-stone-50 dark:bg-stone-800/60 font-bold font-sans">
                  <td colSpan={2} className="p-3 text-stone-900 dark:text-stone-100">2. {isRTL ? 'تكلفة الأعمال المباشرة (COGS)' : 'Cost of Construction (Direct Job Costs)'}</td>
                </tr>
                <tr>
                  <td className="p-3 font-sans text-stone-700 dark:text-stone-300 pl-6 rtl:pl-0 rtl:pr-6">
                    {isRTL ? 'فواتير مشتريات وتوريدات المواد' : 'Procurement & Raw Materials'}
                  </td>
                  <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                    - {formatCurrency(summary.totalPurchases, 'EGP', language)}
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-sans text-stone-700 dark:text-stone-300 pl-6 rtl:pl-0 rtl:pr-6">
                    {isRTL ? 'مصروفات المواقع والتشغيل' : 'Site Running Expenses & Logistics'}
                  </td>
                  <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                    - {formatCurrency(expenses.filter(e => e.expenseType === 'project').reduce((s, e) => s + e.amount, 0), 'EGP', language)}
                  </td>
                </tr>

                {/* Gross Profit */}
                <tr className="bg-stone-100 dark:bg-stone-800 font-bold font-sans text-sm">
                  <td className="p-3.5 text-stone-900 dark:text-stone-100">3. {t.projectGrossProfit}</td>
                  <td className={`p-3.5 text-right rtl:text-left font-mono ${summary.projectGrossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {formatCurrency(summary.projectGrossProfit, 'EGP', language)}
                  </td>
                </tr>

                {/* Overhead */}
                <tr className="bg-stone-50 dark:bg-stone-800/60 font-bold font-sans">
                  <td colSpan={2} className="p-3 text-stone-900 dark:text-stone-100">4. {isRTL ? 'المصروفات العمومية والإدارية (أوفرهيد)' : 'General & Administrative Expenses'}</td>
                </tr>
                <tr>
                  <td className="p-3 font-sans text-stone-700 dark:text-stone-300 pl-6 rtl:pl-0 rtl:pr-6">
                    {isRTL ? 'إيجار المقر، فواتير، رسوم حكومية' : 'Head Office Rent, Utilities, Fees'}
                  </td>
                  <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                    - {formatCurrency(expenses.filter(e => e.expenseType === 'company').reduce((s, e) => s + e.amount, 0), 'EGP', language)}
                  </td>
                </tr>

                {/* Net Profit */}
                <tr className="bg-amber-500/15 font-black text-base border-t-2 border-amber-500">
                  <td className="p-4 text-stone-950 dark:text-amber-400 font-sans">5. {t.netProfit}</td>
                  <td className={`p-4 text-right rtl:text-left ${summary.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                    {formatCurrency(summary.netProfit, 'EGP', language)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 2: PROJECT PROFITABILITY MATRIX */}
      {reportType === 'projects' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t.reportProjectProfitability}
            </h3>
          </div>

          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="p-3">{t.projectCode}</th>
                  <th className="p-3">{t.projectName}</th>
                  <th className="p-3">{t.client}</th>
                  <th className="p-3">{t.contractValue}</th>
                  <th className="p-3">{t.actualCost}</th>
                  <th className="p-3">{t.projectGrossProfit}</th>
                  <th className="p-3">{isRTL ? 'هامش الربح' : 'Margin %'}</th>
                  <th className="p-3">{t.progress}</th>
                  <th className="p-3">{t.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {projects.map(p => {
                  const grossProfit = (p.totalInvoiced || 0) - (p.actualCost || 0);
                  const margin = p.contractValue > 0 ? (grossProfit / p.contractValue) * 100 : 0;

                  return (
                    <tr key={p.id}>
                      <td className="p-3 font-bold text-amber-500">{p.code}</td>
                      <td className="p-3 font-sans font-semibold text-stone-900 dark:text-stone-100">{p.name}</td>
                      <td className="p-3 font-sans text-stone-500">{p.clientName}</td>
                      <td className="p-3 font-bold">{formatCurrency(p.contractValue, 'EGP', language)}</td>
                      <td className="p-3 text-rose-600 dark:text-rose-400">{formatCurrency(p.actualCost, 'EGP', language)}</td>
                      <td className={`p-3 font-bold ${grossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
                        {formatCurrency(grossProfit, 'EGP', language)}
                      </td>
                      <td className="p-3 font-bold text-amber-500">{formatPercent(margin)}</td>
                      <td className="p-3">{p.progress}%</td>
                      <td className="p-3 font-sans"><Badge variant={p.status === 'Active' ? 'active' : 'draft'}>{p.status}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 3: PARTNER EQUITY STATEMENT */}
      {reportType === 'partners' && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {t.reportPartnerEquity}
          </h3>

          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="p-3">{t.partnerName}</th>
                  <th className="p-3">{t.ownershipPercentage}</th>
                  <th className="p-3">{t.profitSharePercentage}</th>
                  <th className="p-3">{t.capitalContribution}</th>
                  <th className="p-3">{t.currentBalance}</th>
                  <th className="p-3">{t.totalWithdrawals}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {partners.map(p => (
                  <tr key={p.id}>
                    <td className="p-3 font-sans font-bold text-stone-900 dark:text-stone-100">{p.name}</td>
                    <td className="p-3 font-bold text-amber-500">{p.ownershipPercentage}%</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{p.profitSharePercentage}%</td>
                    <td className="p-3">{formatCurrency(p.capitalContribution, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.currentBalance, 'EGP', language)}</td>
                    <td className="p-3 text-rose-600 dark:text-rose-400">{formatCurrency(p.totalWithdrawals, 'EGP', language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 4: RECEIVABLES */}
      {reportType === 'receivables' && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {t.reportCustomerReceivables}
          </h3>
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="p-3">{t.client}</th>
                  <th className="p-3">{t.company}</th>
                  <th className="p-3">{isRTL ? 'إجمالي المفوتر' : 'Total Invoiced'}</th>
                  <th className="p-3">{isRTL ? 'إجمالي المحصل' : 'Collected'}</th>
                  <th className="p-3">{isRTL ? 'الرصيد المستحق (مدين)' : 'Outstanding Receivable'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {clients.map(c => (
                  <tr key={c.id}>
                    <td className="p-3 font-sans font-bold text-stone-900 dark:text-stone-100">{c.name}</td>
                    <td className="p-3 font-sans text-stone-500">{c.company || '-'}</td>
                    <td className="p-3">{formatCurrency(c.totalInvoiced, 'EGP', language)}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400">{formatCurrency(c.totalPaid, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-purple-600 dark:text-purple-400">{formatCurrency(c.currentBalance, 'EGP', language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 5: PAYABLES */}
      {reportType === 'payables' && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {t.reportSupplierPayables}
          </h3>
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="p-3">{t.supplier}</th>
                  <th className="p-3">{t.company}</th>
                  <th className="p-3">{isRTL ? 'إجمالي التوريدات' : 'Total Purchases'}</th>
                  <th className="p-3">{isRTL ? 'إجمالي المسدد' : 'Paid Out'}</th>
                  <th className="p-3">{isRTL ? 'الرصيد المتبقي (دائن)' : 'Payable Balance'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td className="p-3 font-sans font-bold text-stone-900 dark:text-stone-100">{s.name}</td>
                    <td className="p-3 font-sans text-stone-500">{s.company || '-'}</td>
                    <td className="p-3">{formatCurrency(s.totalPurchases, 'EGP', language)}</td>
                    <td className="p-3 text-emerald-600 dark:text-emerald-400">{formatCurrency(s.totalPaid, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(s.currentBalance, 'EGP', language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* REPORT 6: INVENTORY VALUATION */}
      {reportType === 'inventory' && (
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {t.reportInventoryValuation}
          </h3>
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="p-3">{t.materialCode}</th>
                  <th className="p-3">{t.materialName}</th>
                  <th className="p-3">{t.category}</th>
                  <th className="p-3">{t.currentQuantity}</th>
                  <th className="p-3">{t.averageCost}</th>
                  <th className="p-3">{t.totalValuation}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {materials.map(m => (
                  <tr key={m.id}>
                    <td className="p-3 font-bold text-amber-500">{m.code}</td>
                    <td className="p-3 font-sans font-semibold text-stone-900 dark:text-stone-100">{m.name}</td>
                    <td className="p-3 font-sans text-stone-500">{m.category}</td>
                    <td className="p-3 font-bold">{m.currentQuantity} {m.unit}</td>
                    <td className="p-3">{formatCurrency(m.averageCost, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency((m.currentQuantity || 0) * (m.averageCost || 0), 'EGP', language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
};
