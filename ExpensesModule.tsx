import React, { useState } from 'react';
import { TrendingDown, Plus, Search, Trash2, Calendar, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { Expense, ExpenseCategory, ExpenseType, Project, BankAccount } from '../../types/index.ts';

interface ExpensesModuleProps {
  expenses: Expense[];
  projects: Project[];
  bankAccounts: BankAccount[];
  onCreateExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  expenses,
  projects,
  bankAccounts,
  onCreateExpense,
  onDeleteExpense
}) => {
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState({
    expenseType: 'project' as ExpenseType,
    category: 'Materials' as ExpenseCategory,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    projectId: projects[0]?.id || '',
    paymentMethod: 'cash' as 'cash' | 'bank',
    sourceId: bankAccounts[0]?.id || '',
    description: '',
    receiptNumber: ''
  });

  const filteredExpenses = expenses.filter(e => {
    const matchesSearch =
      e.category.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      (e.projectName && e.projectName.toLowerCase().includes(search.toLowerCase()));
    const matchesType = filterType === 'all' || e.expenseType === filterType;
    return matchesSearch && matchesType;
  });

  const totalAllExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalProjectExpenses = expenses.filter(e => e.expenseType === 'project').reduce((s, e) => s + (e.amount || 0), 0);
  const totalCompanyExpenses = expenses.filter(e => e.expenseType === 'company').reduce((s, e) => s + (e.amount || 0), 0);

  const handleOpenAdd = () => {
    setForm({
      expenseType: 'project',
      category: 'Materials',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      projectId: projects[0]?.id || '',
      paymentMethod: 'cash',
      sourceId: bankAccounts[0]?.id || '',
      description: '',
      receiptNumber: `EXP-${Date.now().toString().slice(-4)}`
    });
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0 || !form.category) return;

    const pr = projects.find(p => p.id === form.projectId);

    await onCreateExpense({
      expenseType: form.expenseType,
      category: form.category,
      amount: form.amount,
      date: form.date,
      projectId: form.expenseType === 'project' ? form.projectId : undefined,
      projectName: form.expenseType === 'project' && pr ? pr.name : undefined,
      paymentMethod: form.paymentMethod,
      sourceId: form.paymentMethod === 'bank' ? form.sourceId : undefined,
      description: form.description,
      receiptNumber: form.receiptNumber,
      createdBy: user?.name || 'Admin'
    });

    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <TrendingDown className="w-6 h-6 text-amber-500" />
            {t.expensesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.expensesSubtitle}
          </p>
        </div>

        <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
          {t.addExpense}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.totalExpenses}
          value={formatCurrency(totalAllExpenses, 'EGP', language)}
          subtitle={`${expenses.length} ${t.expenses.toLowerCase()}`}
          icon={<TrendingDown className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'مصروفات المواقع المباشرة' : 'Direct Project Expenses'}
          value={formatCurrency(totalProjectExpenses, 'EGP', language)}
          subtitle={isRTL ? 'تخصم مباشرة من ربحية المشاريع' : 'Directly deducts from job margin'}
          icon={<TrendingDown className="w-5 h-5" />}
          color="rose"
        />
        <StatCard
          title={isRTL ? 'المصروفات الإدارية للشركة (أوفرهيد)' : 'General Company Overhead'}
          value={formatCurrency(totalCompanyExpenses, 'EGP', language)}
          subtitle={isRTL ? 'إيجار، فواتير، رواتب إدارية' : 'Head office rent, utilities, overhead'}
          icon={<TrendingDown className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Table */}
      <Card className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder={isRTL ? 'بحث بالبيان أو التصنيف...' : 'Search description or category...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 text-xs">
            {['all', 'project', 'company'].map(tp => (
              <button
                key={tp}
                onClick={() => setFilterType(tp)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  filterType === tp
                    ? 'bg-amber-500 text-stone-950 font-bold'
                    : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
                }`}
              >
                {tp === 'all' ? t.all : tp === 'project' ? t.projectExpense : t.companyExpense}
              </button>
            ))}
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noExpensesYet}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{t.date}</th>
                  <th className="p-3">{t.expenseType}</th>
                  <th className="p-3">{t.category}</th>
                  <th className="p-3">{t.projects}</th>
                  <th className="p-3">{t.description}</th>
                  <th className="p-3">{t.paymentMethod}</th>
                  <th className="p-3">{t.amount}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {filteredExpenses.map(e => (
                  <tr key={e.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3">{formatDate(e.date, language)}</td>
                    <td className="p-3 font-sans">
                      <Badge variant={e.expenseType === 'project' ? 'warning' : 'draft'}>
                        {e.expenseType === 'project' ? t.projectExpense : t.companyExpense}
                      </Badge>
                    </td>
                    <td className="p-3 font-sans font-semibold text-stone-800 dark:text-stone-200">{e.category}</td>
                    <td className="p-3 font-sans text-stone-600 dark:text-stone-400">{e.projectName || '-'}</td>
                    <td className="p-3 font-sans text-stone-500">{e.description}</td>
                    <td className="p-3 font-sans uppercase text-[10px]">{e.paymentMethod}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(e.amount, 'EGP', language)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => setDeleteId(e.id)} className="p-1 hover:text-rose-500 text-stone-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Expense Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={t.addExpense}
        subtitle={isRTL ? 'تسجيل مصروف مع الخصم الفوري من الخزينة أو البنك' : 'Record expenditure and deduct from treasury'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t.expenseType}
              value={form.expenseType}
              onChange={e => setForm({ ...form, expenseType: e.target.value as ExpenseType })}
              options={[
                { value: 'project', label: t.projectExpense },
                { value: 'company', label: t.companyExpense }
              ]}
            />
            <Select
              label={t.category}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value as ExpenseCategory })}
              options={[
                { value: 'Materials', label: isRTL ? 'مواد وتوريدات' : 'Materials' },
                { value: 'Labor', label: isRTL ? 'عمالة ويوميات' : 'Labor' },
                { value: 'Equipment', label: isRTL ? 'إيجار وصيانة معدات' : 'Equipment' },
                { value: 'Transportation', label: isRTL ? 'نقل وتشوين' : 'Transportation' },
                { value: 'Rent', label: isRTL ? 'إيجار مقر' : 'Rent' },
                { value: 'Utilities', label: isRTL ? 'مرافق وكهرباء' : 'Utilities' },
                { value: 'Office', label: isRTL ? 'مصروفات مكتبية' : 'Office' },
                { value: 'Government Fees', label: isRTL ? 'رسوم وتراخيص حكومية' : 'Government Fees' },
                { value: 'Other', label: isRTL ? 'أخرى' : 'Other' }
              ]}
            />
          </div>

          {form.expenseType === 'project' && (
            <Select
              label={t.projects}
              required
              value={form.projectId}
              onChange={e => setForm({ ...form, projectId: e.target.value })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.amount + ' (EGP)'}
              type="number"
              required
              value={form.amount || ''}
              onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.date}
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t.paymentMethod}
              value={form.paymentMethod}
              onChange={e => setForm({ ...form, paymentMethod: e.target.value as any })}
              options={[
                { value: 'cash', label: isRTL ? 'الخزينة (نقدًا)' : 'Cashbox' },
                { value: 'bank', label: isRTL ? 'حساب بنكي' : 'Bank Account' }
              ]}
            />
            {form.paymentMethod === 'bank' ? (
              <Select
                label={isRTL ? 'الحساب البنكي' : 'Bank Account'}
                value={form.sourceId}
                onChange={e => setForm({ ...form, sourceId: e.target.value })}
                options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} (${b.accountNumber})` }))}
              />
            ) : (
              <Input
                label={t.receiptNumber}
                value={form.receiptNumber}
                onChange={e => setForm({ ...form, receiptNumber: e.target.value })}
              />
            )}
          </div>

          <Input
            label={t.description}
            required
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder={isRTL ? 'بيان وسبب الصرف...' : 'Expenditure details...'}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowAdd(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDeleteExpense(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
