import React, { useState } from 'react';
import { Landmark, Plus, Search, ArrowRightLeft, FileText, Printer, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import type { BankAccount, BankTransaction } from '../../types/index.ts';

interface BanksModuleProps {
  bankAccounts: BankAccount[];
  bankTransactions: BankTransaction[];
  onCreateBankAccount: (bank: Omit<BankAccount, 'id' | 'createdAt'>) => Promise<void>;
  onCreateBankTransaction: (data: Omit<BankTransaction, 'id' | 'balanceAfter' | 'createdAt'>) => Promise<void>;
  onTransferFunds: (sourceBankId: string, destBankId: string, amount: number, date: string, desc: string) => Promise<void>;
}

export const BanksModule: React.FC<BanksModuleProps> = ({
  bankAccounts,
  bankTransactions,
  onCreateBankAccount,
  onCreateBankTransaction,
  onTransferFunds
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [showAddBank, setShowAddBank] = useState(false);
  const [showNewTrans, setShowNewTrans] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [statementBank, setStatementBank] = useState<BankAccount | null>(null);

  // Bank Form
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    openingBalance: 0,
    currency: 'EGP'
  });

  // Transaction Form
  const [txForm, setTxForm] = useState({
    bankId: bankAccounts[0]?.id || '',
    type: 'deposit' as 'deposit' | 'withdrawal',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: '',
    reference: `BNK-${Date.now().toString().slice(-4)}`
  });

  // Transfer Form
  const [transForm, setTransForm] = useState({
    sourceBankId: bankAccounts[0]?.id || '',
    destBankId: bankAccounts[1]?.id || '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    description: 'Inter-bank Account Transfer'
  });

  const totalBankBalances = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

  const handleSaveBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankForm.bankName || !bankForm.accountNumber) return;

    await onCreateBankAccount({
      ...bankForm,
      currentBalance: bankForm.openingBalance
    });

    setShowAddBank(false);
  };

  const handleSaveTrans = async (e: React.FormEvent) => {
    e.preventDefault();
    if (txForm.amount <= 0 || !txForm.bankId) return;

    const source = bankAccounts.find(b => b.id === txForm.bankId);
    if (txForm.type === 'withdrawal' && source && txForm.amount > source.currentBalance) {
      alert(isRTL ? 'الرصيد في هذا البنك لا يكفي لإتمام عملية السحب!' : 'Insufficient bank balance!');
      return;
    }

    await onCreateBankTransaction(txForm);
    setShowNewTrans(false);
  };

  const handleSaveTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (transForm.amount <= 0 || !transForm.sourceBankId || !transForm.destBankId) return;
    if (transForm.sourceBankId === transForm.destBankId) {
      alert(isRTL ? 'لا يمكن التحويل لنفس الحساب!' : 'Cannot transfer to the same account!');
      return;
    }

    const source = bankAccounts.find(b => b.id === transForm.sourceBankId);
    if (source && transForm.amount > source.currentBalance) {
      alert(isRTL ? 'رصيد الحساب المصدر لا يكفي للتحويل!' : 'Insufficient balance in source account!');
      return;
    }

    await onTransferFunds(
      transForm.sourceBankId,
      transForm.destBankId,
      transForm.amount,
      transForm.date,
      transForm.description
    );

    setShowTransfer(false);
  };

  const bankStatementTransactions = statementBank
    ? bankTransactions.filter(t => t.bankId === statementBank.id)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-amber-500" />
            {t.banksTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.banksSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {bankAccounts.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              icon={<ArrowRightLeft className="w-4 h-4 text-blue-500" />}
              onClick={() => setShowTransfer(true)}
            >
              {t.transferBetweenBanks}
            </Button>
          )}

          {bankAccounts.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<Plus className="w-4 h-4 text-emerald-400" />}
              onClick={() => setShowNewTrans(true)}
            >
              {t.deposit} / {t.withdraw}
            </Button>
          )}

          {can('manage_banks') && (
            <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddBank(true)}>
              {t.addBankAccount}
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.bankBalance}
          value={formatCurrency(totalBankBalances, 'EGP', language)}
          subtitle={`${bankAccounts.length} ${t.banks.toLowerCase()}`}
          icon={<Landmark className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي الإيداعات' : 'Total Bank Deposits'}
          value={formatCurrency(bankTransactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0), 'EGP', language)}
          subtitle={isRTL ? 'تحصيلات المستخلصات ورأس المال' : 'Collections & equity'}
          icon={<ArrowDownLeft className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'إجمالي المسحوبات والشيكات' : 'Total Withdrawals'}
          value={formatCurrency(bankTransactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0), 'EGP', language)}
          subtitle={isRTL ? 'سداد التوريدات والمصروفات' : 'Vendor & expense checks'}
          icon={<ArrowUpRight className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map(b => (
          <Card key={b.id} className="space-y-4 hover:border-amber-500/50 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">{b.bankName}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                  {b.accountNumber}
                </p>
              </div>
              <Badge variant="gold">
                {b.currency || 'EGP'}
              </Badge>
            </div>

            <div className="p-3.5 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 space-y-1">
              <span className="text-[10px] text-stone-400 block uppercase font-bold">{t.currentBalance}</span>
              <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
                {formatCurrency(b.currentBalance, b.currency || 'EGP', language)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-stone-500 pt-2 border-t border-stone-200 dark:border-stone-800">
              <span>{isRTL ? 'الرصيد الافتتاحي:' : 'Opening Bal:'} <strong className="font-mono">{formatCurrency(b.openingBalance, 'EGP', language)}</strong></span>
              <Button
                variant="outline"
                size="sm"
                icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => setStatementBank(b)}
              >
                {t.statement}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Bank Modal */}
      <Modal
        isOpen={showAddBank}
        onClose={() => setShowAddBank(false)}
        title={t.addBankAccount}
      >
        <form onSubmit={handleSaveBank} className="space-y-4">
          <Input
            label={t.bankName}
            required
            value={bankForm.bankName}
            onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
            placeholder="e.g. Commercial International Bank (CIB)"
          />
          <Input
            label={t.accountName}
            required
            value={bankForm.accountName}
            onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
            placeholder="e.g. Al-Rowad Operations"
          />
          <Input
            label={t.accountNumber}
            required
            value={bankForm.accountNumber}
            onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
            placeholder="1000-4829-1029"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.openingBalance}
              type="number"
              value={bankForm.openingBalance || ''}
              onChange={e => setBankForm({ ...bankForm, openingBalance: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.currency}
              value={bankForm.currency}
              onChange={e => setBankForm({ ...bankForm, currency: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowAddBank(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deposit / Withdrawal Modal */}
      <Modal
        isOpen={showNewTrans}
        onClose={() => setShowNewTrans(false)}
        title={txForm.type === 'deposit' ? t.deposit : t.withdraw}
      >
        <form onSubmit={handleSaveTrans} className="space-y-4">
          <Select
            label={t.banks}
            value={txForm.bankId}
            onChange={e => setTxForm({ ...txForm, bankId: e.target.value })}
            options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} (${b.accountNumber})` }))}
          />
          <Select
            label={t.transactionType}
            value={txForm.type}
            onChange={e => setTxForm({ ...txForm, type: e.target.value as any })}
            options={[
              { value: 'deposit', label: t.deposit },
              { value: 'withdrawal', label: t.withdraw }
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.amount + ' (EGP)'}
              type="number"
              required
              value={txForm.amount || ''}
              onChange={e => setTxForm({ ...txForm, amount: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.date}
              type="date"
              required
              value={txForm.date}
              onChange={e => setTxForm({ ...txForm, date: e.target.value })}
            />
          </div>
          <Input
            label={t.description}
            required
            value={txForm.description}
            onChange={e => setTxForm({ ...txForm, description: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowNewTrans(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Transfer Between Banks Modal */}
      <Modal
        isOpen={showTransfer}
        onClose={() => setShowTransfer(false)}
        title={t.transferBetweenBanks}
      >
        <form onSubmit={handleSaveTransfer} className="space-y-4">
          <Select
            label={isRTL ? 'من الحساب (المصدر)' : 'From Account (Source)'}
            value={transForm.sourceBankId}
            onChange={e => setTransForm({ ...transForm, sourceBankId: e.target.value })}
            options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} (${formatCurrency(b.currentBalance, 'EGP', language)})` }))}
          />
          <Select
            label={isRTL ? 'إلى الحساب (الوجهة)' : 'To Account (Destination)'}
            value={transForm.destBankId}
            onChange={e => setTransForm({ ...transForm, destBankId: e.target.value })}
            options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} (${formatCurrency(b.currentBalance, 'EGP', language)})` }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.amount + ' (EGP)'}
              type="number"
              required
              value={transForm.amount || ''}
              onChange={e => setTransForm({ ...transForm, amount: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.date}
              type="date"
              required
              value={transForm.date}
              onChange={e => setTransForm({ ...transForm, date: e.target.value })}
            />
          </div>

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

      {/* Bank Statement Modal */}
      {statementBank && (
        <Modal
          isOpen={!!statementBank}
          onClose={() => setStatementBank(null)}
          title={`${isRTL ? 'كشف حساب مصرفي' : 'Bank Statement'}: ${statementBank.bankName}`}
          subtitle={`${statementBank.accountNumber} • ${statementBank.accountName}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-stone-400 block font-sans">{t.openingBalance}</span>
                <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(statementBank.openingBalance, 'EGP', language)}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans">{t.currentBalance}</span>
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400">{formatCurrency(statementBank.currentBalance, 'EGP', language)}</span>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                  <tr>
                    <th className="p-3">{t.date}</th>
                    <th className="p-3">{t.description}</th>
                    <th className="p-3">{isRTL ? 'إيداع (+)' : 'Deposit (+)'}</th>
                    <th className="p-3">{isRTL ? 'سحب (-)' : 'Withdrawal (-)'}</th>
                    <th className="p-3">{isRTL ? 'الرصيد بعد الحركة' : 'Balance After'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                  {bankStatementTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-stone-400 font-sans">{t.noData}</td>
                    </tr>
                  ) : (
                    bankStatementTransactions.map(tx => (
                      <tr key={tx.id}>
                        <td className="p-3">{formatDate(tx.date, language)}</td>
                        <td className="p-3 font-sans text-stone-800 dark:text-stone-200">{tx.description}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                          {tx.type === 'deposit' ? formatCurrency(tx.amount, 'EGP', language) : '-'}
                        </td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                          {tx.type === 'withdrawal' || tx.type === 'transfer' ? formatCurrency(tx.amount, 'EGP', language) : '-'}
                        </td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(tx.balanceAfter, 'EGP', language)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                {t.print}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setStatementBank(null)}>
                {t.close}
              </Button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
};
