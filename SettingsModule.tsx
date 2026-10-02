import React, { useState } from 'react';
import { Settings, Save, RefreshCw, Trash2, Database, Building2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { CompanySettings } from '../../types/index.ts';

interface SettingsModuleProps {
  settings: CompanySettings;
  onUpdateSettings: (newSettings: Partial<CompanySettings>) => Promise<void>;
  onSeedDemoData: () => Promise<void>;
  onResetDatabase: () => Promise<void>;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  settings,
  onUpdateSettings,
  onSeedDemoData,
  onResetDatabase
}) => {
  const { t, isRTL } = useLanguage();
  const { can } = useAuth();

  const [form, setForm] = useState<CompanySettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onUpdateSettings(form);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    try {
      await onSeedDemoData();
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-amber-500" />
          {t.settingsTitle}
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
          {t.settingsSubtitle}
        </p>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          {t.successOperation}
        </div>
      )}

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-500" />
            {t.companyProfile}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.companyNameEn}
              required
              value={form.companyName}
              onChange={e => setForm({ ...form, companyName: e.target.value })}
            />
            <Input
              label={t.companyNameAr}
              required
              value={form.companyNameAr}
              onChange={e => setForm({ ...form, companyNameAr: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.taxNumber}
              required
              value={form.taxNumber}
              onChange={e => setForm({ ...form, taxNumber: e.target.value })}
            />
            <Input
              label={t.commercialRegister}
              required
              value={form.commercialRegister}
              onChange={e => setForm({ ...form, commercialRegister: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.phone}
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

          <Input
            label={t.address}
            value={form.address}
            onChange={e => setForm({ ...form, address: e.target.value })}
          />
        </Card>

        {/* Financial & Invoicing Defaults */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {isRTL ? 'إعدادات الفوترة والعملة والمحاسبة' : 'Invoicing & Financial Parameters'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.currency}
              required
              value={form.currency}
              onChange={e => setForm({ ...form, currency: e.target.value })}
            />
            <Input
              label={t.invoicePrefix}
              required
              value={form.invoicePrefix}
              onChange={e => setForm({ ...form, invoicePrefix: e.target.value })}
            />
            <Input
              label={t.fiscalYear}
              value={form.fiscalYear}
              onChange={e => setForm({ ...form, fiscalYear: e.target.value })}
            />
          </div>
        </Card>

        {can('manage_settings') && (
          <div className="flex justify-end">
            <Button variant="gold" type="submit" loading={isSaving} icon={<Save className="w-4 h-4" />}>
              {t.save}
            </Button>
          </div>
        )}
      </form>

      {/* Demo Data & Database Management (Requirements #36 & #40) */}
      <Card className="space-y-4 border-amber-500/30">
        <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
          <Database className="w-4 h-4 text-amber-500" />
          {t.demoDataSection}
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400">
          {isRTL 
            ? 'يمكنك التبديل بين بيئة تجريبية جاهزة بكامل الحسابات الإنشائية، أو تصفير النظام تماماً لبدء العمل الحقيقي للشركة من الصفر.' 
            : 'Switch between realistic Egyptian multi-partner construction demo data or clear back to an empty production state.'}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          
          {/* Seed Button Card */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
            <h4 className="text-sm font-bold text-amber-700 dark:text-amber-400">
              {t.seedDemoDataBtn}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {t.seedDemoDataDesc}
            </p>
            <Button
              variant="primary"
              size="sm"
              loading={isSeeding}
              icon={<RefreshCw className="w-4 h-4" />}
              onClick={() => setShowSeedConfirm(true)}
            >
              {isRTL ? 'تحميل البيانات' : 'Load Demo Records'}
            </Button>
          </div>

          {/* Reset Button Card */}
          <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/20 space-y-3">
            <h4 className="text-sm font-bold text-rose-700 dark:text-rose-400">
              {t.resetDatabaseBtn}
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
              {t.resetDatabaseDesc}
            </p>
            <Button
              variant="danger"
              size="sm"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => setShowResetConfirm(true)}
            >
              {isRTL ? 'تصفير البيانات' : 'Wipe Database'}
            </Button>
          </div>

        </div>
      </Card>

      {/* Confirmations */}
      <ConfirmDialog
        isOpen={showSeedConfirm}
        onClose={() => setShowSeedConfirm(false)}
        onConfirm={handleSeed}
        title={t.seedDemoDataBtn}
        message={isRTL ? 'هل ترغب في تحميل البيانات التجريبية للمشاريع والشركاء والبنوك؟' : 'Load realistic Egyptian construction demo data into database?'}
        confirmText={isRTL ? 'تحميل' : 'Load'}
        danger={false}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={onResetDatabase}
        title={t.resetDatabaseBtn}
        message={isRTL ? 'تحذير: سيتم حذف جميع الفواتير والمشاريع والمصروفات والشركاء والبدء بقاعدة بيانات فارغة تماماً!' : 'Warning: All transactions, projects, partners, and invoices will be wiped. Proceed?'}
        confirmText={isRTL ? 'تصفير الكل' : 'Wipe Clean'}
        danger={true}
      />

    </div>
  );
};
