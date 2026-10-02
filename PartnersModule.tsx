import React, { useState } from 'react';
import { 
  Scale, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  FileText, 
  Edit2, 
  Trash2, 
  DollarSign, 
  Check, 
  Calculator,
  Printer
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { 
  Partner, 
  PartnerTransaction, 
  PartnerTransactionType 
} from '../../types/index.ts';

interface PartnersModuleProps {
  partners: Partner[];
  transactions: PartnerTransaction[];
  onCreatePartner: (partner: Omit<Partner, 'id' | 'createdAt'>) => Promise<void>;
  onUpdatePartner: (id: string, updates: Partial<Partner>) => Promise<void>;
  onDeletePartner: (id: string) => Promise<void>;
  onCreateTransaction: (trans: Omit<PartnerTransaction, 'id' | 'createdAt'>) => Promise<void>;
}

export const PartnersModule: React.FC<PartnersModuleProps> = ({
  partners,
  transactions,
  onCreatePartner,
  onUpdatePartner,
  onDeletePartner,
  onCreateTransaction
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can, user } = useAuth();

  // Modals state
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [partnerToDelete, setPartnerToDelete] = useState<string | null>(null);
  const [selectedPartnerForLedger, setSelectedPartnerForLedger] = useState<Partner | null>(null);
  const [showNewTransactionModal, setShowNewTransactionModal] = useState(false);
  const [showProfitDistributeWizard, setShowProfitDistributeWizard] = useState(false);

  // Forms state
  const [partnerForm, setPartnerForm] = useState({
    name: '',
    nameAr: '',
    phone: '',
    email: '',
    ownershipPercentage: 0,
    profitSharePercentage: 0,
    lossSharePercentage: 0,
    capitalContribution: 0,
    notes: ''
  });

  const [transForm, setTransForm] = useState({
    partnerId: '',
    type: 'withdrawal' as PartnerTransactionType,
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    paymentMethod: 'bank' as 'cash' | 'bank',
    description: '',
    reference: ''
  });

  const [distributeAmount, setDistributeAmount] = useState<number>(500000);

  // Calculations
  const totalEquity = partners.reduce((sum, p) => sum + (p.ownershipPercentage || 0), 0);
  const totalProfitShare = partners.reduce((sum, p) => sum + (p.profitSharePercentage || 0), 0);
  const totalCapital = partners.reduce((sum, p) => sum + (p.capitalContribution || 0), 0);
  const totalCurrentBalances = partners.reduce((sum, p) => sum + (p.currentBalance || 0), 0);
  const totalWithdrawals = partners.reduce((sum, p) => sum + (p.totalWithdrawals || 0), 0);

  // Handlers
  const handleOpenAdd = () => {
    setPartnerForm({
      name: '',
      nameAr: '',
      phone: '',
      email: '',
      ownershipPercentage: 0,
      profitSharePercentage: 0,
      lossSharePercentage: 0,
      capitalContribution: 0,
      notes: ''
    });
    setEditingPartner(null);
    setShowAddPartner(true);
  };

  const handleOpenEdit = (p: Partner) => {
    setEditingPartner(p);
    setPartnerForm({
      name: p.name,
      nameAr: p.nameAr || '',
      phone: p.phone,
      email: p.email,
      ownershipPercentage: p.ownershipPercentage,
      profitSharePercentage: p.profitSharePercentage,
      lossSharePercentage: p.lossSharePercentage,
      capitalContribution: p.capitalContribution,
      notes: p.notes || ''
    });
    setShowAddPartner(true);
  };

  const handleSavePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerForm.name || partnerForm.ownershipPercentage <= 0) return;

    if (editingPartner) {
      await onUpdatePartner(editingPartner.id, partnerForm);
    } else {
      await onCreatePartner({
        ...partnerForm,
        currentBalance: partnerForm.capitalContribution,
        totalWithdrawals: 0
      });
    }
    setShowAddPartner(false);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transForm.partnerId || transForm.amount <= 0) return;

    const partner = partners.find(p => p.id === transForm.partnerId);
    await onCreateTransaction({
      ...transForm,
      partnerName: partner ? partner.name : ''
    });
    setShowNewTransactionModal(false);
  };

  const handleExecuteProfitDistribution = async () => {
    if (distributeAmount <= 0) return;
    const today = new Date().toISOString().split('T')[0];

    for (const partner of partners) {
      const share = (distributeAmount * (partner.profitSharePercentage || 0)) / 100;
      if (share > 0) {
        await onCreateTransaction({
          partnerId: partner.id,
          partnerName: partner.name,
          type: 'profit_distribution',
          amount: share,
          date: today,
          paymentMethod: 'bank',
          description: `Annual/Periodic Profit Distribution (${partner.profitSharePercentage}% share of ${formatCurrency(distributeAmount, 'EGP', language)})`,
          reference: 'PROFIT-DISTRIB'
        });
      }
    }
    setShowProfitDistributeWizard(false);
  };

  // Filter transactions for specific partner statement
  const partnerStatementTransactions = selectedPartnerForLedger
    ? transactions.filter(t => t.partnerId === selectedPartnerForLedger.id)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Scale className="w-6 h-6 text-amber-500" />
            {t.partnersTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.partnersSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {can('distribute_profits') && (
            <Button
              variant="outline"
              size="sm"
              icon={<Calculator className="w-4 h-4 text-amber-500" />}
              onClick={() => setShowProfitDistributeWizard(true)}
            >
              {t.distributeProfit}
            </Button>
          )}

          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowDownCircle className="w-4 h-4 text-emerald-400" />}
            onClick={() => {
              if (partners.length > 0) {
                setTransForm({
                  partnerId: partners[0].id,
                  type: 'withdrawal',
                  amount: 0,
                  date: new Date().toISOString().split('T')[0],
                  paymentMethod: 'bank',
                  description: '',
                  reference: ''
                });
                setShowNewTransactionModal(true);
              }
            }}
          >
            {t.newPartnerTransaction}
          </Button>

          {can('manage_partners') && (
            <Button
              variant="gold"
              size="sm"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleOpenAdd}
            >
              {t.addPartner}
            </Button>
          )}
        </div>
      </div>

      {/* Equity & Balance Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي رأس المال المكتتب' : 'Total Contributed Capital'}
          value={formatCurrency(totalCapital, 'EGP', language)}
          subtitle={`${partners.length} ${isRTL ? 'شركاء مسجلين' : 'Registered Partners'}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="amber"
        />

        <StatCard
          title={isRTL ? 'أرصدة الحسابات الجارية' : 'Current Ledger Balances'}
          value={formatCurrency(totalCurrentBalances, 'EGP', language)}
          subtitle={isRTL ? 'صافي مستحقات الشركاء' : 'Net equity dues'}
          icon={<Scale className="w-5 h-5" />}
          color="emerald"
        />

        <StatCard
          title={isRTL ? 'إجمالي المسحوبات (الدفعات)' : 'Total Partner Withdrawals'}
          value={formatCurrency(totalWithdrawals, 'EGP', language)}
          subtitle={isRTL ? 'مسحوبات أرباح شخصية' : 'Drawings taken'}
          icon={<TrendingDown className="w-5 h-5" />}
          color="rose"
        />

        <StatCard
          title={isRTL ? 'مطابقة حصص الشراكة' : 'Equity Allocation Sync'}
          value={`${totalEquity}% / ${totalProfitShare}%`}
          subtitle={isRTL ? 'نسبة الملكية / نسبة الأرباح' : 'Ownership % vs Profit Share %'}
          icon={<Check className="w-5 h-5" />}
          color={totalEquity === 100 && totalProfitShare === 100 ? 'emerald' : 'amber'}
        />
      </div>

      {/* Warning alert if percentages don't add to 100% */}
      {(totalEquity !== 100 || totalProfitShare !== 100) && partners.length > 0 && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between">
          <span>
            {isRTL 
              ? `تنبيه تدقيق: مجموع نسب الملكية الحالية (${totalEquity}%) أو نسب الأرباح (${totalProfitShare}%) لا تساوي 100%. يرجى مراجعة حصص الشركاء.`
              : `Audit Note: Total ownership (${totalEquity}%) or profit share (${totalProfitShare}%) does not equal 100%. Please verify partner quotas.`}
          </span>
        </div>
      )}

      {/* Partners Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {partners.map(partner => (
          <Card key={partner.id} className="space-y-4 relative overflow-hidden" hoverEffect>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isRTL && partner.nameAr ? partner.nameAr : partner.name}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-mono mt-0.5">
                  {partner.phone} {partner.email ? `• ${partner.email}` : ''}
                </p>
              </div>
              <Badge variant="gold">
                {partner.ownershipPercentage}% {isRTL ? 'حصة ملكية' : 'Equity'}
              </Badge>
            </div>

            {/* Percentage Comparison bars */}
            <div className="space-y-2 pt-1 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-stone-500 dark:text-stone-400">{t.ownershipPercentage}</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100">{partner.ownershipPercentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: `${partner.ownershipPercentage}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-stone-500 dark:text-stone-400">{t.profitSharePercentage}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{partner.profitSharePercentage}%</span>
                </div>
                <div className="h-1.5 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${partner.profitSharePercentage}%` }} />
                </div>
              </div>
            </div>

            {/* Balances Strip */}
            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs">
              <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                <span className="text-[10px] text-stone-400 block">{t.capitalContribution}</span>
                <span className="font-bold text-stone-900 dark:text-stone-100 font-mono text-xs">
                  {formatCurrency(partner.capitalContribution, 'EGP', language)}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                <span className="text-[10px] text-stone-400 block">{t.currentBalance}</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-xs">
                  {formatCurrency(partner.currentBalance, 'EGP', language)}
                </span>
              </div>
            </div>

            {/* Withdrawals & Notes */}
            <div className="text-xs text-stone-500 dark:text-stone-400 space-y-1">
              <p>
                {t.totalWithdrawals}: <strong className="text-rose-600 dark:text-rose-400 font-mono">{formatCurrency(partner.totalWithdrawals, 'EGP', language)}</strong>
              </p>
              {partner.notes && (
                <p className="text-[11px] italic text-stone-400 truncate">
                  "{partner.notes}"
                </p>
              )}
            </div>

            {/* Card Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-stone-200 dark:border-stone-800">
              <Button
                variant="outline"
                size="sm"
                icon={<FileText className="w-3.5 h-3.5" />}
                onClick={() => setSelectedPartnerForLedger(partner)}
              >
                {t.statement}
              </Button>

              <div className="flex items-center gap-1">
                {can('manage_partners') && (
                  <>
                    <button
                      onClick={() => handleOpenEdit(partner)}
                      className="p-1.5 text-stone-400 hover:text-amber-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title={t.edit}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPartnerToDelete(partner.id)}
                      className="p-1.5 text-stone-400 hover:text-rose-500 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                      title={t.delete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>

          </Card>
        ))}
      </div>

      {/* Add / Edit Partner Modal */}
      <Modal
        isOpen={showAddPartner}
        onClose={() => setShowAddPartner(false)}
        title={editingPartner ? t.edit : t.addPartner}
        subtitle={isRTL ? 'إدخال بيانات الشريك والنسب القانونية وحصته في رأس المال' : 'Enter partner equity and profit sharing parameters'}
      >
        <form onSubmit={handleSavePartner} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.partnerName + ' (English)'}
              required
              value={partnerForm.name}
              onChange={e => setPartnerForm({ ...partnerForm, name: e.target.value })}
              placeholder="e.g. Eng. Ahmed El-Sayed"
            />
            <Input
              label={t.partnerName + ' (العربية)'}
              value={partnerForm.nameAr}
              onChange={e => setPartnerForm({ ...partnerForm, nameAr: e.target.value })}
              placeholder="مثال: م. أحمد السيد"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.phone}
              required
              value={partnerForm.phone}
              onChange={e => setPartnerForm({ ...partnerForm, phone: e.target.value })}
              placeholder="+20 100 000 0000"
            />
            <Input
              label={t.email}
              type="email"
              value={partnerForm.email}
              onChange={e => setPartnerForm({ ...partnerForm, email: e.target.value })}
              placeholder="partner@company.eg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.ownershipPercentage}
              type="number"
              step="0.01"
              required
              value={partnerForm.ownershipPercentage || ''}
              onChange={e => setPartnerForm({ ...partnerForm, ownershipPercentage: parseFloat(e.target.value) || 0 })}
              placeholder="40"
              helperText={isRTL ? 'نسبة رأس المال والملكية' : 'Capital equity stake'}
            />
            <Input
              label={t.profitSharePercentage}
              type="number"
              step="0.01"
              required
              value={partnerForm.profitSharePercentage || ''}
              onChange={e => setPartnerForm({ ...partnerForm, profitSharePercentage: parseFloat(e.target.value) || 0 })}
              placeholder="50"
              helperText={isRTL ? 'يمكن أن تختلف عن نسبة الملكية' : 'Can differ from equity %'}
            />
            <Input
              label={t.lossSharePercentage}
              type="number"
              step="0.01"
              value={partnerForm.lossSharePercentage || ''}
              onChange={e => setPartnerForm({ ...partnerForm, lossSharePercentage: parseFloat(e.target.value) || 0 })}
              placeholder="40"
            />
          </div>

          <Input
            label={t.capitalContribution + ' (EGP)'}
            type="number"
            value={partnerForm.capitalContribution || ''}
            onChange={e => setPartnerForm({ ...partnerForm, capitalContribution: parseFloat(e.target.value) || 0 })}
            placeholder="4000000"
          />

          <Input
            label={t.notes}
            value={partnerForm.notes}
            onChange={e => setPartnerForm({ ...partnerForm, notes: e.target.value })}
            placeholder={isRTL ? 'ملاحظات حول الشريك، دوره الإداري...' : 'Partner administrative role, notes...'}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowAddPartner(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* New Partner Transaction Modal */}
      <Modal
        isOpen={showNewTransactionModal}
        onClose={() => setShowNewTransactionModal(false)}
        title={t.newPartnerTransaction}
        subtitle={isRTL ? 'تسجيل سحب أرباح، إيداع رأسمال، أو مصاريف مسددة' : 'Record withdrawals, deposits, or expenses paid'}
      >
        <form onSubmit={handleSaveTransaction} className="space-y-4">
          <Select
            label={t.partnerName}
            required
            value={transForm.partnerId}
            onChange={e => setTransForm({ ...transForm, partnerId: e.target.value })}
            options={partners.map(p => ({
              value: p.id,
              label: `${isRTL && p.nameAr ? p.nameAr : p.name} (${p.ownershipPercentage}%)`
            }))}
          />

          <Select
            label={t.transactionType}
            required
            value={transForm.type}
            onChange={e => setTransForm({ ...transForm, type: e.target.value as PartnerTransactionType })}
            options={[
              { value: 'withdrawal', label: t.withdrawal },
              { value: 'capital_contribution', label: t.capital_contribution },
              { value: 'expense_paid_on_behalf', label: t.expense_paid_on_behalf },
              { value: 'money_received', label: t.money_received },
              { value: 'profit_distribution', label: t.profit_distribution },
              { value: 'other', label: t.other }
            ]}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.amount + ' (EGP)'}
              type="number"
              required
              value={transForm.amount || ''}
              onChange={e => setTransForm({ ...transForm, amount: parseFloat(e.target.value) || 0 })}
              placeholder="100000"
            />
            <Input
              label={t.date}
              type="date"
              required
              value={transForm.date}
              onChange={e => setTransForm({ ...transForm, date: e.target.value })}
            />
          </div>

          <Select
            label={t.paymentMethod}
            value={transForm.paymentMethod}
            onChange={e => setTransForm({ ...transForm, paymentMethod: e.target.value as 'cash' | 'bank' })}
            options={[
              { value: 'bank', label: t.bank },
              { value: 'cash', label: t.cash }
            ]}
          />

          <Input
            label={t.description}
            value={transForm.description}
            onChange={e => setTransForm({ ...transForm, description: e.target.value })}
            placeholder={isRTL ? 'البيان وسبب العملية' : 'Transaction notes / reason'}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowNewTransactionModal(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.confirm}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Distribute Profits Wizard Modal */}
      <Modal
        isOpen={showProfitDistributeWizard}
        onClose={() => setShowProfitDistributeWizard(false)}
        title={t.distributeProfit}
        subtitle={isRTL ? 'معالج توزيع الأرباح النقدية آلياً وفقاً لنسب الشراكة المعتمدة' : 'Calculate and disburse profit distributions according to profit quotas'}
      >
        <div className="space-y-4">
          <Input
            label={isRTL ? 'إجمالي الأرباح المراد توزيعها (EGP)' : 'Total Profit to Distribute (EGP)'}
            type="number"
            value={distributeAmount || ''}
            onChange={e => setDistributeAmount(parseFloat(e.target.value) || 0)}
          />

          {/* Distribution Preview Table */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-hidden">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{t.partnerName}</th>
                  <th className="p-3">{t.profitSharePercentage}</th>
                  <th className="p-3">{isRTL ? 'مبلغ التوزيع المستحق' : 'Entitled Profit Share'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {partners.map(p => {
                  const share = (distributeAmount * (p.profitSharePercentage || 0)) / 100;
                  return (
                    <tr key={p.id}>
                      <td className="p-3 font-semibold text-stone-900 dark:text-stone-100">
                        {isRTL && p.nameAr ? p.nameAr : p.name}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-500">
                        {p.profitSharePercentage}%
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(share, 'EGP', language)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" onClick={() => setShowProfitDistributeWizard(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" onClick={handleExecuteProfitDistribution}>
              {isRTL ? 'تأكيد وترحيل التوزيع لدفاتر الشركاء' : 'Confirm & Post to Partner Ledgers'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Partner Statement Modal */}
      {selectedPartnerForLedger && (
        <Modal
          isOpen={!!selectedPartnerForLedger}
          onClose={() => setSelectedPartnerForLedger(null)}
          title={`${t.partnerStatement}: ${isRTL && selectedPartnerForLedger.nameAr ? selectedPartnerForLedger.nameAr : selectedPartnerForLedger.name}`}
          subtitle={`${selectedPartnerForLedger.ownershipPercentage}% Equity • ${selectedPartnerForLedger.profitSharePercentage}% Profit Share`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            
            {/* Statement Header Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs">
              <div>
                <span className="text-stone-400 block">{t.capitalContribution}</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100 font-mono">
                  {formatCurrency(selectedPartnerForLedger.capitalContribution, 'EGP', language)}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">{t.totalWithdrawals}</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                  {formatCurrency(selectedPartnerForLedger.totalWithdrawals, 'EGP', language)}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">{t.currentBalance}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  {formatCurrency(selectedPartnerForLedger.currentBalance, 'EGP', language)}
                </span>
              </div>
            </div>

            {/* Transactions Ledger Table */}
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="p-3">{t.date}</th>
                    <th className="p-3">{t.transactionType}</th>
                    <th className="p-3">{t.description}</th>
                    <th className="p-3">{t.paymentMethod}</th>
                    <th className="p-3">{isRTL ? 'إيداع / ربح (+)' : 'Credit (+)'}</th>
                    <th className="p-3">{isRTL ? 'مسحوب (-)' : 'Debit (-)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                  {partnerStatementTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-stone-400 font-sans">
                        {t.noData}
                      </td>
                    </tr>
                  ) : (
                    partnerStatementTransactions.map(tx => {
                      const isCredit = tx.type === 'capital_contribution' || tx.type === 'expense_paid_on_behalf' || tx.type === 'profit_distribution';
                      return (
                        <tr key={tx.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/30">
                          <td className="p-3">{formatDate(tx.date, language)}</td>
                          <td className="p-3 font-sans">
                            <span className="font-semibold text-stone-800 dark:text-stone-200">
                              {t[tx.type as keyof typeof t] || tx.type}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-stone-600 dark:text-stone-400">
                            {tx.description || '-'}
                          </td>
                          <td className="p-3 font-sans uppercase text-[10px]">
                            {tx.paymentMethod}
                          </td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {isCredit ? formatCurrency(tx.amount, 'EGP', language) : '-'}
                          </td>
                          <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                            {!isCredit ? formatCurrency(tx.amount, 'EGP', language) : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Print button */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="w-4 h-4" />}
                onClick={() => window.print()}
              >
                {t.print}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setSelectedPartnerForLedger(null)}>
                {t.close}
              </Button>
            </div>

          </div>
        </Modal>
      )}

      {/* Confirm Delete Partner Dialog */}
      <ConfirmDialog
        isOpen={!!partnerToDelete}
        onClose={() => setPartnerToDelete(null)}
        onConfirm={() => {
          if (partnerToDelete) onDeletePartner(partnerToDelete);
        }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
        cancelText={t.cancel}
      />

    </div>
  );
};
