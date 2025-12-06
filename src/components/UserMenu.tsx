import { LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';

export const UserMenu = () => {
  const { user, signOut, loading } = useAuth();

  const userEmail = user?.email || 'User';
  const userName = user?.user_metadata?.full_name || userEmail.split('@')[0];
  const initials = userName.slice(0, 2).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-3 px-3 py-2 h-auto"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-gold flex items-center justify-center shadow-sm">
            <span className="text-xs font-semibold" style={{ color: 'hsl(222, 47%, 11%)' }}>
              {initials}
            </span>
          </div>
          <div className="flex-1 text-left min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="gap-2">
          <User className="h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="gap-2 text-destructive focus:text-destructive"
          onClick={() => signOut()}
          disabled={loading}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
