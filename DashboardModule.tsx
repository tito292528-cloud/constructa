import React, { useState } from 'react';
import { 
  Building2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Landmark, 
  Users, 
  Truck, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  BarChart3
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { formatCurrency, formatPercent } from '../../lib/formatters.ts';
import { StatCard, Card, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import type { 
  FinancialSummary, 
  Project, 
  Invoice, 
  Purchase, 
  Expense, 
  Partner 
} from '../../types/index.ts';

interface DashboardModuleProps {
  summary: FinancialSummary;
  projects: Project[];
  invoices: Invoice[];
  purchases: Purchase[];
  expenses: Expense[];
  partners: Partner[];
  onNavigate: (section: string) => void;
  onOpenCreateProject: () => void;
  onOpenCreateInvoice: () => void;
  onOpenCreateExpense: () => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  summary,
  projects,
  invoices,
  purchases,
  expenses,
  partners,
  onNavigate,
  onOpenCreateProject,
  onOpenCreateInvoice,
  onOpenCreateExpense
}) => {
  const { t, language, isRTL } = useLanguage();
  const [dateFilter, setDateFilter] = useState<'year' | 'month' | 'week' | 'all'>('year');

  const totalPartnerCapital = partners.reduce((sum, p) => sum + (p.capitalContribution || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-850 to-stone-900 border border-stone-800 p-6 rounded-2xl text-stone-100 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            {isRTL ? 'لوحة المراقبة المالية والهندسية الموحدة' : 'Unified Financial & Engineering Dashboard'}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {t.dashboard}
          </h2>
          <p className="text-xs sm:text-sm text-stone-400 max-w-xl">
            {isRTL 
              ? 'متابعة حية للسيولة، تدفقات المستخلصات، ربحية المشاريع، وحصص الشركاء المسجلة بقاعدة البيانات.' 
              : 'Live real-time monitoring of cash liquidity, project profit margins, payables, and shareholder equity.'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateProject}>
            {t.addProject}
          </Button>
          <Button variant="outline" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateInvoice}>
            {t.createInvoice}
          </Button>
          <Button variant="secondary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={onOpenCreateExpense}>
            {t.addExpense}
          </Button>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 p-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl">
          <button
            onClick={() => setDateFilter('year')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'year'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {t.thisYear}
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'month'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {t.thisMonth}
          </button>
          <button
            onClick={() => setDateFilter('week')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'week'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {t.thisWeek}
          </button>
          <button
            onClick={() => setDateFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
              dateFilter === 'all'
                ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100'
            }`}
          >
            {t.all}
          </button>
        </div>

        <div className="text-xs text-stone-500 dark:text-stone-400 font-mono">
          {isRTL ? `عملة الحسابات: EGP (الجنيه المصري)` : `Base Currency: EGP (Egyptian Pound)`}
        </div>
      </div>

      {/* Primary KPI Grid (12 Cards as requested in #9) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Contract Value */}
        <StatCard
          title={t.totalContractValue}
          value={formatCurrency(summary.totalContractValue, 'EGP', language)}
          subtitle={`${summary.activeProjects} ${t.activeProjects.toLowerCase()}`}
          icon={<Building2 className="w-5 h-5" />}
          color="amber"
          onClick={() => onNavigate('projects')}
        />

        {/* Total Revenue */}
        <StatCard
          title={t.totalRevenue}
          value={formatCurrency(summary.totalRevenue, 'EGP', language)}
          subtitle={isRTL ? 'إجمالي المحصل من المستخلصات' : 'Total collected from progress billings'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="emerald"
          onClick={() => onNavigate('invoices')}
        />

        {/* Net Profit */}
        <StatCard
          title={t.netProfit}
          value={formatCurrency(summary.netProfit, 'EGP', language)}
          subtitle={isRTL ? 'بعد خصم تكاليف المواقع والمصروفات' : 'After direct job costs & overhead'}
          icon={<DollarSign className="w-5 h-5" />}
          color={summary.netProfit >= 0 ? 'emerald' : 'rose'}
          onClick={() => onNavigate('reports')}
        />

        {/* Projected / Expected Profit */}
        <StatCard
          title={t.expectedProfit}
          value={formatCurrency(summary.expectedProfit, 'EGP', language)}
          subtitle={isRTL ? 'بناءً على التكاليف التقديرية للعقود' : 'Based on estimated contract budgets'}
          icon={<BarChart3 className="w-5 h-5" />}
          color="blue"
          onClick={() => onNavigate('reports')}
        />

        {/* Cash Balance */}
        <StatCard
          title={t.cashBalance}
          value={formatCurrency(summary.cashBalance, 'EGP', language)}
          subtitle={isRTL ? 'سيولة الخزينة والعهد' : 'On-hand petty cash'}
          icon={<Wallet className="w-5 h-5" />}
          color="amber"
          onClick={() => onNavigate('cashbox')}
        />

        {/* Bank Balance */}
        <StatCard
          title={t.bankBalance}
          value={formatCurrency(summary.bankBalance, 'EGP', language)}
          subtitle={isRTL ? 'مجموع الحسابات المصرفية' : 'Consolidated bank accounts'}
          icon={<Landmark className="w-5 h-5" />}
          color="blue"
          onClick={() => onNavigate('banks')}
        />

        {/* Customer Receivables */}
        <StatCard
          title={t.customerReceivables}
          value={formatCurrency(summary.customerReceivables, 'EGP', language)}
          subtitle={isRTL ? 'مستحقات مستخلصات تحت التحصيل' : 'Pending progress receivables'}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          onClick={() => onNavigate('clients')}
        />

        {/* Supplier Payables */}
        <StatCard
          title={t.supplierPayables}
          value={formatCurrency(summary.supplierPayables, 'EGP', language)}
          subtitle={isRTL ? 'مستحقات توريدات ومقاولو باطن' : 'Procurement & vendor balances'}
          icon={<Truck className="w-5 h-5" />}
          color="rose"
          onClick={() => onNavigate('suppliers')}
        />

        {/* Total Purchases */}
        <StatCard
          title={t.totalPurchases}
          value={formatCurrency(summary.totalPurchases, 'EGP', language)}
          subtitle={isRTL ? 'حديد، أسمنت، خرسانة، معدات' : 'Rebar, cement, concrete, equipment'}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="amber"
          onClick={() => onNavigate('purchases')}
        />

        {/* Total Expenses */}
        <StatCard
          title={t.totalExpenses}
          value={formatCurrency(summary.totalExpenses, 'EGP', language)}
          subtitle={isRTL ? 'مصروفات مشاريع + إدارية' : 'Site direct + head office overhead'}
          icon={<TrendingDown className="w-5 h-5" />}
          color="rose"
          onClick={() => onNavigate('expenses')}
        />

        {/* Active Projects */}
        <StatCard
          title={t.activeProjects}
          value={summary.activeProjects}
          subtitle={`${summary.completedProjects} ${t.completedProjects.toLowerCase()}`}
          icon={<Clock className="w-5 h-5" />}
          color="blue"
          onClick={() => onNavigate('projects')}
        />

        {/* Completed Projects */}
        <StatCard
          title={t.completedProjects}
          value={summary.completedProjects}
          subtitle={isRTL ? 'مشاريع تم تسليمها نهائياً' : 'Fully handed over contracts'}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
          onClick={() => onNavigate('projects')}
        />

      </div>

      {/* Visual Charts & Financial Breakdown Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cash Flow & Margin Breakdown Card */}
        <Card className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
                {isRTL ? 'هيكل الإيرادات مقابل التكاليف والأرباح' : 'Revenue, Job Costs & Net Margins Structure'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isRTL ? 'تحليل تدفقات السيولة من واقع البيانات الفعلية' : 'Real-time database financial aggregation'}
              </p>
            </div>
            <Badge variant="gold">
              {isRTL ? 'حقيقي 100%' : '100% Live DB'}
            </Badge>
          </div>

          {/* Visual Progress Bar representation */}
          <div className="space-y-4 pt-2">
            
            {/* Revenue collected bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {t.totalRevenue} ({isRTL ? 'المحصل' : 'Collected'})
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(summary.totalRevenue, 'EGP', language)}
                </span>
              </div>
              <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.totalContractValue > 0 ? (summary.totalRevenue / summary.totalContractValue) * 100 : 0)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                {formatPercent(summary.totalContractValue > 0 ? (summary.totalRevenue / summary.totalContractValue) * 100 : 0)} {isRTL ? 'من إجمالي قيمة العقود' : 'of total contract values'}
              </p>
            </div>

            {/* Direct Job Cost & Purchases bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {isRTL ? 'إجمالي المشتريات والتكاليف المنفقة' : 'Procurement & Direct Job Costs'}
                </span>
                <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                  {formatCurrency(summary.totalPurchases + summary.totalExpenses, 'EGP', language)}
                </span>
              </div>
              <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, summary.totalRevenue > 0 ? ((summary.totalPurchases + summary.totalExpenses) / summary.totalRevenue) * 100 : 0)}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                {formatPercent(summary.totalRevenue > 0 ? ((summary.totalPurchases + summary.totalExpenses) / summary.totalRevenue) * 100 : 0)} {isRTL ? 'نسبة المصروف إلى الإيراد' : 'cost-to-revenue ratio'}
              </p>
            </div>

            {/* Net Profit Margin bar */}
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="font-semibold text-stone-700 dark:text-stone-300">
                  {t.netProfit} ({isRTL ? 'الفائض المحقق' : 'Surplus'})
                </span>
                <span className="font-bold text-amber-500 font-mono">
                  {formatCurrency(summary.netProfit, 'EGP', language)}
                </span>
              </div>
              <div className="h-3 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0))}%` }}
                ></div>
              </div>
              <p className="text-[10px] text-stone-400 mt-1">
                {formatPercent(summary.totalRevenue > 0 ? (summary.netProfit / summary.totalRevenue) * 100 : 0)} {isRTL ? 'هامش صافي الربح الفعلي' : 'actual net profit margin'}
              </p>
            </div>

          </div>

          {/* Quick summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-stone-200 dark:border-stone-800 text-center">
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40">
              <span className="text-[10px] text-stone-400 block uppercase">{isRTL ? 'السيولة المتاحة' : 'Total Liquidity'}</span>
              <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">
                {formatCurrency(summary.cashBalance + summary.bankBalance, 'EGP', language)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40">
              <span className="text-[10px] text-stone-400 block uppercase">{isRTL ? 'مستحقات لنا' : 'Receivables'}</span>
              <span className="text-sm font-bold text-purple-600 dark:text-purple-400 font-mono">
                {formatCurrency(summary.customerReceivables, 'EGP', language)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40">
              <span className="text-[10px] text-stone-400 block uppercase">{isRTL ? 'مستحقات علينا' : 'Payables'}</span>
              <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                {formatCurrency(summary.supplierPayables, 'EGP', language)}
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/40">
              <span className="text-[10px] text-stone-400 block uppercase">{isRTL ? 'صافي المركز المالي' : 'Net Liquidity'}</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {formatCurrency((summary.cashBalance + summary.bankBalance + summary.customerReceivables) - summary.supplierPayables, 'EGP', language)}
              </span>
            </div>
          </div>
        </Card>

        {/* Partner Equity Breakdown Card */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
                {t.partners}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {isRTL ? 'حصص الملكية وتوزيع الأرباح' : 'Ownership & profit distribution'}
              </p>
            </div>
            <button
              onClick={() => onNavigate('partners')}
              className="text-xs font-semibold text-amber-500 hover:underline cursor-pointer"
            >
              {t.view}
            </button>
          </div>

          {partners.length === 0 ? (
            <div className="py-8 text-center text-xs text-stone-400">
              {t.noPartnersYet}
            </div>
          ) : (
            <div className="space-y-3">
              {partners.map(p => (
                <div 
                  key={p.id}
                  onClick={() => onNavigate('partners')}
                  className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 hover:border-amber-500/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100">
                      {isRTL && p.nameAr ? p.nameAr : p.name}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-500">
                      {p.ownershipPercentage}% {isRTL ? 'ملكية' : 'Equity'}
                    </span>
                  </div>

                  <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden mb-2">
                    <div 
                      className="bg-amber-500 h-full rounded-full" 
                      style={{ width: `${p.ownershipPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500 dark:text-stone-400">
                    <span>{isRTL ? 'نسبة الأرباح:' : 'Profit Share:'} <strong className="text-stone-800 dark:text-stone-200">{p.profitSharePercentage}%</strong></span>
                    <span>{isRTL ? 'الرصيد الجاري:' : 'Current Bal:'} <strong className="text-stone-800 dark:text-stone-200">{formatCurrency(p.currentBalance, 'EGP', language)}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

      </div>

      {/* Active Construction Projects Overview */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-1.5 h-4 bg-amber-500 rounded-full inline-block"></span>
              {t.projectsTitle}
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {isRTL ? 'المشاريع قيد التنفيذ ونسب الإنجاز وهامش ربح كل موقع' : 'Active job sites, progress, and profitability'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate('projects')}>
            {t.view} {t.all} ({projects.length})
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noProjectsYet}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 4).map(p => {
              const grossProfit = (p.totalInvoiced || 0) - (p.actualCost || 0);
              const isProfitPositive = grossProfit >= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => onNavigate('projects')}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 hover:border-amber-500/50 transition-all cursor-pointer space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-amber-500">[{p.code}]</span>
                        <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                          {isRTL && p.nameAr ? p.nameAr : p.name}
                        </h4>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {p.clientName}
                      </p>
                    </div>
                    <Badge variant={p.status === 'Active' ? 'active' : p.status === 'Completed' ? 'completed' : 'pending'}>
                      {p.status}
                    </Badge>
                  </div>

                  {/* Progress bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-stone-500 dark:text-stone-400">{t.progress}</span>
                      <span className="font-bold text-stone-900 dark:text-stone-100">{p.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-amber-500 rounded-full transition-all duration-300"
                        style={{ width: `${p.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Financial mini metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px]">
                    <div>
                      <span className="text-stone-400 block">{t.contractValue}</span>
                      <span className="font-bold text-stone-800 dark:text-stone-200 font-mono">
                        {formatCurrency(p.contractValue, 'EGP', language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">{t.actualCost}</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                        {formatCurrency(p.actualCost, 'EGP', language)}
                      </span>
                    </div>
                    <div>
                      <span className="text-stone-400 block">{t.projectGrossProfit}</span>
                      <span className={`font-bold font-mono ${isProfitPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {formatCurrency(grossProfit, 'EGP', language)}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </Card>

    </div>
  );
};
