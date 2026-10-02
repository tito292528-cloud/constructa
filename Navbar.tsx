import React, { useState } from 'react';
import { 
  Building2, 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  Globe, 
  User, 
  Check, 
  ChevronDown, 
  Menu,
  ShieldAlert
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { useAuth, SYSTEM_USERS } from '../../context/AuthContext.tsx';
import type { AppNotification } from '../../types/index.ts';

interface NavbarProps {
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onToggleSidebar: () => void;
  notifications: AppNotification[];
  currentSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onOpenNotifications,
  onToggleSidebar,
  notifications,
  currentSection
}) => {
  const { language, setLanguage, isRTL, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { user, switchUser } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const roleLabels = {
    owner: isRTL ? 'المالك / الشريك الرئيسي' : 'Company Owner',
    partner: isRTL ? 'شريك مساهم' : 'Equity Partner',
    accountant: isRTL ? 'المحاسب المالي' : 'Chief Accountant',
    project_manager: isRTL ? 'مدير مشاريع' : 'Project Manager',
    employee: isRTL ? 'مهندس / فني موقع' : 'Site Employee'
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 transition-colors">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-stone-950 font-black shadow-md shadow-amber-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-stone-900 dark:text-stone-100 font-mono">
                  CONSTRUCTA
                </span>
                <span className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                  ERP
                </span>
              </div>
              <span className="hidden md:block text-[10px] text-stone-500 dark:text-stone-400 -mt-0.5 font-medium">
                {t.appTagline}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Global Search Trigger */}
        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <button
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/80 rounded-xl hover:border-amber-500/50 hover:bg-stone-50 dark:hover:bg-stone-800 transition-all cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Search className="w-4 h-4 text-stone-400 group-hover:text-amber-500 transition-colors" />
              <span>{t.search}</span>
            </span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-mono font-medium text-stone-500 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-700 shadow-2xs">
              Ctrl+K
            </kbd>
          </button>
        </div>

        {/* Right Actions: Mobile search, Notifications, Lang, Theme, User Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* Mobile search icon */}
          <button
            onClick={onOpenSearch}
            className="md:hidden p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
            title={t.search}
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Notifications Center */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={t.notifications}
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-stone-950 font-black text-[10px] flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Switch Language / تغيير اللغة"
          >
            <Globe className="w-4 h-4" />
            <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-stone-700" />
            )}
          </button>

          <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 mx-1"></div>

          {/* User & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer text-left rtl:text-right"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                {user?.name.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="hidden xl:block">
                <p className="text-xs font-bold text-stone-900 dark:text-stone-100 leading-tight">
                  {user?.name}
                </p>
                <p className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                  {roleLabels[user?.role || 'employee']}
                </p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden xl:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800">
                    <p className="text-xs text-stone-400 font-semibold uppercase tracking-wider">
                      {isRTL ? 'الحساب النشط والصلاحية' : 'Active Profile & Role'}
                    </p>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100 mt-0.5">
                      {user?.name}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                      {roleLabels[user?.role || 'employee']}
                    </p>
                  </div>

                  <div className="py-1">
                    <p className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      {isRTL ? 'التبديل بين الأدوار للتجربة' : 'Switch Role For Testing'}
                    </p>
                    {SYSTEM_USERS.map((su) => (
                      <button
                        key={su.id}
                        onClick={() => {
                          switchUser(su.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                          user?.id === su.id
                            ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold'
                            : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <div className="text-left rtl:text-right">
                          <p className="font-semibold">{su.name}</p>
                          <p className="text-[10px] text-stone-400">{roleLabels[su.role]}</p>
                        </div>
                        {user?.id === su.id && <Check className="w-4 h-4 text-amber-500" />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
