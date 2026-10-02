import React, { useState } from 'react';
import { Wallet, Plus, ArrowDownLeft, ArrowUpRight, ArrowRightLeft, Search, Calendar, FileText } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import type { CashTransaction, BankAccount } from '../../types/index.ts';

interface CashboxModuleProps {
  transactions: CashTransaction[];
  bankAccounts: BankAccount[];
  onCreateTransaction: (data: Omit<CashTransaction, 'id' | 'balanceAfter' | 'createdAt'>) => Promise<void>;
  onTransferToBank: (bankId: string, amount: number, date: string, desc: string) => Promise<void>;
}

export const CashboxModule: React.FC<CashboxModuleProps> = ({
  transactions,
  bankAccounts,
  onCreateTransaction,
  onTransferToBank
}) => {
  const { t, language, isRTL } = useLanguage();
  const { user } = useAuth();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);

  const [form, setForm] = useState({
    type: 'in' as 'in' | 'out',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    category: 'Petty Cash',
    reference: `CSH-${Date.now().toString().slice(-4)}`
  });

  const [transferForm, setTransferForm] = useState({
    bankId: bankAccounts[0]?.id || '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: 'Cashbox to Bank Deposit'
  });

  const currentBalance = transactions.length > 0 ? transactions[0].balanceAfter : 0;
  const totalInflow = transactions.filter(t => t.type === 'in').reduce((s, t) => s + t.amount, 0);
  const totalOutflow = transactions.filter(t => t.type === 'out' || t.type === 'transfer').reduce((s, t) => s + t.amount, 0);

  const filtered = transactions.filter(tx =>
    tx.description.toLowerCase().includes(search.toLowerCase()) ||
    (tx.reference && tx.reference.toLowerCase().includes(search.toLowerCase())) ||
    tx.user.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) return;

    if (form.type === 'out' && form.amount > currentBalance) {
      alert(isRTL ? 'رصيد الخزينة الحالي لا يكفي لإتمام هذا الصرف!' : 'Insufficient cashbox balance!');
      return;
    }

    await onCreateTransaction({
      type: form.type,
      amount: form.amount,
      date: form.date,
      description: form.description,
      category: form.category,
      reference: form.reference,
      user: user?.name || 'Cashier'
    });

    setShowAdd(false);
  };

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transferForm.amount <= 0 || !transferForm.bankId) return;

    if (transferForm.amount > currentBalance) {
      alert(isRTL ? 'رصيد الخزينة الحالي لا يكفي للتحويل إلى البنك!' : 'Insufficient cashbox balance for transfer!');
      return;
    }

    await onTransferToBank(
      transferForm.bankId,
      transferForm.amount,
      transferForm.date,
      transferForm.description
    );

    setShowTransfer(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-amber-500" />
            {t.cashboxTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.cashboxSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {bankAccounts.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRightLeft className="w-4 h-4 text-blue-500" />}
              onClick={() => setShowTransfer(true)}
            >
              {t.transferToBank}
            </Button>
          )}

          <Button
            variant="gold"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              setForm({
                type: 'in',
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                description: '',
                category: 'Petty Cash',
                reference: `CSH-${Date.now().toString().slice(-4)}`
              });
              setShowAdd(true);
            }}
          >
            {t.recordCashIn} / {t.recordCashOut}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.cashBalance}
          value={formatCurrency(currentBalance, 'EGP', language)}
          subtitle={isRTL ? 'السيولة الفعلية الحالية بالخزينة' : 'Current liquid cash balance'}
          icon={<Wallet className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي المقبوضات (وارد)' : 'Total Cash Inflow'}
          value={formatCurrency(totalInflow, 'EGP', language)}
          subtitle={isRTL ? 'إيداعات، سداد عملاء، عهد' : 'Deposits & receipts'}
          icon={<ArrowDownLeft className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'إجمالي المدفوعات (صرف)' : 'Total Cash Outflow'}
          value={formatCurrency(totalOutflow, 'EGP', language)}
          subtitle={isRTL ? 'مصروفات نقدية، تحويل لبنوك' : 'Disbursements & bank transfers'}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Ledger Table */}
      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث برقم السند أو البيان...' : 'Search voucher or memo...'}
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
                  <th className="p-3">{t.date}</th>
                  <th className="p-3">{t.reference}</th>
                  <th className="p-3">{t.description}</th>
                  <th className="p-3">{t.category}</th>
                  <th className="p-3">{isRTL ? 'المستخدم المسؤول' : 'Handled By'}</th>
                  <th className="p-3 text-emerald-600">{isRTL ? 'وارد (+)' : 'Inflow (+)'}</th>
                  <th className="p-3 text-rose-600">{isRTL ? 'منصرف (-)' : 'Outflow (-)'}</th>
                  <th className="p-3">{isRTL ? 'الرصيد بعد الحركة' : 'Balance After'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {filtered.map(tx => (
                  <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3">{formatDate(tx.date, language)}</td>
                    <td className="p-3 font-bold text-amber-500">{tx.reference || '-'}</td>
                    <td className="p-3 font-sans font-medium text-stone-900 dark:text-stone-100">{tx.description}</td>
                    <td className="p-3 font-sans text-stone-500">{tx.category || '-'}</td>
                    <td className="p-3 font-sans text-stone-400">{tx.user}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                      {tx.type === 'in' ? formatCurrency(tx.amount, 'EGP', language) : '-'}
                    </td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                      {tx.type === 'out' || tx.type === 'transfer' ? formatCurrency(tx.amount, 'EGP', language) : '-'}
                    </td>
                    <td className="p-3 font-bold text-stone-900 dark:text-stone-100">
                      {formatCurrency(tx.balanceAfter, 'EGP', language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record In/Out Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={form.type === 'in' ? t.recordCashIn : t.recordCashOut}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label={t.transactionType}
            value={form.type}
            onChange={e => setForm({ ...form, type: e.target.value as any })}
            options={[
              { value: 'in', label: t.recordCashIn },
              { value: 'out', label: t.recordCashOut }
            ]}
          />

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
            <Input
              label={t.category}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value })}
            />
            <Input
              label={t.reference}
              value={form.reference}
              onChange={e => setForm({ ...form, reference: e.target.value })}
            />
          </div>

          <Input
            label={t.description}
            required
            value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
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

      {/* Transfer to Bank Modal */}
      <Modal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        title={t.transferToBank}
        subtitle={isRTL ? 'إيداع نقدية من الخزينة بحساب الشركة البنكي' : 'Deposit physical cash into bank account'}
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Select
            label={isRTL ? 'الحساب البنكي المودع به' : 'Target Bank Account'}
            required
            value={transferForm.bankId}
            onChange={e => setTransferForm({ ...transferForm, bankId: e.target.value })}
            options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} - ${b.accountNumber} (${formatCurrency(b.currentBalance, 'EGP', language)})` }))}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.amount + ' (EGP)'}
              type="number"
              required
              value={transferForm.amount || ''}
              onChange={e => setTransferForm({ ...transferForm, amount: parseFloat(e.target.value) || 0 })}
              helperText={`${isRTL ? 'الرصيد المتاح:' : 'Available:'} ${formatCurrency(currentBalance, 'EGP', language)}`}
            />
            <Input
              label={t.date}
              type="date"
              required
              value={transferForm.date}
              onChange={e => setTransferForm({ ...transferForm, date: e.target.value })}
            />
          </div>

          <Input
            label={t.description}
            value={transferForm.description}
            onChange={e => setTransferForm({ ...transferForm, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowTransfer(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.confirm}
            </Button>
          </div>
        </form>
      </Modal>

    </div>
  );
};
