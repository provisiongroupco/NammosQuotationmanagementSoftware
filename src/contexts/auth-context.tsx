'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { AuthUser, UserRole } from '@/lib/supabase/auth';
import { getCurrentUser, canViewAnalytics, canManageUsers, canViewAllQuotations, canApproveQuotations, canDeleteQuotations } from '@/lib/supabase/auth';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  permissions: {
    canViewAnalytics: boolean;
    canManageUsers: boolean;
    canViewAllQuotations: boolean;
    canApproveQuotations: boolean;
    canDeleteQuotations: boolean;
  };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error refreshing user:', error);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // TEMPORARY: Bypass auth - just set loading to false immediately
    setLoading(false);

    /* ORIGINAL AUTH INIT - Re-enable when auth is fixed
    const supabase = createClient();

    async function initAuth() {
      try {
        await refreshUser();
      } catch (error) {
        console.error('Auth init error:', error);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await refreshUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    */

    return () => {
      mounted = false;
    };
  }, [refreshUser]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
  };

  const role: UserRole | undefined = user?.profile?.role;

  const permissions = {
    canViewAnalytics: canViewAnalytics(role),
    canManageUsers: canManageUsers(role),
    canViewAllQuotations: canViewAllQuotations(role),
    canApproveQuotations: canApproveQuotations(role),
    canDeleteQuotations: canDeleteQuotations(role),
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut: handleSignOut,
        refreshUser,
        permissions,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function useRequireAuth(requiredRoles?: UserRole[]) {
  const { user, loading, permissions } = useAuth();

  const isAuthorized = !requiredRoles || (user?.profile?.role && requiredRoles.includes(user.profile.role));

  return {
    user,
    loading,
    isAuthorized,
    permissions,
  };
}
