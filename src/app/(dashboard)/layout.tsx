'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Package, Palette, FileText, Plus, Users, BarChart3, LogOut, User, ChevronDown, UserCog } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/auth-context';

const navigation = [
  { name: 'Analytics', href: '/analytics', icon: BarChart3, roles: ['admin', 'manager'] },
  { name: 'Products', href: '/products', icon: Package, roles: ['admin', 'manager', 'sales'] },
  { name: 'Materials', href: '/materials', icon: Palette, roles: ['admin', 'manager', 'sales'] },
  { name: 'Clients', href: '/clients', icon: Users, roles: ['admin', 'manager', 'sales'] },
  { name: 'Quotations', href: '/quotations', icon: FileText, roles: ['admin', 'manager', 'sales'] },
  { name: 'Users', href: '/users', icon: UserCog, roles: ['admin'] },
];

const roleColors = {
  admin: 'bg-primary/20 text-primary',
  manager: 'bg-blue-500/20 text-blue-400',
  sales: 'bg-nammos-muted/20 text-nammos-muted',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut, loading } = useAuth();

  const userRole = user?.profile?.role || 'admin';
  const filteredNavigation = navigation.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // TEMPORARY: Bypass auth for development
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/login');
  //   }
  // }, [loading, user, router]);

  // if (loading || !user) {
  //   return (
  //     <div className="min-h-screen bg-background flex items-center justify-center">
  //       <div className="animate-pulse text-nammos-muted">Loading...</div>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-background">
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-nammos-charcoal">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/quotations" className="flex items-center">
                <Image
                  src="/logo.svg"
                  alt="Nammos"
                  width={120}
                  height={30}
                  className="h-8 w-auto"
                />
              </Link>
              <div className="hidden md:flex md:gap-1">
                {filteredNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-nammos-cream hover:bg-secondary'
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/quotations/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Quotation</span>
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 px-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-sm font-medium text-nammos-cream truncate max-w-[120px]">
                        {user?.profile?.full_name || user?.email}
                      </p>
                      <p className={`text-xs px-1.5 py-0.5 rounded capitalize ${roleColors[userRole]}`}>
                        {userRole}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-nammos-muted" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium text-nammos-cream">
                      {user?.profile?.full_name}
                    </p>
                    <p className="text-xs text-nammos-muted">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
