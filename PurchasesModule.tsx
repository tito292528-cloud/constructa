import React, { useState } from 'react';
import { ShoppingBag, Plus, Search, Trash2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { 
  Purchase, 
  PurchaseItem, 
  PurchaseCategory, 
  Supplier, 
  Project, 
  BankAccount 
} from '../../types/index.ts';

interface PurchasesModuleProps {
  purchases: Purchase[];
  suppliers: Supplier[];
  projects: Project[];
  bankAccounts: BankAccount[];
  onCreatePurchase: (purchase: Omit<Purchase, 'id' | 'createdAt'>) => Promise<void>;
  onDeletePurchase: (id: string) => Promise<void>;
}

export const PurchasesModule: React.FC<PurchasesModuleProps> = ({
  purchases,
  suppliers,
  projects,
  bankAccounts,
  onCreatePurchase,
  onDeletePurchase
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    invoiceNumber: '',
    supplierId: '',
    projectId: '',
    date: new Date().toISOString().split('T')[0],
    category: 'Materials' as PurchaseCategory,
    paymentMethod: 'bank' as 'cash' | 'bank' | 'credit',
    sourceId: bankAccounts[0]?.id || '',
    paid: 0
  });

  const [items, setItems] = useState<PurchaseItem[]>([
    { id: '1', description: '', quantity: 1, unit: 'Ton', unitPrice: 0, total: 0 }
  ]);

  const filteredPurchases = purchases.filter(p =>
    p.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
    (p.projectName && p.projectName.toLowerCase().includes(search.toLowerCase()))
  );

  const totalProcurement = purchases.reduce((s, p) => s + (p.total || 0), 0);
  const totalPaid = purchases.reduce((s, p) => s + (p.paid || 0), 0);
  const totalRemaining = purchases.reduce((s, p) => s + (p.remaining || 0), 0);

  // Calculate items total
  const subtotal = items.reduce((s, it) => s + (it.total || 0), 0);

  const handleOpenAdd = () => {
    setForm({
      invoiceNumber: `PUR-${Date.now().toString().slice(-5)}`,
      supplierId: suppliers[0]?.id || '',
      projectId: projects[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
      category: 'Materials',
      paymentMethod: 'bank',
      sourceId: bankAccounts[0]?.id || '',
      paid: 0
    });
    setItems([{ id: '1', description: '', quantity: 1, unit: 'Ton', unitPrice: 0, total: 0 }]);
    setShowAdd(true);
  };

  const handleItemChange = (index: number, field: keyof PurchaseItem, val: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: val };
    if (field === 'quantity' || field === 'unitPrice') {
      next[index].total = (next[index].quantity || 0) * (next[index].unitPrice || 0);
    }
    setItems(next);
  };

  const addItem = () => {
    setItems([...items, { id: String(Date.now()), description: '', quantity: 1, unit: 'm³', unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoiceNumber || !form.supplierId || subtotal <= 0) return;

    const sup = suppliers.find(s => s.id === form.supplierId);
    const proj = projects.find(p => p.id === form.projectId);

    const paidAmount = Math.min(subtotal, Math.max(0, form.paid));
    const remainingAmount = subtotal - paidAmount;

    await onCreatePurchase({
      invoiceNumber: form.invoiceNumber,
      supplierId: form.supplierId,
      supplierName: sup ? sup.name : '',
      projectId: form.projectId || undefined,
      projectName: proj ? proj.name : undefined,
      date: form.date,
      category: form.category,
      items,
      subtotal,
      discount: 0,
      tax: 0,
      total: subtotal,
      paid: paidAmount,
      remaining: remainingAmount,
      paymentMethod: form.paymentMethod,
      sourceId: form.sourceId || undefined
    });

    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
            {t.purchasesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.purchasesSubtitle}
          </p>
        </div>

        <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
          {t.addPurchase}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.totalPurchases}
          value={formatCurrency(totalProcurement, 'EGP', language)}
          subtitle={`${purchases.length} ${t.purchases.toLowerCase()}`}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي المدفوع نقداً / بنك' : 'Total Settled Amount'}
          value={formatCurrency(totalPaid, 'EGP', language)}
          subtitle={isRTL ? 'سداد المشتريات' : 'Paid amount'}
          icon={<CheckCircle2 className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={isRTL ? 'المتبقي المستحق للموردين' : 'Outstanding Remaining'}
          value={formatCurrency(totalRemaining, 'EGP', language)}
          subtitle={isRTL ? 'ذمم دائنة للموردين' : 'Accounts payable'}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Table */}
      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث برقم الفاتورة أو المورد...' : 'Search invoice # or supplier...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredPurchases.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noPurchasesYet}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{t.invoiceNumber}</th>
                  <th className="p-3">{t.supplier}</th>
                  <th className="p-3">{t.projects}</th>
                  <th className="p-3">{t.category}</th>
                  <th className="p-3">{t.date}</th>
                  <th className="p-3">{t.total}</th>
                  <th className="p-3">{t.paid}</th>
                  <th className="p-3">{t.remaining}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {filteredPurchases.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                    <td className="p-3 font-bold text-amber-500">{p.invoiceNumber}</td>
                    <td className="p-3 font-sans font-semibold text-stone-900 dark:text-stone-100">{p.supplierName}</td>
                    <td className="p-3 font-sans text-stone-600 dark:text-stone-400">{p.projectName || '-'}</td>
                    <td className="p-3 font-sans text-stone-500">{p.category}</td>
                    <td className="p-3">{formatDate(p.date, language)}</td>
                    <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(p.total, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.paid, 'EGP', language)}</td>
                    <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(p.remaining, 'EGP', language)}</td>
                    <td className="p-3 text-center">
                      <button onClick={() => setDeleteId(p.id)} className="p-1 hover:text-rose-500 text-stone-400">
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

      {/* Add Purchase Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={t.addPurchase}
        subtitle={isRTL ? 'تسجيل توريد مواد أو استئجار معدات مع التحديث الآلي لدفاتر المورد وتكلفة المشروع' : 'Record vendor purchases with automatic inventory and ledger updates'}
        maxWidth="4xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.invoiceNumber}
              required
              value={form.invoiceNumber}
              onChange={e => setForm({ ...form, invoiceNumber: e.target.value })}
            />
            <Select
              label={t.supplier}
              required
              value={form.supplierId}
              onChange={e => setForm({ ...form, supplierId: e.target.value })}
              options={suppliers.map(s => ({ value: s.id, label: s.name }))}
            />
            <Select
              label={t.projects + ' (' + (isRTL ? 'اختياري' : 'Optional') + ')'}
              value={form.projectId}
              onChange={e => setForm({ ...form, projectId: e.target.value })}
              options={[
                { value: '', label: isRTL ? '-- بدون مشروع (مخزن عام) --' : '-- No Project (General Warehouse) --' },
                ...projects.map(p => ({ value: p.id, label: p.name }))
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.date}
              type="date"
              required
              value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
            />
            <Select
              label={t.category}
              value={form.category}
              onChange={e => setForm({ ...form, category: e.target.value as PurchaseCategory })}
              options={[
                { value: 'Materials', label: isRTL ? 'مواد بناء وخامات' : 'Materials' },
                { value: 'Equipment', label: isRTL ? 'معدات وأوناش' : 'Equipment' },
                { value: 'Tools', label: isRTL ? 'عدد وأدوات صغيرة' : 'Tools' },
                { value: 'Services', label: isRTL ? 'خدمات واختبارات معملية' : 'Services' },
                { value: 'Other', label: isRTL ? 'أخرى' : 'Other' }
              ]}
            />
            <Select
              label={t.paymentMethod}
              value={form.paymentMethod}
              onChange={e => setForm({ ...form, paymentMethod: e.target.value as any })}
              options={[
                { value: 'bank', label: isRTL ? 'حساب بنكي' : 'Bank Account' },
                { value: 'cash', label: isRTL ? 'الخزينة (نقدًا)' : 'Cashbox' },
                { value: 'credit', label: isRTL ? 'آجل بالكامل' : 'Credit (Unpaid)' }
              ]}
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-stone-500">
                {t.items}
              </label>
              <Button variant="outline" size="sm" type="button" onClick={addItem}>
                + {t.addItem}
              </Button>
            </div>

            <div className="space-y-2">
              {items.map((it, idx) => (
                <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-stone-50 dark:bg-stone-800/40 p-2.5 rounded-xl border border-stone-200 dark:border-stone-800">
                  <div className="col-span-5">
                    <Input
                      placeholder={isRTL ? 'وصف الصنف / المادة' : 'Item description'}
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
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      disabled={items.length <= 1}
                      className="text-stone-400 hover:text-rose-500 disabled:opacity-30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Payment amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-stone-200 dark:border-stone-800">
            <div>
              <Input
                label={isRTL ? 'المدفوع حالياً (EGP)' : 'Amount Paid Now (EGP)'}
                type="number"
                value={form.paid || ''}
                onChange={e => setForm({ ...form, paid: parseFloat(e.target.value) || 0 })}
                helperText={isRTL ? `المتبقي: ${formatCurrency(Math.max(0, subtotal - form.paid), 'EGP', language)}` : `Remaining: ${formatCurrency(Math.max(0, subtotal - form.paid), 'EGP', language)}`}
              />
            </div>
            <div className="p-4 rounded-xl bg-stone-100 dark:bg-stone-800/60 flex flex-col justify-between">
              <span className="text-xs text-stone-500 uppercase font-bold">{t.total}</span>
              <span className="text-2xl font-black font-mono text-amber-500">
                {formatCurrency(subtotal, 'EGP', language)}
              </span>
            </div>
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

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDeletePurchase(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
