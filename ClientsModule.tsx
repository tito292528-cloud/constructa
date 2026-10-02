import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Mail, Building, FileText, Printer, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { Client, Invoice, Project } from '../../types/index.ts';

interface ClientsModuleProps {
  clients: Client[];
  invoices: Invoice[];
  projects: Project[];
  selectedClientId?: string | null;
  onClearSelectedClient?: () => void;
  onCreateClient: (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  onDeleteClient: (id: string) => Promise<void>;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({
  clients,
  invoices,
  projects,
  selectedClientId,
  onClearSelectedClient,
  onCreateClient,
  onUpdateClient,
  onDeleteClient
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statementClient, setStatementClient] = useState<Client | null>(
    selectedClientId ? clients.find(c => c.id === selectedClientId) || null : null
  );

  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    taxNumber: '',
    notes: ''
  });

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
    c.phone.includes(search)
  );

  const totalInvoicedAll = clients.reduce((s, c) => s + (c.totalInvoiced || 0), 0);
  const totalCollectedAll = clients.reduce((s, c) => s + (c.totalPaid || 0), 0);
  const totalReceivables = clients.reduce((s, c) => s + (c.currentBalance || 0), 0);

  const handleOpenAdd = () => {
    setEditingClient(null);
    setForm({ name: '', company: '', phone: '', email: '', address: '', taxNumber: '', notes: '' });
    setShowAdd(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setForm({
      name: c.name,
      company: c.company || '',
      phone: c.phone,
      email: c.email || '',
      address: c.address || '',
      taxNumber: c.taxNumber || '',
      notes: c.notes || ''
    });
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    if (editingClient) {
      await onUpdateClient(editingClient.id, form);
    } else {
      await onCreateClient({
        ...form,
        currentBalance: 0,
        totalInvoiced: 0,
        totalPaid: 0
      });
    }
    setShowAdd(false);
  };

  const clientInvoices = statementClient
    ? invoices.filter(i => i.clientId === statementClient.id)
    : [];

  const clientProjects = statementClient
    ? projects.filter(p => p.clientId === statementClient.id)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500" />
            {t.clientsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {isRTL ? 'إدارة الجهات المالكة، المستثمرين، كشوف الحساب والمطالبات المالية' : 'Manage developers, project owners, statements, and receivables'}
          </p>
        </div>

        <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
          {t.addClient}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي فواتير العملاء' : 'Total Billed to Clients'}
          value={formatCurrency(totalInvoicedAll, 'EGP', language)}
          subtitle={`${clients.length} ${t.clients.toLowerCase()}`}
          icon={<FileText className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي المحصل نقداً / بنك' : 'Total Collected Revenue'}
          value={formatCurrency(totalCollectedAll, 'EGP', language)}
          subtitle={isRTL ? 'دفعات مستلمة' : 'Payments received'}
          icon={<Building className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={t.customerReceivables}
          value={formatCurrency(totalReceivables, 'EGP', language)}
          subtitle={isRTL ? 'مستحقات واجبة التحصيل' : 'Outstanding client balances'}
          icon={<Users className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Clients List */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="w-full sm:w-72">
            <Input
              icon={<Search className="w-4 h-4" />}
              placeholder={isRTL ? 'بحث باسم العميل أو الشركة...' : 'Search client or company...'}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {filteredClients.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {isRTL ? 'لا يوجد عملاء مسجلين' : 'No clients found'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(c => (
              <div
                key={c.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 hover:border-amber-500/50 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{c.name}</h3>
                    {c.company && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">{c.company}</p>
                    )}
                  </div>
                  <Badge variant={c.currentBalance > 0 ? 'warning' : 'completed'}>
                    {c.currentBalance > 0 ? (isRTL ? 'مدين' : 'Due') : (isRTL ? 'خالص' : 'Settled')}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400 font-mono">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{c.phone}</span>
                  </p>
                  {c.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span className="truncate">{c.email}</span>
                    </p>
                  )}
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">{isRTL ? 'المفوتر' : 'Invoiced'}</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">{formatCurrency(c.totalInvoiced, 'EGP', language)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">{isRTL ? 'الرصيد المستحق' : 'Balance Due'}</span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{formatCurrency(c.currentBalance, 'EGP', language)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => setStatementClient(c)}
                  >
                    {t.clientStatement}
                  </Button>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(c)} className="p-1 hover:text-amber-500 text-stone-400">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1 hover:text-rose-500 text-stone-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add / Edit Client Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editingClient ? t.edit : t.addClient}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.client + ' (Name)'}
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Emaar Misr"
            />
            <Input
              label={t.company}
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
              placeholder="e.g. Emaar Properties"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.phone}
              required
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
            <Input
              label={t.email}
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.address}
              value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
            />
            <Input
              label={t.taxNumber}
              value={form.taxNumber}
              onChange={e => setForm({ ...form, taxNumber: e.target.value })}
            />
          </div>

          <Input
            label={t.notes}
            value={form.notes}
            onChange={e => setForm({ ...form, notes: e.target.value })}
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

      {/* Customer Statement Modal (Requirement #13) */}
      {statementClient && (
        <Modal
          isOpen={!!statementClient}
          onClose={() => {
            setStatementClient(null);
            if (onClearSelectedClient) onClearSelectedClient();
          }}
          title={`${t.clientStatement}: ${statementClient.name}`}
          subtitle={`${statementClient.company ? statementClient.company + ' • ' : ''}${statementClient.phone}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs font-mono">
              <div>
                <span className="text-stone-400 block font-sans">{isRTL ? 'إجمالي المفوتر' : 'Total Billed'}</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{formatCurrency(statementClient.totalInvoiced, 'EGP', language)}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans">{isRTL ? 'إجمالي المدفوع' : 'Total Paid'}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(statementClient.totalPaid, 'EGP', language)}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans">{isRTL ? 'الرصيد المتبقي المطلوب' : 'Outstanding Balance'}</span>
                <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{formatCurrency(statementClient.currentBalance, 'EGP', language)}</span>
              </div>
            </div>

            {/* Invoices List */}
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {isRTL ? 'سجل الفواتير والمستخلصات الصادرة' : 'Issued Progress Invoices'}
            </h4>
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                  <tr>
                    <th className="p-3">{t.invoiceNumber}</th>
                    <th className="p-3">{t.date}</th>
                    <th className="p-3">{t.total}</th>
                    <th className="p-3">{t.paid}</th>
                    <th className="p-3">{t.remaining}</th>
                    <th className="p-3">{t.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                  {clientInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-stone-400 font-sans">{t.noData}</td>
                    </tr>
                  ) : (
                    clientInvoices.map(i => (
                      <tr key={i.id}>
                        <td className="p-3 font-bold text-amber-500">{i.invoiceNumber}</td>
                        <td className="p-3">{formatDate(i.date, language)}</td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(i.total, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(i.paid, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(i.remaining, 'EGP', language)}</td>
                        <td className="p-3 font-sans"><Badge variant={i.status === 'Paid' ? 'completed' : 'pending'}>{i.status}</Badge></td>
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
              <Button variant="secondary" size="sm" onClick={() => setStatementClient(null)}>
                {t.close}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDeleteClient(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
