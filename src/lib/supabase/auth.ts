import { createClient } from './client';

export type UserRole = 'admin' | 'manager' | 'sales';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

export async function signIn(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signUp(
  email: string,
  password: string,
  fullName: string,
  role: UserRole = 'sales'
) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: role,
      },
    },
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = createClient();

  try {
    const { data: { user }, error: userError } = await withTimeout(
      supabase.auth.getUser(),
      5000
    );

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
    }

    return {
      id: user.id,
      email: user.email || '',
      profile: profile ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role as UserRole,
        avatar_url: profile.avatar_url || undefined,
        is_active: profile.is_active,
        created_at: profile.created_at,
        updated_at: profile.updated_at,
      } : null,
    };
  } catch (error) {
    console.error('getCurrentUser error:', error);
    return null;
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name,
    role: data.role as UserRole,
    avatar_url: data.avatar_url || undefined,
    is_active: data.is_active,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }

  return data.map((user) => ({
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role as UserRole,
    avatar_url: user.avatar_url || undefined,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
  }));
}

export async function updateUserRole(userId: string, role: UserRole): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user role:', error);
    return false;
  }

  return true;
}

export async function updateUserStatus(userId: string, isActive: boolean): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user status:', error);
    return false;
  }

  return true;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'avatar_url'>>
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating profile:', error);
    return false;
  }

  return true;
}

export async function createUserByAdmin(
  email: string,
  password: string,
  fullName: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: role,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data.user) {
    return { success: false, error: 'Failed to create user' };
  }

  return { success: true };
}

export function hasPermission(role: UserRole | undefined, requiredRoles: UserRole[]): boolean {
  if (!role) return false;
  return requiredRoles.includes(role);
}

export function canViewAllQuotations(role: UserRole | undefined): boolean {
  return hasPermission(role, ['admin', 'manager']);
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return hasPermission(role, ['admin']);
}

export function canDeleteQuotations(role: UserRole | undefined): boolean {
  return hasPermission(role, ['admin']);
}

export function canApproveQuotations(role: UserRole | undefined): boolean {
  return hasPermission(role, ['admin', 'manager']);
}

export function canViewAnalytics(role: UserRole | undefined): boolean {
  return hasPermission(role, ['admin', 'manager']);
}
