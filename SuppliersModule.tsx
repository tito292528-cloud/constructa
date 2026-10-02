import React, { useState } from 'react';
import { Truck, Plus, Search, Phone, Mail, FileText, Printer, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { Supplier, Purchase } from '../../types/index.ts';

interface SuppliersModuleProps {
  suppliers: Supplier[];
  purchases: Purchase[];
  selectedSupplierId?: string | null;
  onClearSelectedSupplier?: () => void;
  onCreateSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const SuppliersModule: React.FC<SuppliersModuleProps> = ({
  suppliers,
  purchases,
  selectedSupplierId,
  onClearSelectedSupplier,
  onCreateSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(
    selectedSupplierId ? suppliers.find(s => s.id === selectedSupplierId) || null : null
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

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.company && s.company.toLowerCase().includes(search.toLowerCase())) ||
    s.phone.includes(search)
  );

  const totalPurchasesAll = suppliers.reduce((s, sup) => s + (sup.totalPurchases || 0), 0);
  const totalPaidAll = suppliers.reduce((s, sup) => s + (sup.totalPaid || 0), 0);
  const totalPayables = suppliers.reduce((s, sup) => s + (sup.currentBalance || 0), 0);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setForm({ name: '', company: '', phone: '', email: '', address: '', taxNumber: '', notes: '' });
    setShowAdd(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({
      name: s.name,
      company: s.company || '',
      phone: s.phone,
      email: s.email || '',
      address: s.address || '',
      taxNumber: s.taxNumber || '',
      notes: s.notes || ''
    });
    setShowAdd(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) return;

    if (editingSupplier) {
      await onUpdateSupplier(editingSupplier.id, form);
    } else {
      await onCreateSupplier({
        ...form,
        currentBalance: 0,
        totalPurchases: 0,
        totalPaid: 0
      });
    }
    setShowAdd(false);
  };

  const supplierPurchases = statementSupplier
    ? purchases.filter(p => p.supplierId === statementSupplier.id)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-amber-500" />
            {t.suppliersTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {isRTL ? 'إدارة مصانع وموردي مواد البناء (حديد، أسمنت، خرسانة)، كشوف الحساب والمستحقات' : 'Manage building material vendors, ready-mix plants, statements, and payables'}
          </p>
        </div>

        <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
          {t.addSupplier}
        </Button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي المشتريات والتوريدات' : 'Total Procurement Invoiced'}
          value={formatCurrency(totalPurchasesAll, 'EGP', language)}
          subtitle={`${suppliers.length} ${t.suppliers.toLowerCase()}`}
          icon={<FileText className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي المدفوع للموردين' : 'Total Paid to Vendors'}
          value={formatCurrency(totalPaidAll, 'EGP', language)}
          subtitle={isRTL ? 'دفعات مسددة' : 'Settled payments'}
          icon={<Truck className="w-5 h-5" />}
          color="emerald"
        />
        <StatCard
          title={t.supplierPayables}
          value={formatCurrency(totalPayables, 'EGP', language)}
          subtitle={isRTL ? 'مستحقات واجبة السداد' : 'Outstanding vendor balances'}
          icon={<Truck className="w-5 h-5" />}
          color="rose"
        />
      </div>

      {/* Suppliers Grid */}
      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث باسم المورد أو الشركة...' : 'Search supplier or company...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {isRTL ? 'لا يوجد موردين مسجلين' : 'No suppliers found'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSuppliers.map(s => (
              <div
                key={s.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 hover:border-amber-500/50 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{s.name}</h3>
                    {s.company && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">{s.company}</p>
                    )}
                  </div>
                  <Badge variant={s.currentBalance > 0 ? 'warning' : 'completed'}>
                    {s.currentBalance > 0 ? (isRTL ? 'مستحق له' : 'Payable') : (isRTL ? 'خالص' : 'Settled')}
                  </Badge>
                </div>

                <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400 font-mono">
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{s.phone}</span>
                  </p>
                  {s.email && (
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span className="truncate">{s.email}</span>
                    </p>
                  )}
                </div>

                {/* Balances */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">{isRTL ? 'التوريدات' : 'Purchased'}</span>
                    <span className="font-bold text-stone-800 dark:text-stone-200">{formatCurrency(s.totalPurchases, 'EGP', language)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">{isRTL ? 'الرصيد المتبقي له' : 'Payable Balance'}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(s.currentBalance, 'EGP', language)}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<FileText className="w-3.5 h-3.5" />}
                    onClick={() => setStatementSupplier(s)}
                  >
                    {t.supplierStatement}
                  </Button>

                  <div className="flex items-center gap-1">
                    <button onClick={() => handleOpenEdit(s)} className="p-1 hover:text-amber-500 text-stone-400">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteId(s.id)} className="p-1 hover:text-rose-500 text-stone-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add / Edit Supplier Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editingSupplier ? t.edit : t.addSupplier}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.supplier + ' (Name)'}
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Suez Cement Group"
            />
            <Input
              label={t.company}
              value={form.company}
              onChange={e => setForm({ ...form, company: e.target.value })}
              placeholder="e.g. Suez Cement S.A.E."
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

      {/* Supplier Statement Modal (Requirement #14) */}
      {statementSupplier && (
        <Modal
          isOpen={!!statementSupplier}
          onClose={() => {
            setStatementSupplier(null);
            if (onClearSelectedSupplier) onClearSelectedSupplier();
          }}
          title={`${t.supplierStatement}: ${statementSupplier.name}`}
          subtitle={`${statementSupplier.company ? statementSupplier.company + ' • ' : ''}${statementSupplier.phone}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-stone-50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 text-xs font-mono">
              <div>
                <span className="text-stone-400 block font-sans">{isRTL ? 'إجمالي التوريدات' : 'Total Purchases'}</span>
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">{formatCurrency(statementSupplier.totalPurchases, 'EGP', language)}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans">{isRTL ? 'إجمالي المسدد له' : 'Total Paid'}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(statementSupplier.totalPaid, 'EGP', language)}</span>
              </div>
              <div>
                <span className="text-stone-400 block font-sans">{isRTL ? 'المتبقي المستحق للمورد' : 'Payable Balance'}</span>
                <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(statementSupplier.currentBalance, 'EGP', language)}</span>
              </div>
            </div>

            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              {isRTL ? 'سجل فواتير التوريدات والمشتريات' : 'Purchase Invoices Log'}
            </h4>
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                  <tr>
                    <th className="p-3">{t.invoiceNumber}</th>
                    <th className="p-3">{t.projects}</th>
                    <th className="p-3">{t.category}</th>
                    <th className="p-3">{t.date}</th>
                    <th className="p-3">{t.total}</th>
                    <th className="p-3">{t.paid}</th>
                    <th className="p-3">{t.remaining}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                  {supplierPurchases.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-stone-400 font-sans">{t.noData}</td>
                    </tr>
                  ) : (
                    supplierPurchases.map(p => (
                      <tr key={p.id}>
                        <td className="p-3 font-bold text-amber-500">{p.invoiceNumber}</td>
                        <td className="p-3 font-sans text-stone-700 dark:text-stone-300">{p.projectName || '-'}</td>
                        <td className="p-3 font-sans text-stone-500">{p.category}</td>
                        <td className="p-3">{formatDate(p.date, language)}</td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(p.total, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(p.paid, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(p.remaining, 'EGP', language)}</td>
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
              <Button variant="secondary" size="sm" onClick={() => setStatementSupplier(null)}>
                {t.close}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDeleteSupplier(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
