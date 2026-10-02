import React, { createContext, useContext, useState, useEffect } from 'react';
import type { UserProfile, UserRole } from '../types/index.ts';

export const SYSTEM_USERS: UserProfile[] = [
  {
    id: 'user_owner',
    name: 'Eng. Ahmed El-Sayed',
    email: 'ahmed@alrowad.eg',
    role: 'owner',
    partnerId: 'partner_ahmed'
  },
  {
    id: 'user_partner',
    name: 'Mohamed Mansour',
    email: 'mohamed@alrowad.eg',
    role: 'partner',
    partnerId: 'partner_mohamed'
  },
  {
    id: 'user_accountant',
    name: 'Hazem Fekry, CPA',
    email: 'hazem.accounting@alrowad.eg',
    role: 'accountant'
  },
  {
    id: 'user_pm',
    name: 'Eng. Tamer Galal',
    email: 'tamer.projects@alrowad.eg',
    role: 'project_manager',
    assignedProjectIds: ['proj_andalus']
  },
  {
    id: 'user_employee',
    name: 'Mostafa El-Naggar',
    email: 'mostafa.site@alrowad.eg',
    role: 'employee',
    assignedProjectIds: ['proj_andalus']
  }
];

interface AuthContextType {
  user: UserProfile | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, role?: UserRole) => boolean;
  switchUser: (userId: string) => void;
  logout: () => void;
  can: (action: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const savedId = localStorage.getItem('constructa_active_user');
    const found = SYSTEM_USERS.find(u => u.id === savedId);
    return found || SYSTEM_USERS[0];
  });

  const switchUser = (userId: string) => {
    const target = SYSTEM_USERS.find(u => u.id === userId);
    if (target) {
      setUser(target);
      localStorage.setItem('constructa_active_user', target.id);
    }
  };

  const login = (email: string, customRole: UserRole = 'owner') => {
    const matched = SYSTEM_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (matched) {
      setUser(matched);
      localStorage.setItem('constructa_active_user', matched.id);
      return true;
    }
    // Create session for user
    const newUser: UserProfile = {
      id: 'custom_' + Date.now(),
      name: email.split('@')[0],
      email,
      role: customRole
    };
    setUser(newUser);
    localStorage.setItem('constructa_active_user', newUser.id);
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('constructa_active_user');
  };

  // Permission Evaluation
  const can = (permission: string): boolean => {
    if (!user) return false;
    const r = user.role;
    if (r === 'owner') return true; // Owner can manage everything

    switch (permission) {
      case 'manage_partners':
      case 'distribute_profits':
      case 'view_audit_logs':
      case 'manage_settings':
        return false;
      case 'view_partners':
      case 'view_reports':
        return r === 'partner' || r === 'accountant';
      case 'manage_finances':
      case 'manage_invoices':
      case 'manage_purchases':
      case 'manage_expenses':
      case 'manage_banks':
      case 'manage_cashbox':
        return r === 'accountant';
      case 'manage_projects':
        return r === 'project_manager';
      case 'manage_inventory':
        return r === 'accountant' || r === 'project_manager';
      default:
        return true;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'employee',
        isAuthenticated: !!user,
        login,
        switchUser,
        logout,
        can
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
