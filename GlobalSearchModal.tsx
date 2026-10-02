import React, { useState, useEffect } from 'react';
import { 
  Search, 
  FolderKanban, 
  Users, 
  Truck, 
  Receipt, 
  ShoppingBag, 
  Boxes, 
  Scale, 
  HardHat, 
  ArrowRight,
  X 
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import type { 
  Project, 
  Client, 
  Supplier, 
  Invoice, 
  Purchase, 
  Material, 
  Partner, 
  Employee,
  AppNotification
} from '../../types/index.ts';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: string, detailId?: string) => void;
  projects: Project[];
  clients: Client[];
  suppliers: Supplier[];
  invoices: Invoice[];
  purchases: Purchase[];
  materials: Material[];
  partners: Partner[];
  employees: Employee[];
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  projects,
  clients,
  suppliers,
  invoices,
  purchases,
  materials,
  partners,
  employees
}) => {
  const { t, isRTL } = useLanguage();
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // Toggle or open handled by parent
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const q = query.toLowerCase().trim();

  const filteredProjects = q ? projects.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) : [];
  const filteredClients = q ? clients.filter(c => c.name.toLowerCase().includes(q) || (c.company && c.company.toLowerCase().includes(q))) : [];
  const filteredSuppliers = q ? suppliers.filter(s => s.name.toLowerCase().includes(q) || (s.company && s.company.toLowerCase().includes(q))) : [];
  const filteredInvoices = q ? invoices.filter(i => i.invoiceNumber.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q)) : [];
  const filteredPurchases = q ? purchases.filter(p => p.invoiceNumber.toLowerCase().includes(q) || p.supplierName.toLowerCase().includes(q)) : [];
  const filteredMaterials = q ? materials.filter(m => m.name.toLowerCase().includes(q) || m.code.toLowerCase().includes(q)) : [];
  const filteredPartners = q ? partners.filter(pt => pt.name.toLowerCase().includes(q)) : [];
  const filteredEmployees = q ? employees.filter(e => e.name.toLowerCase().includes(q) || e.jobTitle.toLowerCase().includes(q)) : [];

  const totalResults = 
    filteredProjects.length + 
    filteredClients.length + 
    filteredSuppliers.length + 
    filteredInvoices.length + 
    filteredPurchases.length + 
    filteredMaterials.length + 
    filteredPartners.length + 
    filteredEmployees.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div 
        className="fixed inset-0 bg-stone-950/75 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="flex min-h-full items-start justify-center pt-20 p-4 text-center">
        <div 
          className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl transition-all text-left rtl:text-right"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Search Input Bar */}
          <div className="flex items-center px-4 py-3.5 border-b border-stone-200 dark:border-stone-800">
            <Search className="w-5 h-5 text-stone-400 shrink-0 mr-3 rtl:mr-0 rtl:ml-3" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={isRTL ? 'ابحث عن مشروع، عميل، مورد، فاتورة، مادة، شريك...' : 'Search projects, clients, suppliers, invoices, materials, partners...'}
              className="w-full bg-transparent border-0 text-sm sm:text-base text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
            />
            <button
              onClick={onClose}
              className="p-1 rounded-md text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-3 space-y-4">
            {query.trim() === '' ? (
              <div className="py-8 text-center text-xs text-stone-400">
                {isRTL ? 'ابدأ بالكتابة للبحث السريع في كامل النظام' : 'Type keywords to instantly search across all system records'}
              </div>
            ) : totalResults === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                {isRTL ? `لا توجد نتائج مطابقة لـ "${query}"` : `No records matching "${query}"`}
              </div>
            ) : (
              <>
                {/* Projects */}
                {filteredProjects.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-2">
                      {t.projects} ({filteredProjects.length})
                    </p>
                    <div className="space-y-1">
                      {filteredProjects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            onNavigate('projects', p.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <FolderKanban className="w-4 h-4 text-amber-500 shrink-0" />
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">{p.name}</span>
                            <span className="text-[10px] font-mono text-stone-400">[{p.code}]</span>
                          </div>
                          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
                            {p.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clients */}
                {filteredClients.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-2">
                      {t.clients} ({filteredClients.length})
                    </p>
                    <div className="space-y-1">
                      {filteredClients.map(c => (
                        <button
                          key={c.id}
                          onClick={() => {
                            onNavigate('clients', c.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Users className="w-4 h-4 text-blue-500 shrink-0" />
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">{c.name}</span>
                            {c.company && <span className="text-stone-400 truncate">({c.company})</span>}
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono shrink-0">{c.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suppliers */}
                {filteredSuppliers.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-2">
                      {t.suppliers} ({filteredSuppliers.length})
                    </p>
                    <div className="space-y-1">
                      {filteredSuppliers.map(s => (
                        <button
                          key={s.id}
                          onClick={() => {
                            onNavigate('suppliers', s.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">{s.name}</span>
                          </div>
                          <span className="text-[10px] text-stone-400 font-mono shrink-0">{s.phone}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoices */}
                {filteredInvoices.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-2">
                      {t.invoices} ({filteredInvoices.length})
                    </p>
                    <div className="space-y-1">
                      {filteredInvoices.map(inv => (
                        <button
                          key={inv.id}
                          onClick={() => {
                            onNavigate('invoices', inv.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Receipt className="w-4 h-4 text-purple-500 shrink-0" />
                            <span className="font-semibold font-mono text-stone-900 dark:text-stone-100">{inv.invoiceNumber}</span>
                            <span className="text-stone-400 truncate">- {inv.clientName}</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-500 shrink-0">
                            {inv.total.toLocaleString()} EGP
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Materials */}
                {filteredMaterials.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-2">
                      {t.inventory} ({filteredMaterials.length})
                    </p>
                    <div className="space-y-1">
                      {filteredMaterials.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            onNavigate('inventory', m.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Boxes className="w-4 h-4 text-amber-600 shrink-0" />
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">{m.name}</span>
                            <span className="text-[10px] font-mono text-stone-400">[{m.code}]</span>
                          </div>
                          <span className="text-[10px] font-medium text-stone-400 shrink-0">
                            {m.currentQuantity} {m.unit}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Partners */}
                {filteredPartners.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1.5 px-2">
                      {t.partners} ({filteredPartners.length})
                    </p>
                    <div className="space-y-1">
                      {filteredPartners.map(pt => (
                        <button
                          key={pt.id}
                          onClick={() => {
                            onNavigate('partners', pt.id);
                            onClose();
                          }}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-xs transition-colors cursor-pointer text-left rtl:text-right"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <Scale className="w-4 h-4 text-yellow-500 shrink-0" />
                            <span className="font-semibold text-stone-900 dark:text-stone-100 truncate">{pt.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-amber-500 shrink-0">
                            {pt.ownershipPercentage}% Equity
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </>
            )}
          </div>

          {/* Footer instructions */}
          <div className="p-3 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
            <span>Navigation Shortcut: <kbd className="px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 rounded font-mono">ESC</kbd> to exit</span>
            <span className="font-semibold text-amber-500">CONSTRUCTA QuickFind</span>
          </div>

        </div>
      </div>
    </div>
  );
};

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onNavigate: (section: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigate
}) => {
  const { t, isRTL } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div 
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className={`fixed inset-y-0 ${isRTL ? 'left-0' : 'right-0'} max-w-full flex pl-10 rtl:pl-0 rtl:pr-10`}>
        <div className="w-screen max-w-md bg-white dark:bg-stone-900 border-l rtl:border-l-0 rtl:border-r border-stone-200 dark:border-stone-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {t.notifications}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                {isRTL ? 'لا توجد تنبيهات جديدة' : 'No notifications'}
              </div>
            ) : (
              notifications.map(n => {
                const title = isRTL && n.titleAr ? n.titleAr : n.title;
                const message = isRTL && n.messageAr ? n.messageAr : n.message;

                const notifType = (n.type as 'warning' | 'info' | 'success' | 'danger') || 'info';
                const borderColors = {
                  warning: 'border-l-4 rtl:border-l-0 rtl:border-r-4 border-amber-500 bg-amber-500/5',
                  info: 'border-l-4 rtl:border-l-0 rtl:border-r-4 border-blue-500 bg-blue-500/5',
                  success: 'border-l-4 rtl:border-l-0 rtl:border-r-4 border-emerald-500 bg-emerald-500/5',
                  danger: 'border-l-4 rtl:border-l-0 rtl:border-r-4 border-rose-500 bg-rose-500/5'
                }[notifType];

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.isRead) onMarkRead(n.id);
                      if (n.link) {
                        onNavigate(n.link);
                        onClose();
                      }
                    }}
                    className={`p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 ${borderColors} cursor-pointer transition-all hover:shadow-md ${
                      !n.isRead ? 'opacity-100 font-medium' : 'opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-stone-100">
                        {title}
                      </h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1"></span>
                      )}
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                      {message}
                    </p>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
