'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, Building2, Check, Plus, User as UserIcon } from 'lucide-react';
import Image from 'next/image';
import type { User } from 'next-auth';
import { signOut, useSession } from 'next-auth/react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useRouter } from 'next/navigation';
import { toast } from './toast';
import { LoaderIcon } from './icons';
import { usePolling, useRefreshListener } from '@/hooks/use-polling';
import { ThemeToggleSwitch } from './theme-toggle-switch';

export function SidebarUserNav({ user }: { user: User }) {
  const router = useRouter();
  const { data, status } = useSession();
  const [invitationCount, setInvitationCount] = useState<number>(0);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<any>(null);
  const [isSwitching, setIsSwitching] = useState(false);

  const fetchInvitationCount = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch('/api/organizations/invitations');
      if (response.ok) {
        const invitations = await response.json();
        setInvitationCount(invitations.length);
      }
    } catch (error) {
      console.error('Error fetching invitations:', error);
    }
  }, [user?.email]);

  const fetchOrganizations = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      const response = await fetch('/api/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        
        // Find the active organization
        const activeOrg = data.find((org: any) => org.isActive);
        if (activeOrg) {
          setActiveOrganization(activeOrg);
        }
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  }, [user?.email]);

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (organizationId === 'personal') {
      // Handle personal mode - clear active organization states
      const updatedOrgs = organizations.map(org => ({
        ...org,
        isActive: false
      }));
      setOrganizations(updatedOrgs);
      setActiveOrganization({ id: 'personal', name: 'Personal', isActive: true });
      
      // Trigger refresh for other components
      window.dispatchEvent(new CustomEvent('organization-refresh'));
      
      toast({
        type: 'success',
        description: 'Switched to Personal mode',
      });
      return;
    }

    setIsSwitching(true);
    try {
      const response = await fetch('/api/organizations/switch', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ organizationId }),
      });

      if (response.ok) {
        // Update the organizations array to reflect the new active state
        const updatedOrgs = organizations.map(org => ({
          ...org,
          isActive: org.id === organizationId
        }));
        setOrganizations(updatedOrgs);
        
        const newActiveOrg = updatedOrgs.find(org => org.id === organizationId);
        if (newActiveOrg) {
          setActiveOrganization(newActiveOrg);
          
          // Trigger refresh for other components
          window.dispatchEvent(new CustomEvent('organization-refresh'));
          
          toast({
            type: 'success',
            description: `Switched to ${newActiveOrg.name}`,
          });
        }
      } else {
        const errorText = await response.text();
        console.error('Organization switch failed:', errorText);
        
        let errorMessage = 'Failed to switch organization';
        
        if (response.status === 401) {
          errorMessage = 'You are not authorized to perform this action';
        } else if (response.status === 403) {
          errorMessage = 'You are not a member of this organization';
        } else if (errorText && errorText !== 'Failed to switch organization') {
          errorMessage = errorText;
        }
        
        toast({
          type: 'error',
          description: errorMessage,
        });
      }
    } catch (error) {
      console.error('Error switching organization:', error);
      
      let errorMessage = 'Failed to switch organization';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      toast({
        type: 'error',
        description: errorMessage,
      });
    } finally {
      setIsSwitching(false);
    }
  };

  // Initial fetch and polling
  usePolling(fetchInvitationCount, {
    enabled: !!user?.email,
    interval: 30000, // 30 seconds
  });

  usePolling(fetchOrganizations, {
    enabled: !!user?.email,
    interval: 30000, // 30 seconds
  });

  // Listen for manual refresh triggers
  useRefreshListener(fetchInvitationCount);
  useRefreshListener(fetchOrganizations);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {status === 'loading' ? (
              <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-auto py-2 justify-between">
                <div className="flex flex-row gap-3 items-center flex-1">
                  <div className="size-8 bg-zinc-500/30 rounded-full animate-pulse shrink-0" />
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    <div className="h-3.5 bg-zinc-500/30 rounded-md animate-pulse w-20" />
                    <div className="h-3 bg-zinc-500/30 rounded-md animate-pulse w-32" />
                  </div>
                </div>
                <div className="animate-spin text-zinc-500 shrink-0">
                  <LoaderIcon />
                </div>
              </SidebarMenuButton>
            ) : (
              <SidebarMenuButton
                data-testid="user-nav-button"
                className="data-[state=open]:bg-sidebar-accent bg-background data-[state=open]:text-sidebar-accent-foreground h-auto py-2"
              >
                <Image
                  src={`https://avatar.vercel.sh/${user.email}`}
                  alt={user.email ?? 'User Avatar'}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span data-testid="user-name" className="font-medium text-sm truncate w-full text-left">
                    {user?.name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  <span data-testid="user-email" className="text-xs text-muted-foreground truncate w-full text-left">
                    {user?.email}
                  </span>
                </div>
                <ChevronUp className="ml-auto shrink-0" />
              </SidebarMenuButton>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            data-testid="user-nav-menu"
            side="top"
            className="w-[--radix-popper-anchor-width]"
          >
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                data-testid="user-nav-item-organization"
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center">
                    <Building2 className="mr-2 size-4" />
                    Organizations
                  </div>
                  <div className="flex items-center gap-2">
                    {invitationCount > 0 && (
                      <Badge variant="destructive" className="h-5 min-w-[20px] text-xs bg-accent-alert text-white shadow-[0_0_10px_rgba(255,255,0,0.5)]">
                        {invitationCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-[250px]">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => router.push('/organizations')}
                  >
                    <Plus className="mr-2 size-4" />
                    Manage Organizations
                    {invitationCount > 0 && (
                      <Badge variant="destructive" className="ml-auto h-5 min-w-[20px] text-xs bg-accent-alert text-white shadow-[0_0_10px_rgba(255,255,0,0.5)]">
                        {invitationCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  
                  {/* Personal Option */}
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => handleOrganizationSwitch('personal')}
                    disabled={isSwitching}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center">
                        <UserIcon className="mr-2 size-4" />
                        Personal
                      </div>
                      {isSwitching && (!activeOrganization || activeOrganization.id === 'personal') ? (
                        <div className="animate-spin">
                          <LoaderIcon size={16} />
                        </div>
                      ) : (
                        (!activeOrganization || activeOrganization.id === 'personal') && (
                          <Check className="size-4 text-accent-primary" />
                        )
                      )}
                    </div>
                  </DropdownMenuItem>
                  
                  {/* Organizations List */}
                  {organizations.map((org) => (
                    <DropdownMenuItem
                      key={org.id}
                      className="cursor-pointer"
                      onSelect={() => handleOrganizationSwitch(org.id)}
                      disabled={isSwitching}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center">
                          <Building2 className="mr-2 size-4" />
                          <span>{org.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {org.memberCount} members
                          </span>
                          {isSwitching && org.id === activeOrganization?.id ? (
                            <div className="animate-spin">
                              <LoaderIcon size={16} />
                            </div>
                          ) : (
                            (org.isActive || activeOrganization?.id === org.id) && (
                              <Check className="size-4 text-accent-primary" />
                            )
                          )}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              data-testid="user-nav-item-theme"
              className="cursor-pointer hover:bg-accent-primary/10 p-3"
              onSelect={(e) => e.preventDefault()}
            >
              <ThemeToggleSwitch size="sm" layout="justify-between" />
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild data-testid="user-nav-item-auth">
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  if (status === 'loading') {
                    toast({
                      type: 'error',
                      description:
                        'Checking authentication status, please try again!',
                    });

                    return;
                  }

                  signOut({
                    redirectTo: '/',
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
