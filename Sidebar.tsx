import React from 'react';
import { 
  LayoutDashboard, 
  FolderKanban, 
  FileText, 
  Users, 
  Truck, 
  ShoppingBag, 
  Receipt, 
  TrendingDown, 
  Wallet, 
  Landmark, 
  Boxes, 
  HardHat, 
  Hammer, 
  Scale, 
  BarChart3, 
  ShieldCheck, 
  Settings,
  X
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface SidebarProps {
  currentSection: string;
  onSelectSection: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpen,
  onClose
}) => {
  const { t, isRTL } = useLanguage();
  const { can } = useAuth();

  const navigationGroups = [
    {
      groupTitle: isRTL ? 'نظرة عامة' : 'Executive Overview',
      items: [
        { id: 'dashboard', label: t.dashboard, icon: LayoutDashboard }
      ]
    },
    {
      groupTitle: isRTL ? 'إدارة المشاريع والعقود' : 'Projects & Engineering',
      items: [
        { id: 'projects', label: t.projects, icon: FolderKanban },
        { id: 'contracts', label: t.contracts, icon: FileText }
      ]
    },
    {
      groupTitle: isRTL ? 'العملاء والموردون' : 'Stakeholders Directory',
      items: [
        { id: 'clients', label: t.clients, icon: Users },
        { id: 'suppliers', label: t.suppliers, icon: Truck }
      ]
    },
    {
      groupTitle: isRTL ? 'المشتريات والمبيعات' : 'Procurement & Billing',
      items: [
        { id: 'purchases', label: t.purchases, icon: ShoppingBag, perm: 'manage_purchases' },
        { id: 'invoices', label: t.invoices, icon: Receipt, perm: 'manage_invoices' },
        { id: 'expenses', label: t.expenses, icon: TrendingDown, perm: 'manage_expenses' }
      ]
    },
    {
      groupTitle: isRTL ? 'الخزينة والمخزون' : 'Treasury & Inventory',
      items: [
        { id: 'cashbox', label: t.cashbox, icon: Wallet, perm: 'manage_cashbox' },
        { id: 'banks', label: t.banks, icon: Landmark, perm: 'manage_banks' },
        { id: 'inventory', label: t.inventory, icon: Boxes, perm: 'manage_inventory' }
      ]
    },
    {
      groupTitle: isRTL ? 'الشركاء والعمليات' : 'Partners & Field Workforce',
      items: [
        { id: 'partners', label: t.partners, icon: Scale, perm: 'view_partners' },
        { id: 'subcontractors', label: t.subcontractors, icon: Hammer },
        { id: 'employees', label: t.employees, icon: HardHat }
      ]
    },
    {
      groupTitle: isRTL ? 'التقارير والإدارة' : 'Intelligence & System',
      items: [
        { id: 'reports', label: t.reports, icon: BarChart3, perm: 'view_reports' },
        { id: 'audit_logs', label: t.auditLogs, icon: ShieldCheck, perm: 'view_audit_logs' },
        { id: 'settings', label: t.settings, icon: Settings }
      ]
    }
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-950/60 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 z-50 lg:z-30 w-64 bg-stone-900 border-r border-stone-800 rtl:border-r-0 rtl:border-l flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isRTL
            ? isOpen ? 'translate-x-0 right-0' : 'translate-x-full right-0'
            : isOpen ? 'translate-x-0 left-0' : '-translate-x-full left-0'
        }`}
      >
        {/* Sidebar Header (Mobile close button) */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-stone-800 lg:hidden">
          <span className="font-mono font-bold text-amber-500 text-sm tracking-widest">
            CONSTRUCTA
          </span>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-100 rounded-lg hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationGroups.map((group, gIdx) => {
            const filteredItems = group.items.filter(item => !item.perm || can(item.perm));
            if (filteredItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-stone-500 select-none">
                  {group.groupTitle}
                </p>
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentSection === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        onClose();
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-500/20 font-bold'
                          : 'text-stone-300 hover:bg-stone-800 hover:text-stone-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-stone-950' : 'text-stone-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer info */}
        <div className="p-3 border-t border-stone-800/80 bg-stone-950/40">
          <div className="p-2.5 rounded-xl bg-stone-800/50 border border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <div>
              <p className="font-semibold text-stone-300">CONSTRUCTA v2.5</p>
              <p className="text-[10px] text-stone-500">Postgres & Firestore Ready</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
          </div>
        </div>

      </aside>
    </>
  );
};
