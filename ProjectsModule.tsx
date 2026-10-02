import React, { useState } from 'react';
import { 
  FolderKanban, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  ExternalLink, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  ShoppingBag, 
  Hammer, 
  Boxes, 
  Printer, 
  Calendar,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { formatCurrency, formatDate, formatPercent } from '../../lib/formatters.ts';
import { Card, StatCard, Badge } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Modal } from '../ui/Modal.tsx';
import { Input, Select } from '../ui/Input.tsx';
import { ConfirmDialog } from '../ui/EmptyState.tsx';
import type { 
  Project, 
  ProjectStatus, 
  Client, 
  Expense, 
  Purchase, 
  Invoice, 
  SubcontractorContract, 
  InventoryTransaction 
} from '../../types/index.ts';

interface ProjectsModuleProps {
  projects: Project[];
  clients: Client[];
  expenses: Expense[];
  purchases: Purchase[];
  invoices: Invoice[];
  subcontractorContracts: SubcontractorContract[];
  inventoryTransactions: InventoryTransaction[];
  selectedProjectId?: string | null;
  onClearSelectedProject?: () => void;
  onCreateProject: (project: Omit<Project, 'id' | 'createdAt'>) => Promise<void>;
  onUpdateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
}

export const ProjectsModule: React.FC<ProjectsModuleProps> = ({
  projects,
  clients,
  expenses,
  purchases,
  invoices,
  subcontractorContracts,
  inventoryTransactions,
  selectedProjectId,
  onClearSelectedProject,
  onCreateProject,
  onUpdateProject,
  onDeleteProject
}) => {
  const { t, language, isRTL } = useLanguage();
  const { can } = useAuth();

  // Active view state
  const [activeProjectId, setActiveProjectId] = useState<string | null>(selectedProjectId || null);
  const [projectTab, setProjectTab] = useState<'overview' | 'financials' | 'expenses' | 'purchases' | 'invoices' | 'subcontractors' | 'materials'>('overview');
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals state
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // Form state
  const [projectForm, setProjectForm] = useState({
    code: '',
    name: '',
    nameAr: '',
    clientId: '',
    clientName: '',
    contractValue: 0,
    startDate: new Date().toISOString().split('T')[0],
    expectedEndDate: '',
    projectManager: '',
    status: 'Active' as ProjectStatus,
    progress: 0,
    expectedCost: 0,
    location: '',
    notes: ''
  });

  // Filter projects list
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.clientName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeProject = projects.find(p => p.id === activeProjectId);

  // Handlers
  const handleOpenAdd = () => {
    setProjectForm({
      code: `PRJ-${new Date().getFullYear()}-${String(projects.length + 1).padStart(2, '0')}`,
      name: '',
      nameAr: '',
      clientId: clients[0]?.id || '',
      clientName: clients[0]?.name || '',
      contractValue: 0,
      startDate: new Date().toISOString().split('T')[0],
      expectedEndDate: '',
      projectManager: '',
      status: 'Active',
      progress: 0,
      expectedCost: 0,
      location: '',
      notes: ''
    });
    setEditingProject(null);
    setShowAddProject(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setProjectForm({
      code: p.code,
      name: p.name,
      nameAr: p.nameAr || '',
      clientId: p.clientId,
      clientName: p.clientName,
      contractValue: p.contractValue,
      startDate: p.startDate,
      expectedEndDate: p.expectedEndDate,
      projectManager: p.projectManager,
      status: p.status,
      progress: p.progress,
      expectedCost: p.expectedCost,
      location: p.location || '',
      notes: p.notes || ''
    });
    setShowAddProject(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.code || !projectForm.name || !projectForm.clientId) return;

    const client = clients.find(c => c.id === projectForm.clientId);
    const data = {
      ...projectForm,
      clientName: client ? client.name : projectForm.clientName,
      actualCost: editingProject?.actualCost || 0,
      totalInvoiced: editingProject?.totalInvoiced || 0,
      totalCollected: editingProject?.totalCollected || 0
    };

    if (editingProject) {
      await onUpdateProject(editingProject.id, data);
    } else {
      await onCreateProject(data);
    }
    setShowAddProject(false);
  };

  // If viewing a single project detail
  if (activeProject) {
    const projectExpenses = expenses.filter(e => e.projectId === activeProject.id);
    const projectPurchases = purchases.filter(p => p.projectId === activeProject.id);
    const projectInvoices = invoices.filter(i => i.projectId === activeProject.id);
    const projectSubcontracts = subcontractorContracts.filter(c => c.projectId === activeProject.id);
    const projectMaterials = inventoryTransactions.filter(t => t.projectId === activeProject.id && t.type === 'out');

    // Job costing calculations (Requirement #11)
    const materialCost = projectPurchases.filter(p => p.category === 'Materials').reduce((s, p) => s + p.total, 0)
      + projectMaterials.reduce((s, m) => s + m.totalCost, 0);
    const equipmentCost = projectPurchases.filter(p => p.category === 'Equipment').reduce((s, p) => s + p.total, 0)
      + projectExpenses.filter(e => e.category === 'Equipment').reduce((s, e) => s + e.amount, 0);
    const subcontractorCost = projectSubcontracts.reduce((s, c) => s + (c.paid || 0), 0);
    const laborCost = projectExpenses.filter(e => e.category === 'Labor').reduce((s, e) => s + e.amount, 0);
    const transportCost = projectExpenses.filter(e => e.category === 'Transportation').reduce((s, e) => s + e.amount, 0);
    const otherCost = projectExpenses.filter(e => !['Equipment', 'Labor', 'Transportation'].includes(e.category)).reduce((s, e) => s + e.amount, 0);

    const directJobCost = materialCost + equipmentCost + subcontractorCost + laborCost + transportCost + otherCost;
    const projectGrossProfit = activeProject.contractValue - directJobCost;
    
    // Applying company overhead (5% default)
    const allocatedOverhead = activeProject.contractValue * 0.05;
    const projectNetProfit = projectGrossProfit - allocatedOverhead;

    return (
      <div className="space-y-6">
        
        {/* Project Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  setActiveProjectId(null);
                  if (onClearSelectedProject) onClearSelectedProject();
                }}
              >
                ← {t.back}
              </Button>
              <span className="font-mono text-xs font-bold text-amber-500">[{activeProject.code}]</span>
              <Badge variant={activeProject.status === 'Active' ? 'active' : activeProject.status === 'Completed' ? 'completed' : 'pending'}>
                {activeProject.status}
              </Badge>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
              {isRTL && activeProject.nameAr ? activeProject.nameAr : activeProject.name}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              {t.client}: <strong className="text-stone-800 dark:text-stone-200">{activeProject.clientName}</strong> • {t.projectManager}: <strong className="text-stone-800 dark:text-stone-200">{activeProject.projectManager}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
              {t.print}
            </Button>
            {can('manage_projects') && (
              <Button variant="primary" size="sm" icon={<Edit2 className="w-4 h-4" />} onClick={() => handleOpenEdit(activeProject)}>
                {t.edit}
              </Button>
            )}
          </div>
        </div>

        {/* Project Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-stone-200 dark:border-stone-800 text-xs">
          {[
            { id: 'overview', label: t.overviewTab },
            { id: 'financials', label: t.financialsTab },
            { id: 'expenses', label: `${t.expensesTab} (${projectExpenses.length})` },
            { id: 'purchases', label: `${t.purchasesTab} (${projectPurchases.length})` },
            { id: 'invoices', label: `${t.invoicesTab} (${projectInvoices.length})` },
            { id: 'subcontractors', label: `${t.subcontractorsTab} (${projectSubcontracts.length})` },
            { id: 'materials', label: `${t.materialsTab} (${projectMaterials.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setProjectTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                projectTab === tab.id
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-xs'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {projectTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Top Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title={t.contractValue}
                value={formatCurrency(activeProject.contractValue, 'EGP', language)}
                subtitle={isRTL ? 'إجمالي قيمة العقد المعتمد' : 'Agreed contract value'}
                icon={<Building2 className="w-5 h-5" />}
                color="amber"
              />
              <StatCard
                title={t.actualCost}
                value={formatCurrency(directJobCost || activeProject.actualCost, 'EGP', language)}
                subtitle={isRTL ? 'تكلفة التوريدات والعمالة المنصرفة' : 'Direct job costs recorded'}
                icon={<DollarSign className="w-5 h-5" />}
                color="rose"
              />
              <StatCard
                title={t.projectGrossProfit}
                value={formatCurrency(projectGrossProfit, 'EGP', language)}
                subtitle={`${formatPercent((projectGrossProfit / (activeProject.contractValue || 1)) * 100)} ${isRTL ? 'هامش ربح' : 'Margin'}`}
                icon={<TrendingUp className="w-5 h-5" />}
                color={projectGrossProfit >= 0 ? 'emerald' : 'rose'}
              />
              <StatCard
                title={t.progress}
                value={`${activeProject.progress}%`}
                subtitle={`${formatDate(activeProject.startDate, language)} → ${formatDate(activeProject.expectedEndDate, language)}`}
                icon={<Clock className="w-5 h-5" />}
                color="blue"
              />
            </div>

            {/* Site details & Progress card */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 space-y-4">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isRTL ? 'نسبة الإنجاز الهندسي والجدول الزمني' : 'Site Execution & Milestones Progress'}
                </h3>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-stone-500 dark:text-stone-400">{isRTL ? 'إنجاز الأعمال بالموقع' : 'Completed Works'}</span>
                    <span className="font-bold text-amber-500 font-mono">{activeProject.progress}%</span>
                  </div>
                  <div className="h-4 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden p-0.5">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                      style={{ width: `${activeProject.progress}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t border-stone-200 dark:border-stone-800 text-xs">
                  <div>
                    <span className="text-stone-400 block">{t.startDate}</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200 font-mono">
                      {formatDate(activeProject.startDate, language)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">{t.expectedEndDate}</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200 font-mono">
                      {formatDate(activeProject.expectedEndDate, language)}
                    </span>
                  </div>
                  <div>
                    <span className="text-stone-400 block">{t.location}</span>
                    <span className="font-semibold text-stone-800 dark:text-stone-200">
                      {activeProject.location || '-'}
                    </span>
                  </div>
                </div>

                {activeProject.notes && (
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40 text-xs text-stone-600 dark:text-stone-300">
                    <p className="font-bold text-stone-400 mb-1">{t.notes}:</p>
                    <p>{activeProject.notes}</p>
                  </div>
                )}
              </Card>

              {/* Collections vs Billing */}
              <Card className="space-y-4">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                  {isRTL ? 'الفوترة والتحصيل' : 'Invoiced vs Collected'}
                </h3>
                
                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-stone-400 block">{isRTL ? 'إجمالي المستخلصات المصدرة' : 'Total Invoiced'}</span>
                    <span className="text-base font-bold text-stone-900 dark:text-stone-100 font-mono">
                      {formatCurrency(activeProject.totalInvoiced, 'EGP', language)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-stone-400 block">{isRTL ? 'إجمالي المحصل نقداً / بنك' : 'Total Collected'}</span>
                    <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {formatCurrency(activeProject.totalCollected, 'EGP', language)}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-stone-400 block">{isRTL ? 'المتبقي تحت التحصيل' : 'Pending Collection'}</span>
                    <span className="text-base font-bold text-rose-600 dark:text-rose-400 font-mono">
                      {formatCurrency(Math.max(0, (activeProject.totalInvoiced || 0) - (activeProject.totalCollected || 0)), 'EGP', language)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

          </div>
        )}

        {/* TAB 2: FINANCIAL LOGIC BREAKDOWN (Requirement #11) */}
        {projectTab === 'financials' && (
          <Card className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
                <span className="w-2 h-5 bg-amber-500 rounded-full inline-block"></span>
                {isRTL ? 'هيكل التكاليف التراكمية وحساب ربحية المشروع' : 'Project Financial Logic & Cost Breakdown'}
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {isRTL 
                  ? 'قيمة العقد مطروحاً منها: تكلفة المواد، العمالة، مقاولو الباطن، المعدات، والنقل = مجمل ربح المشروع، ثم خصم نسبة الأوفرهيد العامة = صافي ربح المشروع.' 
                  : 'Contract Value - (Material + Labor + Subcontractor + Equipment + Transportation + Other) = Gross Profit, then Overhead = Net Profit.'}
              </p>
            </div>

            {/* Financial formula table */}
            <div className="rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
              <table className="w-full text-xs text-left rtl:text-right">
                <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                  <tr>
                    <th className="p-3.5">{isRTL ? 'البند المالي' : 'Financial Line Item'}</th>
                    <th className="p-3.5">{isRTL ? 'المصدر المحاسبي' : 'Source'}</th>
                    <th className="p-3.5 text-right rtl:text-left">{isRTL ? 'القيمة (EGP)' : 'Amount (EGP)'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                  
                  {/* Contract Value */}
                  <tr className="bg-amber-500/5 font-bold">
                    <td className="p-3.5 text-stone-900 dark:text-stone-100 font-sans">{t.contractValue} (+)</td>
                    <td className="p-3.5 text-stone-400 font-sans">{t.contracts}</td>
                    <td className="p-3.5 text-right rtl:text-left text-amber-600 dark:text-amber-400 text-sm">
                      {formatCurrency(activeProject.contractValue, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Material Cost */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'تكلفة المواد والتوريدات (حديد، أسمنت، خرسانة...)' : 'Material Costs (Rebar, Cement, Concrete)'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.purchases} + {t.inventory}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(materialCost, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Labor Cost */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'أجور العمالة المباشرة ويوميات الموقع' : 'Direct Site Labor Wages'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.employees} + {t.expenses}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(laborCost, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Subcontractors Cost */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'مستحقات مقاولي الباطن (كهرباء، سباكة، مصنعية)' : 'Subcontractor Trade Costs'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.subcontractors}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(subcontractorCost, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Equipment Cost */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'إيجار وصيانة المعدات والأوناش الثقيلة' : 'Heavy Equipment & Crane Rentals'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.expenses}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(equipmentCost, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Transportation Cost */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'نقل وتشوين المواد والمشاحيل' : 'Transportation & Site Haulage'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.expenses}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(transportCost, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Other Job Expenses */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'مصروفات ونثريات الموقع الأخرى' : 'Other Direct Site Expenses'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.expenses}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(otherCost, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Gross Profit Result */}
                  <tr className="bg-stone-100 dark:bg-stone-800/80 font-black text-sm">
                    <td className="p-3.5 text-stone-900 dark:text-stone-100 font-sans">
                      = {t.projectGrossProfit}
                    </td>
                    <td className="p-3.5 text-stone-500 font-sans">{isRTL ? 'مجمل الربح قبل المصاريف العمومية' : 'Gross Margin'}</td>
                    <td className={`p-3.5 text-right rtl:text-left ${projectGrossProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(projectGrossProfit, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Allocated Company Overhead */}
                  <tr>
                    <td className="p-3 text-stone-700 dark:text-stone-300 font-sans">
                      - {isRTL ? 'حصة المشروع من المصروفات الإدارية العامة للشركة (5%)' : 'Allocated Company Overhead (5%)'}
                    </td>
                    <td className="p-3 text-stone-400 font-sans">{t.settings}</td>
                    <td className="p-3 text-right rtl:text-left text-rose-600 dark:text-rose-400">
                      - {formatCurrency(allocatedOverhead, 'EGP', language)}
                    </td>
                  </tr>

                  {/* Net Profit Result */}
                  <tr className="bg-amber-500/10 font-black text-base border-t-2 border-amber-500">
                    <td className="p-4 text-stone-950 dark:text-amber-400 font-sans">
                      = {t.projectNetProfit}
                    </td>
                    <td className="p-4 text-amber-700 dark:text-amber-300 font-sans">
                      {formatPercent((projectNetProfit / (activeProject.contractValue || 1)) * 100)} {isRTL ? 'صافي العائد' : 'Net Margin'}
                    </td>
                    <td className={`p-4 text-right rtl:text-left ${projectNetProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {formatCurrency(projectNetProfit, 'EGP', language)}
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* TAB 3: PROJECT EXPENSES */}
        {projectTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                {t.expensesTab} ({projectExpenses.length})
              </h3>
            </div>
            {projectExpenses.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                {t.noExpensesYet}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                    <tr>
                      <th className="p-3">{t.date}</th>
                      <th className="p-3">{t.category}</th>
                      <th className="p-3">{t.description}</th>
                      <th className="p-3">{t.paymentMethod}</th>
                      <th className="p-3">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                    {projectExpenses.map(e => (
                      <tr key={e.id}>
                        <td className="p-3">{formatDate(e.date, language)}</td>
                        <td className="p-3 font-sans font-semibold text-stone-800 dark:text-stone-200">{e.category}</td>
                        <td className="p-3 font-sans text-stone-500">{e.description}</td>
                        <td className="p-3 font-sans uppercase text-[10px]">{e.paymentMethod}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(e.amount, 'EGP', language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PURCHASES */}
        {projectTab === 'purchases' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t.purchasesTab} ({projectPurchases.length})
            </h3>
            {projectPurchases.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                {t.noPurchasesYet}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                    <tr>
                      <th className="p-3">{t.invoiceNumber}</th>
                      <th className="p-3">{t.supplier}</th>
                      <th className="p-3">{t.category}</th>
                      <th className="p-3">{t.date}</th>
                      <th className="p-3">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                    {projectPurchases.map(p => (
                      <tr key={p.id}>
                        <td className="p-3 font-bold text-amber-500">{p.invoiceNumber}</td>
                        <td className="p-3 font-sans font-semibold text-stone-800 dark:text-stone-200">{p.supplierName}</td>
                        <td className="p-3 font-sans text-stone-500">{p.category}</td>
                        <td className="p-3">{formatDate(p.date, language)}</td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">
                          {formatCurrency(p.total, 'EGP', language)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 5: INVOICES */}
        {projectTab === 'invoices' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t.invoicesTab} ({projectInvoices.length})
            </h3>
            {projectInvoices.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                {t.noInvoicesYet}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
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
                    {projectInvoices.map(i => (
                      <tr key={i.id}>
                        <td className="p-3 font-bold text-amber-500">{i.invoiceNumber}</td>
                        <td className="p-3">{formatDate(i.date, language)}</td>
                        <td className="p-3 font-bold text-stone-900 dark:text-stone-100">{formatCurrency(i.total, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(i.paid, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(i.remaining, 'EGP', language)}</td>
                        <td className="p-3 font-sans">
                          <Badge variant={i.status === 'Paid' ? 'completed' : 'pending'}>
                            {i.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: SUBCONTRACTORS */}
        {projectTab === 'subcontractors' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t.subcontractorsTab} ({projectSubcontracts.length})
            </h3>
            {projectSubcontracts.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                {isRTL ? 'لا توجد عقود باطن مسجلة لهذا المشروع' : 'No subcontracts registered for this project'}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                    <tr>
                      <th className="p-3">{isRTL ? 'المقاول' : 'Subcontractor'}</th>
                      <th className="p-3">{t.contractValue}</th>
                      <th className="p-3">{t.paid}</th>
                      <th className="p-3">{t.remaining}</th>
                      <th className="p-3">{t.progress}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                    {projectSubcontracts.map(sc => (
                      <tr key={sc.id}>
                        <td className="p-3 font-sans font-semibold text-stone-800 dark:text-stone-200">{sc.subcontractorName}</td>
                        <td className="p-3">{formatCurrency(sc.contractValue, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(sc.paid, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(sc.remaining, 'EGP', language)}</td>
                        <td className="p-3">{sc.progress}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: MATERIALS */}
        {projectTab === 'materials' && (
          <div className="space-y-4">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
              {t.materialsTab} ({projectMaterials.length})
            </h3>
            {projectMaterials.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-900/40 rounded-xl border border-dashed border-stone-200 dark:border-stone-800">
                {isRTL ? 'لا توجد أذونات صرف مواد مسجلة لهذا الموقع' : 'No material warehouse dispatches for this project yet'}
              </div>
            ) : (
              <div className="rounded-xl border border-stone-200 dark:border-stone-800 overflow-x-auto">
                <table className="w-full text-xs text-left rtl:text-right">
                  <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400">
                    <tr>
                      <th className="p-3">{t.date}</th>
                      <th className="p-3">{t.materialName}</th>
                      <th className="p-3">{t.quantity}</th>
                      <th className="p-3">{t.unitPrice}</th>
                      <th className="p-3">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800 font-mono">
                    {projectMaterials.map(m => (
                      <tr key={m.id}>
                        <td className="p-3">{formatDate(m.date, language)}</td>
                        <td className="p-3 font-sans font-semibold text-stone-800 dark:text-stone-200">{m.materialName}</td>
                        <td className="p-3">{m.quantity}</td>
                        <td className="p-3">{formatCurrency(m.unitCost, 'EGP', language)}</td>
                        <td className="p-3 font-bold text-rose-600 dark:text-rose-400">{formatCurrency(m.totalCost, 'EGP', language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    );
  }

  // ALL PROJECTS LIST VIEW
  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <FolderKanban className="w-6 h-6 text-amber-500" />
            {t.projectsTitle}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {t.projectsSubtitle}
          </p>
        </div>

        {can('manage_projects') && (
          <Button
            variant="gold"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleOpenAdd}
          >
            {t.addProject}
          </Button>
        )}
      </div>

      {/* Search & Status Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
        <div className="w-full sm:w-72">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={isRTL ? 'بحث بالاسم أو الكود...' : 'Search by code or title...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto text-xs">
          {['all', 'Active', 'Planning', 'On Hold', 'Completed', 'Cancelled'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === status
                  ? 'bg-amber-500 text-stone-950 font-bold'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
              }`}
            >
              {status === 'all' ? t.all : status}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="py-16 text-center text-xs text-stone-400 bg-stone-50 dark:bg-stone-900/40 rounded-2xl border border-dashed border-stone-200 dark:border-stone-800">
          {t.noProjectsYet}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map(project => {
            const grossProfit = (project.contractValue || 0) - (project.actualCost || 0);

            return (
              <Card
                key={project.id}
                className="space-y-4 hover:border-amber-500/50 transition-all cursor-pointer"
                onClick={() => setActiveProjectId(project.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold text-amber-500">[{project.code}]</span>
                    <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      {isRTL && project.nameAr ? project.nameAr : project.name}
                    </h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {project.clientName}
                    </p>
                  </div>
                  <Badge variant={project.status === 'Active' ? 'active' : project.status === 'Completed' ? 'completed' : 'pending'}>
                    {project.status}
                  </Badge>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-stone-500 dark:text-stone-400">{t.progress}</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100">{project.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 rounded-full transition-all duration-300"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                {/* Key Financial figures */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-stone-200 dark:border-stone-800 text-xs">
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-[10px] text-stone-400 block">{t.contractValue}</span>
                    <span className="font-bold text-stone-900 dark:text-stone-100 font-mono">
                      {formatCurrency(project.contractValue, 'EGP', language)}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-stone-50 dark:bg-stone-800/40">
                    <span className="text-[10px] text-stone-400 block">{t.actualCost}</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                      {formatCurrency(project.actualCost, 'EGP', language)}
                    </span>
                  </div>
                </div>

                {/* Footer details */}
                <div className="flex items-center justify-between pt-2 border-t border-stone-200 dark:border-stone-800 text-[11px] text-stone-400">
                  <span>PM: <strong className="text-stone-700 dark:text-stone-300">{project.projectManager}</strong></span>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {can('manage_projects') && (
                      <>
                        <button
                          onClick={() => handleOpenEdit(project)}
                          className="p-1 hover:text-amber-500 rounded"
                          title={t.edit}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setProjectToDelete(project.id)}
                          className="p-1 hover:text-rose-500 rounded"
                          title={t.delete}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Project Modal */}
      <Modal
        isOpen={showAddProject}
        onClose={() => setShowAddProject(false)}
        title={editingProject ? t.edit : t.addProject}
        subtitle={isRTL ? 'إدخال بيانات المشروع، العميل، القيمة التعاقدية والتكلفة المتوقعة' : 'Enter project parameters, client link, and cost projections'}
      >
        <form onSubmit={handleSaveProject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.projectCode}
              required
              value={projectForm.code}
              onChange={e => setProjectForm({ ...projectForm, code: e.target.value })}
              placeholder="PRJ-2026-01"
            />
            <Select
              label={t.client}
              required
              value={projectForm.clientId}
              onChange={e => setProjectForm({ ...projectForm, clientId: e.target.value })}
              options={clients.map(c => ({ value: c.id, label: c.name }))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.projectName + ' (English)'}
              required
              value={projectForm.name}
              onChange={e => setProjectForm({ ...projectForm, name: e.target.value })}
              placeholder="e.g. Al-Andalus Tower"
            />
            <Input
              label={t.projectName + ' (العربية)'}
              value={projectForm.nameAr}
              onChange={e => setProjectForm({ ...projectForm, nameAr: e.target.value })}
              placeholder="مثال: برج الأندلس السكني"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.contractValue + ' (EGP)'}
              type="number"
              required
              value={projectForm.contractValue || ''}
              onChange={e => setProjectForm({ ...projectForm, contractValue: parseFloat(e.target.value) || 0 })}
              placeholder="12500000"
            />
            <Input
              label={t.expectedCost + ' (EGP)'}
              type="number"
              value={projectForm.expectedCost || ''}
              onChange={e => setProjectForm({ ...projectForm, expectedCost: parseFloat(e.target.value) || 0 })}
              placeholder="9500000"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={t.startDate}
              type="date"
              required
              value={projectForm.startDate}
              onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })}
            />
            <Input
              label={t.expectedEndDate}
              type="date"
              value={projectForm.expectedEndDate}
              onChange={e => setProjectForm({ ...projectForm, expectedEndDate: e.target.value })}
            />
            <Select
              label={t.status}
              value={projectForm.status}
              onChange={e => setProjectForm({ ...projectForm, status: e.target.value as ProjectStatus })}
              options={[
                { value: 'Planning', label: 'Planning' },
                { value: 'Active', label: 'Active' },
                { value: 'On Hold', label: 'On Hold' },
                { value: 'Completed', label: 'Completed' },
                { value: 'Cancelled', label: 'Cancelled' }
              ]}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t.projectManager}
              value={projectForm.projectManager}
              onChange={e => setProjectForm({ ...projectForm, projectManager: e.target.value })}
              placeholder="Eng. Tamer Galal"
            />
            <Input
              label={t.progress + ' (%)'}
              type="number"
              min="0"
              max="100"
              value={projectForm.progress}
              onChange={e => setProjectForm({ ...projectForm, progress: parseInt(e.target.value) || 0 })}
            />
          </div>

          <Input
            label={t.location}
            value={projectForm.location}
            onChange={e => setProjectForm({ ...projectForm, location: e.target.value })}
            placeholder="New Cairo, Sector 1"
          />

          <Input
            label={t.notes}
            value={projectForm.notes}
            onChange={e => setProjectForm({ ...projectForm, notes: e.target.value })}
            placeholder={isRTL ? 'تفاصيل هندسية أو ملاحظات الموقع...' : 'Site engineering notes...'}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
            <Button variant="outline" type="button" onClick={() => setShowAddProject(false)}>
              {t.cancel}
            </Button>
            <Button variant="primary" type="submit">
              {t.save}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={() => {
          if (projectToDelete) onDeleteProject(projectToDelete);
        }}
        title={t.delete}
        message={t.confirmDelete}
        confirmText={t.delete}
        cancelText={t.cancel}
      />

    </div>
  );
};
