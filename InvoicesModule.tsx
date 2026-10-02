import React, { useState } from 'react';
import { Receipt, Plus, Search, Printer, DollarSign, CheckCircle2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { 
  Invoice, 
  InvoiceItem, 
  Client, 
  Project, 
  BankAccount, 
  CompanySettings 
} from '../../types/index.ts';

interface InvoicesModuleProps {
  invoices: Invoice[];
  clients: Client[];
  projects: Project[];
  bankAccounts: BankAccount[];
  companySettings: CompanySettings;
  onCreateInvoice: (inv: Omit<Invoice, 'id' | 'createdAt'>) => Promise<void>;
  onRecordPayment: (invoiceId: string, amount: number, paymentMethod: 'cash' | 'bank', destId: string, date: string) => Promise<void>;
  onDeleteInvoice: (id: string) => Promise<void>;
}

export const InvoicesModule: React.FC<InvoicesModuleProps> = ({
  invoices,
  clients,
  projects,
  bankAccounts,
  companySettings,
  onCreateInvoice,
  onRecordPayment,
  onDeleteInvoice
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Invoice form state
  const [form, setForm] = useState({
    invoiceNumber: '',
    clientId: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: 'Payment terms: 30 days credit from invoice date.'
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    { id: '1', description: 'Progress Certificate #01 - Execution Works', quantity: 1, unit: 'Lot', unitPrice: 0, total: 0 }
  ]);

  // Payment form state
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<'cash' | 'bank'>('bank');
  const [payDestId, setPayDestId] = useState<string>(bankAccounts[0]?.id || '');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const filteredInvoices = invoices.filter(i =>
    i.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    i.clientName.toLowerCase().includes(search.toLowerCase()) ||
    i.projectName.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);
  const totalBilled = invoices.reduce((s, i) => s + (i.total || 0), 0);
  const totalCollected = invoices.reduce((s, i) => s + (i.paid || 0), 0);
  const totalRemaining = invoices.reduce((s, i) => s + (i.remaining || 0), 0);

  const handleOpenAdd = () => {
    setForm({
      invoiceNumber: `${companySettings.invoicePrefix || 'INV-'}${companySettings.nextInvoiceNumber || 1001}`,
      clientId: clients[0]?.id || '',
      projectId: projects[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      notes: 'Payment terms: 30 days credit from invoice date.'
    });
    setItems([{ id: '1', description: 'Progress Certificate - Concrete Works', quantity: 1, unit: 'Lot', unitPrice: 0, total: 0 }]);
    setShowAdd(true);
  };

  const handleItemChange = (index: number, field: keyof InvoiceItem, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      next[index].total = (next[index].quantity || 0) * (next[index].unitPrice || 0);
    }
    setItems(next);
  };

  const addItem = () => {
    setItems([...items, { id: String(Date.now()), description: '', quantity: 1, unit: 'Item', unitPrice: 0, total: 0 }]);
  };

  const removeItem = (idx: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== idx));
    }
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoiceNumber || !form.clientId || !form.projectId || subtotal <= 0) return;

    const cl = clients.find(c => c.id === form.clientId);
    const pr = projects.find(p => p.id === form.projectId);

    await onCreateInvoice({
      invoiceNumber: form.invoiceNumber,
      clientId: form.clientId,
      clientName: cl ? cl.name : '',
      projectId: form.projectId,
      projectName: pr ? pr.name : '',
      date: form.date,
      dueDate: form.dueDate,
      items,
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      paid: 0,
      remaining: subtotal,
      status: 'Sent',
      notes: form.notes
    });

    setShowAdd(false);
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentInvoice || payAmount <= 0) return;

    await onRecordPayment(
      paymentInvoice.id,
      payAmount,
      payMethod,
      payDestId,
      payDate
    );

    setPaymentInvoice(null);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Receipt className="w-6 h-6 text-amber-500" />
            {t.invoicesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.invoicesSubtitle}
          </p>
        </div>

        <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
          {t.createInvoice}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي قيمة المستخلصات الصادرة' : 'Total Progress Invoiced'}
          value={formatCurrency(totalBilled, 'EGP', language)}
          subtitle={`${invoices.length} ${t.invoices.toLowerCase()}`}
          icon={<Receipt className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={t.totalRevenue}
          value={formatCurrency(totalCollected, 'EGP', language)}
          subtitle={isRTL ? 'محصل بالخزينة والحسابات' : 'Deposited funds'}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'متبقي تحت التحصيل' : 'Receivables Balance'}
          value={formatCurrency(totalRemaining, 'EGP', language)}
          subtitle={isRTL ? 'مستحقات على العملاء' : 'Pending progress draws'}
          icon={<Receipt className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Invoices Table */}
      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث برقم المستخلص أو العميل...' : 'Search invoice # or client...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noInvoicesYet}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{t.invoiceNumber}</th>
                  <th className="p-3">{t.client}</th>
                  <th className="p-3">{t.projects}</th>
                  <th className="p-3">{t.date}</th>
                  <th className="p-3">{t.dueDate}</th>
                  <th className="p-3">{t.total}</th>
                  <th className="p-3">{t.paid}</th>
                  <th className="p-3">{t.remaining}</th>
                  <th className="p-3">{t.status}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3 font-bold text-amber-500">{inv.invoiceNumber}</td>
                    <td className="p-3 font-sans font-semibold text-stone-900 dark:text-stone-100">{inv.clientName}</td>
                    <td className="p-3 font-sans text-stone-600 dark:text-stone-400">{inv.projectName}</td>
                    <td className="p-3">{formatDate(inv.date, language)}</td>
                    <td className="p-3">{formatDate(inv.dueDate, language)}</td>
                    <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(inv.total, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(inv.paid, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(inv.remaining, 'EGP', language)}</td>
                    <td className="p-3 font-sans">
                      <Badge variant={inv.status === 'Paid' ? 'completed' : inv.status === 'Partially Paid' ? 'pending' : 'draft'}>
                        {inv.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewInvoice(inv)}
                        >
                          {t.view}
                        </Button>
                        {inv.remaining > 0 && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => {
                              setPaymentInvoice(inv);
                              setPayAmount(inv.remaining);
                            }}
                          >
                            {isRTL ? 'تحصيل' : 'Collect'}
                          </Button>
                        )}
                        <button onClick={() => setDeleteId(inv.id)} className="p-1 hover:text-rose-500 text-stone-400">
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

      {/* Add Invoice Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={t.createInvoice}
        subtitle={isRTL ? 'إصدار مستخلص أعمال جديد للمشروع والعميل' : 'Generate client progress invoice'}
        maxWidth="4xl"
      >
        <form onSubmit={handleSaveInvoice} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.invoiceNumber}
              required
              value={form.invoiceNumber}
              onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
            />
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
              label={t.date}
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
            <Input
              label={t.dueDate}
              type="date"
              required
              value={form.dueDate}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
            />
          </div>

          {/* Line items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">{t.items}</label>
              <Button variant="outline" size="sm" type="button" onClick={addItem}>
                + {t.addItem}
              </Button>
            </div>

            {items.map((it, idx) => (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                <div className="col-span-5">
                  <Input
                    placeholder={isRTL ? 'بيان الأعمال والمستخلص' : 'Description of work'}
                    required
                    value={it.description}
                    onChange={e => handleItemChange(idx, 'description', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder={t.quantity}
                    required
                    value={it.quantity || ''}
                    onChange={e => handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    placeholder={t.unit}
                    value={it.unit}
                    onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    placeholder={t.unitPrice}
                    required
                    value={it.unitPrice || ''}
                    onChange={e => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button type="button" onClick={() => removeItem(idx)} disabled={items.length <= 1} className="text-stone-400 hover:text-rose-500 disabled:opacity-30">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-800/60 flex items-center justify-between">
            <span className="text-xs text-stone-500 uppercase font-bold">{t.total}</span>
            <span className="text-2xl font-black font-mono text-amber-500">
              {formatCurrency(subtotal, 'EGP', language)}
            </span>
          </div>

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

      {/* Record Payment Modal */}
      {paymentInvoice && (
        <Modal
          isOpen={!!paymentInvoice}
          onClose={() => setPaymentInvoice(null)}
          title={`${isRTL ? 'تحصيل دفعة من العميل' : 'Record Client Payment'}: #${paymentInvoice.invoiceNumber}`}
          subtitle={`${paymentInvoice.clientName} • ${formatCurrency(paymentInvoice.remaining, 'EGP', language)} ${isRTL ? 'مستحق' : 'due'}`}
        >
          <form onSubmit={handleRecordPaymentSubmit} className="space-y-4">
            <Input
              label={isRTL ? 'المبلغ المحصل (EGP)' : 'Amount Collected (EGP)'}
              type="number"
              required
              value={payAmount || ''}
              onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label={t.paymentMethod}
                value={payMethod}
                onChange={e => setPayMethod(e.target.value as any)}
                options={[
                  { value: 'bank', label: isRTL ? 'إيداع بالحساب البنكي' : 'Bank Deposit' },
                  { value: 'cash', label: isRTL ? 'نقدًا بالخزينة' : 'Cashbox Deposit' }
                ]}
              />
              <Input
                label={t.date}
                type="date"
                required
                value={payDate}
                onChange={e => setPayDate(e.target.value)}
              />
            </div>

            {payMethod === 'bank' && (
              <Select
                label={isRTL ? 'الحساب البنكي المودع به' : 'Target Bank Account'}
                value={payDestId}
                onChange={e => setPayDestId(e.target.value)}
                options={bankAccounts.map(b => ({ value: b.id, label: `${b.bankName} (${b.accountNumber})` }))}
              />
            )}

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <Button variant="outline" type="button" onClick={() => setPaymentInvoice(null)}>
                {t.cancel}
              </Button>
              <Button variant="primary" type="submit">
                {isRTL ? 'تأكيد التحصيل والتوريد' : 'Confirm Collection'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Printable Invoice Modal (Requirement #22) */}
      {viewInvoice && (
        <Modal
          isOpen={!!viewInvoice}
          onClose={() => setViewInvoice(null)}
          title={`${isRTL ? 'فاتورة مستخلص أعمال' : 'Progress Billing Certificate'}: #${viewInvoice.invoiceNumber}`}
          maxWidth="4xl"
        >
          <div className="space-y-6 p-4 bg-white text-stone-900 rounded-xl print:p-0">
            {/* Header with Company Logo & Info */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-amber-600">
                  {companySettings.companyNameAr || companySettings.companyName}
                </h2>
                <p className="text-xs text-stone-600">{companySettings.companyName}</p>
                <p className="text-xs text-stone-500 font-mono mt-1">
                  Tax No: {companySettings.taxNumber} • CR: {companySettings.commercialRegister}
                </p>
                <p className="text-xs text-stone-500">{companySettings.address}</p>
              </div>
              <div className="text-right rtl:text-left font-mono">
                <span className="text-xs uppercase font-bold text-stone-400 block">{isRTL ? 'رقم الفاتورة' : 'Invoice Number'}</span>
                <span className="text-lg font-black text-stone-900">{viewInvoice.invoiceNumber}</span>
                <span className="text-xs text-stone-500 block mt-1">{formatDate(viewInvoice.date, language)}</span>
              </div>
            </div>

            {/* Bill To */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg bg-stone-50 border">
                <span className="text-stone-400 font-bold uppercase block mb-1">{t.billTo}</span>
                <p className="font-bold text-sm text-stone-900">{viewInvoice.clientName}</p>
                <p className="text-stone-600 mt-0.5">{t.projects}: {viewInvoice.projectName}</p>
              </div>
              <div className="p-3 rounded-lg bg-stone-50 border font-mono">
                <span className="text-stone-400 font-bold uppercase block mb-1">{t.dueDate}</span>
                <p className="font-bold text-sm text-stone-900">{formatDate(viewInvoice.dueDate, language)}</p>
                <p className="text-stone-600 mt-0.5">{viewInvoice.notes}</p>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full text-xs text-left rtl:text-right border">
              <thead className="bg-stone-100 font-bold text-stone-700">
                <tr>
                  <th className="p-3 border-b">{t.itemDescription}</th>
                  <th className="p-3 border-b">{t.quantity}</th>
                  <th className="p-3 border-b">{t.unit}</th>
                  <th className="p-3 border-b">{t.unitPrice}</th>
                  <th className="p-3 border-b text-right rtl:text-left">{t.total}</th>
                </tr>
              </thead>
              <tbody className="divide-y font-mono">
                {viewInvoice.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-sans font-medium text-stone-900">{it.description}</td>
                    <td className="p-3">{it.quantity}</td>
                    <td className="p-3 font-sans">{it.unit}</td>
                    <td className="p-3">{formatCurrency(it.unitPrice, 'EGP', language)}</td>
                    <td className="p-3 text-right rtl:text-left font-bold">{formatCurrency(it.total, 'EGP', language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals Strip */}
            <div className="flex justify-end">
              <div className="w-72 space-y-1.5 text-xs font-mono">
                <div className="flex justify-between py-1 border-b">
                  <span className="font-sans text-stone-600">{t.subtotal}:</span>
                  <span className="font-bold">{formatCurrency(viewInvoice.subtotal, 'EGP', language)}</span>
                </div>
                <div className="flex justify-between py-1 border-b font-bold text-sm">
                  <span className="font-sans text-stone-900">{t.total}:</span>
                  <span className="text-amber-600">{formatCurrency(viewInvoice.total, 'EGP', language)}</span>
                </div>
                <div className="flex justify-between py-1 border-b text-emerald-600">
                  <span className="font-sans">{t.paid}:</span>
                  <span className="font-bold">{formatCurrency(viewInvoice.paid, 'EGP', language)}</span>
                </div>
                <div className="flex justify-between py-1 font-bold text-rose-600">
                  <span className="font-sans">{t.remaining}:</span>
                  <span>{formatCurrency(viewInvoice.remaining, 'EGP', language)}</span>
                </div>
              </div>
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-8 pt-8 border-t text-xs text-center text-stone-500">
              <div>
                <p className="font-bold text-stone-800">{isRTL ? 'إدارة المشروعات والمهندس المشرف' : 'Site Supervising Engineer'}</p>
                <div className="h-12 border-b border-dashed border-stone-300 mt-2"></div>
              </div>
              <div>
                <p className="font-bold text-stone-800">{isRTL ? 'ختم واعتماد الإدارة المالية' : 'Financial Controller Approval'}</p>
                <div className="h-12 border-b border-dashed border-stone-300 mt-2"></div>
              </div>
            </div>

            {/* Print & Close */}
            <div className="flex items-center justify-between pt-4 border-t no-print">
              <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                {t.print}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setViewInvoice(null)}>
                {t.close}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDeleteInvoice(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
