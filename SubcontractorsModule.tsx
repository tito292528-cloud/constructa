import React, { useState } from 'react';
import { Hammer, Plus, Search, DollarSign, Phone, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import type { Subcontractor, SubcontractorContract, Project, BankAccount } from '../../types/index.ts';

interface SubcontractorsModuleProps {
  subcontractors: Subcontractor[];
  contracts: SubcontractorContract[];
  projects: Project[];
  bankAccounts: BankAccount[];
  onCreateSubcontractor: (sub: Omit<Subcontractor, 'id' | 'createdAt'>) => Promise<void>;
  onCreateContract: (contract: Omit<SubcontractorContract, 'id' | 'createdAt'>) => Promise<void>;
  onRecordPayment: (contractId: string, amount: number, paymentMethod: 'cash' | 'bank', sourceId: string, date: string) => Promise<void>;
}

export const SubcontractorsModule: React.FC<SubcontractorsModuleProps> = ({
  subcontractors,
  contracts,
  projects,
  bankAccounts,
  onCreateSubcontractor,
  onCreateContract,
  onRecordPayment
}) => {
  const { t, language, isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [showAddSub, setShowAddSub] = useState(false);
  const [showAddContract, setShowAddContract] = useState(false);
  const [paymentContract, setPaymentContract] = useState<SubcontractorContract | null>(null);

  const [subForm, setSubForm] = useState({
    name: '',
    company: '',
    phone: '',
    specialty: 'Electromechanical (MEP)'
  });

  const [contractForm, setContractForm] = useState({
    subcontractorId: subcontractors[0]?.id || '',
    projectId: projects[0]?.id || '',
    contractValue: 0,
    progress: 0,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  });

  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMethod: 'bank' as 'cash' | 'bank',
    sourceId: bankAccounts[0]?.id || '',
    date: new Date().toISOString().split('T')[0]
  });

  const totalContractsVal = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
  const totalPaidAll = contracts.reduce((s, c) => s + (c.paid || 0), 0);
  const totalPayables = contracts.reduce((s, c) => s + (c.remaining || 0), 0);

  const handleSaveSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subForm.name || !subForm.phone) return;
    await onCreateSubcontractor({
      ...subForm,
      totalContracts: 0,
      totalPaid: 0,
      currentBalance: 0
    });
    setShowAddSub(false);
  };

  const handleSaveContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractForm.subcontractorId || !contractForm.projectId || contractForm.contractValue <= 0) return;

    const sub = subcontractors.find(s => s.id === contractForm.subcontractorId);
    const pr = projects.find(p => p.id === contractForm.projectId);

    await onCreateContract({
      ...contractForm,
      subcontractorName: sub ? sub.name : '',
      projectName: pr ? pr.name : '',
      paid: 0,
      remaining: contractForm.contractValue
    });

    setShowAddContract(false);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentContract || payForm.amount <= 0) return;

    await onRecordPayment(
      paymentContract.id,
      payForm.amount,
      payForm.paymentMethod,
      payForm.sourceId,
      payForm.date
    );

    setPaymentContract(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Hammer className="w-6 h-6 text-amber-500" />
            {t.subcontractorsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.subcontractorsSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {subcontractors.length > 0 && projects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-4 h-4 text-amber-500" />}
              onClick={() => {
                setContractForm({
                  subcontractorId: subcontractors[0].id,
                  projectId: projects[0].id,
                  contractValue: 0,
                  progress: 0,
                  startDate: new Date().toISOString().split('T')[0],
                  endDate: '',
                  notes: ''
                });
                setShowAddContract(true);
              }}
            >
              {isRTL ? 'إسناد عقد باطن لمشروع' : 'Award Subcontract'}
            </Button>
          )}

          <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAddSub(true)}>
            {t.addSubcontractor}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي عقود مقاولي الباطن' : 'Total Subcontracts Value'}
          value={formatCurrency(totalContractsVal, 'EGP', language)}
          subtitle={`${contracts.length} ${isRTL ? 'عقود إسناد' : 'Agreements'}`}
          icon={<Hammer className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي المسدد لمقاولي الباطن' : 'Total Paid Out'}
          value={formatCurrency(totalPaidAll, 'EGP', language)}
          subtitle={isRTL ? 'دفعات مستخلصة' : 'Settled draws'}
          icon={<DollarSign className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'متبقي مستحقات مقاولي الباطن' : 'Payable Balances'}
          value={formatCurrency(totalPayables, 'EGP', language)}
          subtitle={isRTL ? 'ذمم دائنة واجبة السداد' : 'Outstanding subcontractor dues'}
          icon={<Hammer className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Subcontractor Contracts Table */}
      <Card className="space-y-4">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
          {isRTL ? 'عقود مقاولي الباطن بالمواقع والتقدم' : 'Active Subcontract Agreements & Progress'}
        </h3>

        {contracts.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {isRTL ? 'لا توجد عقود باطن مسجلة حالياً' : 'No subcontract agreements found'}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                <tr>
                  <th className="p-3">{isRTL ? 'المقاول' : 'Subcontractor'}</th>
                  <th className="p-3">{t.projects}</th>
                  <th className="p-3">{t.contractValue}</th>
                  <th className="p-3">{t.paid}</th>
                  <th className="p-3">{t.remaining}</th>
                  <th className="p-3">{t.progress}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {contracts.map(c => (
                  <tr key={c.id}>
                    <td className="p-3 font-sans font-bold text-stone-900 dark:text-stone-100">{c.subcontractorName}</td>
                    <td className="p-3 font-sans text-stone-600 dark:text-stone-400">{c.projectName}</td>
                    <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(c.contractValue, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.paid, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(c.remaining, 'EGP', language)}</td>
                    <td className="p-3 font-sans font-bold text-amber-500">{c.progress}%</td>
                    <td className="p-3 text-center font-sans">
                      {c.remaining > 0 && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setPaymentContract(c);
                            setPayForm({
                              amount: c.remaining,
                              paymentMethod: 'bank',
                              sourceId: bankAccounts[0]?.id || '',
                              date: new Date().toISOString().split('T')[0]
                            });
                          }}
                        >
                          {isRTL ? 'سداد دفعة' : 'Pay'}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add Subcontractor Modal */}
      <Modal
        isOpen={showAddSub}
        onClose={() => setShowAddSub(false)}
        title={t.addSubcontractor}
      >
        <form onSubmit={handleSaveSub} className="space-y-4">
          <Input
            label={isRTL ? 'اسم المقاول / المهني' : 'Contractor Name'}
            required
            value={subForm.name}
            onChange={e => setSubForm({ ...subForm, name: e.target.value })}
            placeholder="e.g. Delta Electromechanical"
          />
          <Input
            label={t.company}
            value={subForm.company}
            onChange={e => setSubForm({ ...subForm, company: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.phone}
              required
              value={subForm.phone}
              onChange={e => setSubForm({ ...subForm, phone: e.target.value })}
            />
            <Input
              label={t.specialty}
              value={subForm.specialty}
              onChange={e => setSubForm({ ...subForm, specialty: e.target.value })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowAddSub(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Contract Agreement Modal */}
      <Modal
        isOpen={showAddContract}
        onClose={() => setShowAddContract(false)}
        title={isRTL ? 'إسناد عقد باطن لمشروع' : 'Award Subcontract Agreement'}
      >
        <form onSubmit={handleSaveContract} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={isRTL ? 'مقاول الباطن' : 'Subcontractor'}
              value={contractForm.subcontractorId}
              onChange={e => setContractForm({ ...contractForm, subcontractorId: e.target.value })}
              options={subcontractors.map(s => ({ value: s.id, label: s.name }))}
            />
            <Select
              label={t.projects}
              value={contractForm.projectId}
              onChange={e => setContractForm({ ...contractForm, projectId: e.target.value })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.contractValue + ' (EGP)'}
              type="number"
              required
              value={contractForm.contractValue || ''}
              onChange={e => setContractForm({ ...contractForm, contractValue: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.progress + ' (%)'}
              type="number"
              min="0"
              max="100"
              value={contractForm.progress}
              onChange={e => setContractForm({ ...contractForm, progress: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowAddContract(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Pay Subcontractor Modal */}
      {paymentContract && (
        <Modal
          isOpen={!!paymentContract}
          onClose={() => setPaymentContract(null)}
          title={`${isRTL ? 'سداد مستحقات مقاول باطن' : 'Pay Subcontractor'}: ${paymentContract.subcontractorName}`}
        >
          <form onSubmit={handlePaySubmit} className="space-y-4">
            <Input
              label={t.amount + ' (EGP)'}
              type="number"
              required
              value={payForm.amount || ''}
              onChange={e => setPayForm({ ...payForm, amount: parseFloat(e.target.value) || 0 })}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                label={t.paymentMethod}
                value={payForm.paymentMethod}
                onChange={e => setPayForm({ ...payForm, paymentMethod: e.target.value as any })}
                options={[
                  { value: 'bank', label: isRTL ? 'تحويل بنكي' : 'Bank Transfer' },
                  { value: 'cash', label: isRTL ? 'نقدًا من الخزينة' : 'Cashbox' }
                ]}
              />
              <Input
                label={t.date}
                type="date"
                required
                value={payForm.date}
                onChange={e => setPayForm({ ...payForm, date: e.target.value })}
              />
            </div>
            {payForm.paymentMethod === 'bank' && (
              <Select
                label={isRTL ? 'الحساب البنكي' : 'Bank Account'}
                value={payForm.sourceId}
                onChange={e => setPayForm({ ...payForm, sourceId: e.target.value })}
                options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} (${b.accountNumber})` }))}
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <Button variant="outline" type="button" onClick={() => setPaymentContract(null)}>
                {t.cancel}
              </Button>
              <Button variant="primary" type="submit">
                {t.confirm}
              </Button>
            </div>
          </form>
        </Modal>
      )}

    </div>
  );
};
