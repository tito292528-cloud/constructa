import React, { useState } from 'react';
import { HardHat, Plus, Search, DollarSign, Phone, Edit2, Trash2 } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import type { Employee, Project, BankAccount } from '../../types/index.ts';

interface EmployeesModuleProps {
  employees: Employee[];
  projects: Project[];
  bankAccounts: BankAccount[];
  onCreateEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => Promise<void>;
  onRecordPayment: (employeeId: string, amount: number, paymentMethod: 'cash' | 'bank', sourceId: string, date: string, projectId?: string) => Promise<void>;
}

export const EmployeesModule: React.FC<EmployeesModuleProps> = ({
  employees,
  projects,
  bankAccounts,
  onCreateEmployee,
  onRecordPayment
}) => {
  const { t, language, isRTL } = useLanguage();
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [paymentEmployee, setPaymentEmployee] = useState<Employee | null>(null);

  const [form, setForm] = useState({
    name: '',
    jobTitle: '',
    phone: '',
    type: 'monthly' as 'monthly' | 'daily',
    rate: 0,
    assignedProjectId: projects[0]?.id || '',
    status: 'active' as 'active' | 'inactive'
  });

  const [payForm, setPayForm] = useState({
    amount: 0,
    paymentMethod: 'cash' as 'cash' | 'bank',
    sourceId: bankAccounts[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    projectId: ''
  });

  const filtered = employees.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.jobTitle.toLowerCase().includes(search.toLowerCase()) ||
    e.phone.includes(search)
  );

  const totalPaidAll = employees.reduce((s, e) => s + (e.totalPaid || 0), 0);

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.jobTitle || form.rate <= 0) return;

    const pr = projects.find(p => p.id === form.assignedProjectId);

    await onCreateEmployee({
      ...form,
      assignedProjectName: pr ? pr.name : undefined,
      totalPaid: 0
    });

    setShowAdd(false);
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentEmployee || payForm.amount <= 0) return;

    await onRecordPayment(
      paymentEmployee.id,
      payForm.amount,
      payForm.paymentMethod,
      payForm.sourceId,
      payForm.date,
      payForm.projectId || paymentEmployee.assignedProjectId
    );

    setPaymentEmployee(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <HardHat className="w-6 h-6 text-amber-500" />
            {t.employeesTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.employeesSubtitle}
          </p>
        </div>

        <Button variant="gold" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setShowAdd(true)}>
          {t.addEmployee}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title={isRTL ? 'إجمالي العمالة والمهندسين' : 'Total Workforce'}
          value={employees.length}
          subtitle={`${employees.filter(e => e.status === 'active').length} ${isRTL ? 'على رأس العمل' : 'Active'}`}
          icon={<HardHat className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          title={isRTL ? 'إجمالي الرواتب واليوميات المنصرفة' : 'Total Wages Paid'}
          value={formatCurrency(totalPaidAll, 'EGP', language)}
          subtitle={isRTL ? 'تكاليف عمالة مباشرة' : 'Direct labor costs'}
          icon={<DollarSign className="w-5 h-5" />}
          color="rose"
        />
        <StatCard
          title={isRTL ? 'عمالة شهرية / يومية' : 'Monthly vs Daily'}
          value={`${employees.filter(e => e.type === 'monthly').length} / ${employees.filter(e => e.type === 'daily').length}`}
          subtitle={isRTL ? 'تصنيف عقود العمل' : 'Staff vs Site daily labor'}
          icon={<HardHat className="w-5 h-5" />}
          color="blue"
        />
      </div>

      <Card className="space-y-4">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث بالاسم أو المهنة...' : 'Search staff or role...'}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400">
            {t.noData}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(emp => (
              <div
                key={emp.id}
                className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/60 hover:border-amber-500/50 transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">{emp.name}</h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">{emp.jobTitle}</p>
                  </div>
                  <Badge variant={emp.status === 'active' ? 'active' : 'draft'}>{emp.status}</Badge>
                </div>

                <div className="space-y-1 text-xs text-stone-500 dark:text-stone-400">
                  <p className="flex items-center gap-2 font-mono">
                    <Phone className="w-3.5 h-3.5 text-stone-400" />
                    <span>{emp.phone}</span>
                  </p>
                  <p>{t.assignedProject}: <strong className="text-stone-700 dark:text-stone-300">{emp.assignedProjectName || '-'}</strong></p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 dark:border-stone-800 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">{emp.type === 'monthly' ? t.monthly : t.daily}</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(emp.rate, 'EGP', language)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-400 block font-sans">{isRTL ? 'إجمالي المنصرف له' : 'Total Paid'}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(emp.totalPaid, 'EGP', language)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<DollarSign className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setPaymentEmployee(emp);
                      setPayForm({
                        amount: emp.rate,
                        paymentMethod: 'cash',
                        sourceId: bankAccounts[0]?.id || '',
                        date: new Date().toISOString().split('T')[0],
                        projectId: emp.assignedProjectId || ''
                      });
                    }}
                  >
                    {isRTL ? 'صرف راتب / يومية' : 'Pay Wage'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        title={t.addEmployee}
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <Input
            label={t.employees + ' (Name)'}
            required
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Eng. Tamer Galal"
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t.jobTitle}
              required
              value={form.jobTitle}
              onChange={e => setForm({ ...form, jobTitle: e.target.value })}
              placeholder="e.g. Senior Site Engineer"
            />
            <Input
              label={t.phone}
              required
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select
              label={t.wageType}
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as any })}
              options={[
                { value: 'monthly', label: t.monthly },
                { value: 'daily', label: t.daily }
              ]}
            />
            <Input
              label={t.rate + ' (EGP)'}
              type="number"
              required
              value={form.rate || ''}
              onChange={e => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <Select
            label={t.assignedProject}
            value={form.assignedProjectId}
            onChange={e => setForm({ ...form, assignedProjectId: e.target.value })}
            options={[
              { value: '', label: '-- None --' },
              ...projects.map(p => ({ value: p.id, label: p.name }))
            ]}
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

      {/* Wage Payment Modal */}
      {paymentEmployee && (
        <Modal
          isOpen={!!paymentEmployee}
          onClose={() => setPaymentEmployee(null)}
          title={`${isRTL ? 'صرف مستحقات عمالة' : 'Record Labor Wage'}: ${paymentEmployee.name}`}
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
                  { value: 'cash', label: isRTL ? 'نقدًا من الخزينة' : 'Cashbox' },
                  { value: 'bank', label: isRTL ? 'تحويل بنكي' : 'Bank Transfer' }
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
            <Select
              label={isRTL ? 'تحميل التكلفة على المشروع' : 'Charge to Project'}
              value={payForm.projectId}
              onChange={e => setPayForm({ ...payForm, projectId: e.target.value })}
              options={[
                { value: '', label: '-- None (General Overhead) --' },
                ...projects.map(p => ({ value: p.id, label: p.name }))
              ]}
            />

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
              <Button variant="outline" type="button" onClick={() => setPaymentEmployee(null)}>
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
