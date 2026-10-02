import React, { useState } from 'react';
import { FileText, Plus, Search, Building2, Calendar, ShieldCheck, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { Contract, Project, Client } from '../../types/index.ts';

interface ContractsModuleProps {
  contracts: Contract[];
  projects: Project[];
  clients: Client[];
  onCreateContract: (contract: Omit<Contract, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateContract: (id: string, updates: Partial<Contract>) => Promise<void>;
  onDeleteContract: (id: string) => Promise<void>;
}

export const ContractsModule: React.FC<ContractsModuleProps> = ({
  contracts,
  projects,
  clients,
  onCreateContract,
  onUpdateContract,
  onDeleteContract
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [showAdd, setShowAdd] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({
    contractNumber: '',
    clientId: '',
    clientName: '',
    projectId: '',
    projectName: '',
    contractValue: 0,
    retentionPercentage: 5,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    paymentTerms: 'Monthly progress certificates, 30 days credit',
    status: 'Active' as 'Draft' | 'Active' | 'Completed' | 'Terminated',
    notes: ''
  });

  const filteredContracts = contracts.filter(c =>
    c.contractNumber.toLowerCase().includes(search.toLowerCase()) ||
    c.clientName.toLowerCase().includes(search.toLowerCase()) ||
    c.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const totalContractValue = contracts.reduce((s, c) => s + (c.contractValue || 0), 0);
  const totalRetention = contracts.reduce((s, c) => s + (c.retentionAmount || 0), 0);

  const handleOpenAdd = () => {
    setEditingContract(null);
    setForm({
      contractNumber: `CTR-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
      clientId: clients[0]?.id || '',
      clientName: clients[0]?.name || '',
      projectId: projects[0]?.id || '',
      projectName: projects[0]?.name || '',
      contractValue: projects[0]?.contractValue || 0,
      retentionPercentage: 5,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      paymentTerms: 'Monthly progress certificates, 30 days credit',
      status: 'Active',
      notes: ''
    });
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cl = clients.find(c => c.id === form.clientId);
    const pr = projects.find(p => p.id === form.projectId);

    const payload = {
      ...form,
      clientName: cl ? cl.name : form.clientName,
      projectName: pr ? pr.name : form.projectName,
      retentionAmount: (form.contractValue * form.retentionPercentage) / 100
    };

    if (editingContract) {
      await onUpdateContract(editingContract.id, payload);
    } else {
      await onCreateContract(payload);
    }
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-amber-500" />
            {t.contractsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.contractsSubtitle}
          </p>
        </div>

        {can('manage_projects') && (
          <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            {t.addContract}
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.totalContractValue}
          value={formatCurrency(totalContractValue, 'EGP', language)}
          subtitle={`${contracts.length} ${t.contracts.toLowerCase()}`}
          icon={<Building2 className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={t.retentionAmount}
          value={formatCurrency(totalRetention, 'EGP', language)}
          subtitle={isRTL ? 'تأمينات ضمان أعمال محتجزة' : 'Contract retention held'}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'متوسط نسبة التأمين' : 'Avg Retention Rate'}
          value="5.0%"
          subtitle={isRTL ? 'تفرج بعد فترة الضمان والصيانة' : 'Released post defect liability'}
          icon={<FileText className="w-5 h-5" />}
          color="blue"
        />
      </div>

      {/* Contracts Table */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder={isRTL ? 'بحث برقم العقد أو العميل...' : 'Search contract # or client...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredContracts.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {isRTL ? 'لا توجد عقود مسجلة' : 'No contracts found'}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{t.contractNumber}</th>
                  <th className="p-3">{t.client}</th>
                  <th className="p-3">{t.projects}</th>
                  <th className="p-3">{t.contractValue}</th>
                  <th className="p-3">{t.retentionAmount} ({t.retentionPercentage})</th>
                  <th className="p-3">{t.startDate} → {t.expectedEndDate}</th>
                  <th className="p-3">{t.status}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                {filteredContracts.map(c => (
                  <tr key={c.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3 font-mono font-bold text-amber-500">{c.contractNumber}</td>
                    <td className="p-3 font-semibold text-stone-900 dark:text-stone-100">{c.clientName}</td>
                    <td className="p-3 text-stone-600 dark:text-stone-400">{c.projectName}</td>
                    <td className="p-3 font-mono font-bold text-stone-900 dark:text-stone-100">{formatCurrency(c.contractValue, 'EGP', language)}</td>
                    <td className="p-3 font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                      {formatCurrency(c.retentionAmount, 'EGP', language)} ({c.retentionPercentage}%)
                    </td>
                    <td className="p-3 font-mono text-[11px] text-stone-500">
                      {formatDate(c.startDate, language)} → {formatDate(c.endDate, language)}
                    </td>
                    <td className="p-3">
                      <Badge variant={c.status === 'Active' ? 'active' : 'draft'}>{c.status}</Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setEditingContract(c);
                            setForm({
                              contractNumber: c.contractNumber,
                              clientId: c.clientId,
                              clientName: c.clientName,
                              projectId: c.projectId,
                              projectName: c.projectName,
                              contractValue: c.contractValue,
                              retentionPercentage: c.retentionPercentage,
                              startDate: c.startDate,
                              endDate: c.endDate,
                              paymentTerms: c.paymentTerms || '',
                              status: c.status,
                              notes: c.notes || ''
                            });
                            setShowAdd(true);
                          }}
                          className="p-1 hover:text-amber-500 text-stone-400"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeleteId(c.id)} className="p-1 hover:text-rose-500 text-stone-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editingContract ? t.edit : t.addContract}
        subtitle={isRTL ? 'إدخال شروط العقد، نسبة تأمين الأعمال وشروط السداد' : 'Enter contract agreement, retention %, and milestones'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label={t.contractNumber}
            required
            value={form.contractNumber}
            onChange={e => setForm({ ...form, contractNumber: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label={t.client}
              required
              value={form.clientId}
              onChange={e => setForm({ ...form, clientId: e.target.value })}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
            />
            <Select
              label={t.projects}
              required
              value={form.projectId}
              onChange={e => setForm({ ...form, projectId: e.target.value })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.contractValue + ' (EGP)'}
              type="number"
              required
              value={form.contractValue || ''}
              onChange={e => setForm({ ...form, contractValue: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.retentionPercentage + ' (%)'}
              type="number"
              value={form.retentionPercentage || ''}
              onChange={e => setForm({ ...form, retentionPercentage: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.startDate}
              type="date"
              required
              value={form.startDate}
              onChange={e => setForm({ ...form, startDate: e.target.value })}
            />
            <Input
              label={t.expectedEndDate}
              type="date"
              value={form.endDate}
              onChange={e => setForm({ ...form, endDate: e.target.value })}
            />
          </div>

          <Input
            label={t.paymentTerms}
            value={form.paymentTerms}
            onChange={e => setForm({ ...form, paymentTerms: e.target.value })}
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
        onConfirm={() => { if (deleteId) onDeleteContract(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
