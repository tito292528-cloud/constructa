import React, { useState } from 'react';
import { Boxes, Plus, Search, AlertTriangle, ArrowDownLeft, ArrowUpRight, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { Material, InventoryTransaction, Project } from '../../types/index.ts';

interface InventoryModuleProps {
  materials: Material[];
  transactions: InventoryTransaction[];
  projects: Project[];
  selectedMaterialId?: string | null;
  onClearSelectedMaterial?: () => void;
  onCreateMaterial: (mat: Omit<Material, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  onCreateTransaction: (data: Omit<InventoryTransaction, 'id' | 'createdAt'>) => Promise<void>;
}

export const InventoryModule: React.FC<InventoryModuleProps> = ({
  materials,
  transactions,
  projects,
  selectedMaterialId,
  onClearSelectedMaterial,
  onCreateMaterial,
  onUpdateMaterial,
  onDeleteMaterial,
  onCreateTransaction
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(
    selectedMaterialId ? materials.find(m => m.id === selectedMaterialId) || null : null
  );

  const [matForm, setMatForm] = useState({
    code: '',
    name: '',
    nameAr: '',
    category: 'Cement & Concrete',
    unit: 'Ton',
    currentQuantity: 0,
    minimumQuantity: 10,
    averageCost: 0,
    lastPurchasePrice: 0
  });

  const [dispatchForm, setDispatchForm] = useState({
    materialId: materials[0]?.id || '',
    type: 'out' as 'in' | 'out' | 'adjustment',
    quantity: 1,
    projectId: projects[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const filteredMaterials = materials.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.code.toLowerCase().includes(search.toLowerCase()) ||
    m.category.toLowerCase().includes(search.toLowerCase())
  );

  // Valuation: SUM(currentQuantity * averageCost)
  const totalValuation = materials.reduce((s, m) => s + ((m.currentQuantity || 0) * (m.averageCost || 0)), 0);
  const lowStockCount = materials.filter(m => (m.currentQuantity || 0) <= (m.minimumQuantity || 0)).length;

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setMatForm({
      code: `MAT-${Date.now().toString().slice(-4)}`,
      name: '',
      nameAr: '',
      category: 'Cement & Concrete',
      unit: 'Ton',
      currentQuantity: 0,
      minimumQuantity: 10,
      averageCost: 0,
      lastPurchasePrice: 0
    });
    setShowAdd(true);
  };

  const handleOpenEdit = (m: Material) => {
    setEditingMaterial(m);
    setMatForm({
      code: m.code,
      name: m.name,
      nameAr: m.nameAr || '',
      category: m.category,
      unit: m.unit,
      currentQuantity: m.currentQuantity,
      minimumQuantity: m.minimumQuantity,
      averageCost: m.averageCost,
      lastPurchasePrice: m.lastPurchasePrice
    });
    setShowAdd(true);
  };

  const handleSaveMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matForm.name || !matForm.code) return;

    if (editingMaterial) {
      await onUpdateMaterial(editingMaterial.id, matForm);
    } else {
      await onCreateMaterial(matForm);
    }
    setShowAdd(false);
  };

  const handleSaveDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dispatchForm.quantity <= 0 || !dispatchForm.materialId) return;

    const mat = materials.find(m => m.id === dispatchForm.materialId);
    const proj = projects.find(p => p.id === dispatchForm.projectId);

    if (dispatchForm.type === 'out' && mat && dispatchForm.quantity > mat.currentQuantity) {
      alert(isRTL ? 'الكمية المطلوبة تتجاوز الرصيد المتوفر بالمستودع!' : 'Requested quantity exceeds warehouse stock!');
      return;
    }

    const unitCost = mat?.averageCost || 0;
    const totalCost = unitCost * dispatchForm.quantity;

    await onCreateTransaction({
      materialId: dispatchForm.materialId,
      materialName: mat ? mat.name : '',
      type: dispatchForm.type,
      quantity: dispatchForm.quantity,
      unitCost,
      totalCost,
      projectId: dispatchForm.type === 'out' ? dispatchForm.projectId : undefined,
      projectName: dispatchForm.type === 'out' && proj ? proj.name : undefined,
      date: dispatchForm.date,
      notes: dispatchForm.notes
    });

    setShowDispatchModal(false);
  };

  const materialMovements = historyMaterial
    ? transactions.filter(t => t.materialId === historyMaterial.id)
    : [];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Boxes className="w-6 h-6 text-amber-500" />
            {t.inventoryTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.inventorySubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {materials.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<ArrowUpRight className="w-4 h-4 text-amber-400" />}
              onClick={() => {
                setDispatchForm({
                  materialId: materials[0].id,
                  type: 'out',
                  quantity: 1,
                  projectId: projects[0]?.id || '',
                  date: new Date().toISOString().split('T')[0],
                  notes: 'Dispatched to construction site'
                });
                setShowDispatchModal(true);
              }}
            >
              {t.stockOut} / {t.stockIn}
            </Button>
          )}

          <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={handleOpenAdd}>
            {t.addMaterial}
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={t.totalValuation}
          value={formatCurrency(totalValuation, 'EGP', language)}
          subtitle={`${materials.length} ${isRTL ? 'أصناف مسجلة' : 'catalog items'}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي الحركات المخزنية' : 'Stock Movements'}
          value={transactions.length}
          subtitle={isRTL ? 'أذونات صرف وتوريد' : 'Dispatches & receipts'}
          icon={<Boxes className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title={t.lowStockWarning}
          value={lowStockCount}
          subtitle={isRTL ? 'أصناف بلغت حد إعادة الطلب' : 'Items at reorder threshold'}
          icon={<AlertTriangle className="w-5 h-5" />}
          color={lowStockCount > 0 ? 'rose' : 'emerald'}
        />
      </div>

      {/* Materials Table */}
      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث بالاسم أو الكود...' : 'Search name or code...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noMaterialsYet}
          </div>
        ) : (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
            <table className="w-full text-xs text-left rtl:text-right">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                <tr>
                  <th className="p-3">{t.materialCode}</th>
                  <th className="p-3">{t.materialName}</th>
                  <th className="p-3">{t.category}</th>
                  <th className="p-3">{t.currentQuantity}</th>
                  <th className="p-3">{t.minimumQuantity}</th>
                  <th className="p-3">{t.averageCost}</th>
                  <th className="p-3">{isRTL ? 'إجمالي القيمة' : 'Total Value'}</th>
                  <th className="p-3 text-center">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                {filteredMaterials.map(m => {
                  const isLow = (m.currentQuantity || 0) <= (m.minimumQuantity || 0);
                  const itemVal = (m.currentQuantity || 0) * (m.averageCost || 0);

                  return (
                    <tr key={m.id} className="hover:bg-stone-50 dark:hover:bg-stone-800/40">
                      <td className="p-3 font-bold text-amber-500">{m.code}</td>
                      <td className="p-3 font-sans font-semibold text-stone-900 dark:text-stone-100">
                        {isRTL && m.nameAr ? m.nameAr : m.name}
                      </td>
                      <td className="p-3 font-sans text-stone-500">{m.category}</td>
                      <td className="p-3 font-bold text-sm">
                        <span className={isLow ? 'text-rose-600 dark:text-rose-400 font-black' : 'text-stone-900 dark:text-stone-100'}>
                          {m.currentQuantity} {m.unit}
                        </span>
                        {isLow && (
                          <span className="ml-2 rtl:mr-2 px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-600 text-[10px] font-sans font-bold">
                            {isRTL ? 'منخفض' : 'Low'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-stone-500">{m.minimumQuantity} {m.unit}</td>
                      <td className="p-3">{formatCurrency(m.averageCost, 'EGP', language)}</td>
                      <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(itemVal, 'EGP', language)}</td>
                      <td className="p-3 text-center font-sans">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setHistoryMaterial(m)}
                            className="p-1 hover:text-amber-500 text-stone-400"
                            title={isRTL ? 'حركة الصنف' : 'Movement History'}
                          >
                            <Boxes className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleOpenEdit(m)} className="p-1 hover:text-amber-500 text-stone-400">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setDeleteId(m.id)} className="p-1 hover:text-rose-500 text-stone-400">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Material Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={editingMaterial ? t.edit : t.addMaterial}
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.materialCode}
              required
              value={matForm.code}
              onChange={e => setMatForm({ ...matForm, code: e.target.value })}
            />
            <Input
              label={t.category}
              value={matForm.category}
              onChange={e => setMatForm({ ...matForm, category: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.materialName + ' (English)'}
              required
              value={matForm.name}
              onChange={e => setMatForm({ ...matForm, name: e.target.value })}
              placeholder="e.g. Steel Rebar 16mm"
            />
            <Input
              label={t.materialName + ' (العربية)'}
              value={matForm.nameAr}
              onChange={e => setMatForm({ ...matForm, nameAr: e.target.value })}
              placeholder="مثال: حديد تسليح ١٦ مم"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.unit}
              required
              value={matForm.unit}
              onChange={e => setMatForm({ ...matForm, unit: e.target.value })}
              placeholder="Ton, m³, bag..."
            />
            <Input
              label={t.currentQuantity}
              type="number"
              value={matForm.currentQuantity || ''}
              onChange={e => setMatForm({ ...matForm, currentQuantity: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.minimumQuantity}
              type="number"
              value={matForm.minimumQuantity || ''}
              onChange={e => setMatForm({ ...matForm, minimumQuantity: parseFloat(e.target.value) || 0 })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.averageCost + ' (EGP)'}
              type="number"
              value={matForm.averageCost || ''}
              onChange={e => setMatForm({ ...matForm, averageCost: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.lastPurchasePrice + ' (EGP)'}
              type="number"
              value={matForm.lastPurchasePrice || ''}
              onChange={e => setMatForm({ ...matForm, lastPurchasePrice: parseFloat(e.target.value) || 0 })}
            />
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

      {/* Stock Movement (Dispatch/Receipt) Modal */}
      <Modal
        isOpen={showDispatchModal}
        onClose={() => setShowDispatchModal(false)}
        title={dispatchForm.type === 'out' ? t.stockOut : t.stockIn}
        subtitle={isRTL ? 'إذن صرف خامات لموقع مشروع مع احتساب تكلفتها على المشروع' : 'Issue material movement and update project cost'}
      >
        <form onSubmit={handleSaveDispatch} className="space-y-4">
          <Select
            label={t.materialName}
            required
            value={dispatchForm.materialId}
            onChange={e => setDispatchForm({ ...dispatchForm, materialId: e.target.value })}
            options={materials.map(m => ({ value: m.id, label: `${m.name} (${m.currentQuantity} ${m.unit} in stock)` }))}
          />

          <Select
            label={t.transactionType}
            value={dispatchForm.type}
            onChange={e => setDispatchForm({ ...dispatchForm, type: e.target.value as any })}
            options={[
              { value: 'out', label: t.stockOut },
              { value: 'in', label: t.stockIn },
              { value: 'adjustment', label: t.stockAdjustment }
            ]}
          />

          {dispatchForm.type === 'out' && (
            <Select
              label={t.projects}
              required
              value={dispatchForm.projectId}
              onChange={e => setDispatchForm({ ...dispatchForm, projectId: e.target.value })}
              options={projects.map(p => ({ value: p.id, label: p.name }))}
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.quantity}
              type="number"
              required
              value={dispatchForm.quantity || ''}
              onChange={e => setDispatchForm({ ...dispatchForm, quantity: parseFloat(e.target.value) || 0 })}
            />
            <Input
              label={t.date}
              type="date"
              required
              value={dispatchForm.date}
              onChange={e => setDispatchForm({ ...dispatchForm, date: e.target.value })}
            />
          </div>

          <Input
            label={t.notes}
            value={dispatchForm.notes}
            onChange={e => setDispatchForm({ ...dispatchForm, notes: e.target.value })}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowDispatchModal(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.confirm}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Movement History Modal */}
      {historyMaterial && (
        <Modal
          isOpen={!!historyMaterial}
          onClose={() => {
            setHistoryMaterial(null);
            if (onClearSelectedMaterial) onClearSelectedMaterial();
          }}
          title={`${isRTL ? 'حركة بطاقة الصنف' : 'Stock Movement Ledger'}: ${historyMaterial.name}`}
          maxWidth="4xl"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500">
                  <tr>
                    <th className="p-3">{t.date}</th>
                    <th className="p-3">{t.transactionType}</th>
                    <th className="p-3">{t.projects}</th>
                    <th className="p-3">{t.quantity}</th>
                    <th className="p-3">{t.unitPrice}</th>
                    <th className="p-3">{t.total}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                  {materialMovements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-stone-400 font-sans">{t.noData}</td>
                    </tr>
                  ) : (
                    materialMovements.map(mv => (
                      <tr key={mv.id}>
                        <td className="p-3">{formatDate(mv.date, language)}</td>
                        <td className="p-3 font-sans font-bold uppercase">
                          <span className={mv.type === 'in' ? 'text-emerald-600' : 'text-amber-500'}>
                            {mv.type === 'in' ? t.stockIn : t.stockOut}
                          </span>
                        </td>
                        <td className="p-3 font-sans text-stone-700 dark:text-stone-300">{mv.projectName || '-'}</td>
                        <td className="p-3 font-bold">{mv.quantity}</td>
                        <td className="p-3">{formatCurrency(mv.unitCost, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(mv.totalCost, 'EGP', language)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setHistoryMaterial(null)}>
                {t.close}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => { if (deleteId) onDeleteMaterial(deleteId); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
      />

    </div>
  );
};
