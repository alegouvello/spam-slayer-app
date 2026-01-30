import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Sparkles, LogOut, AlertTriangle, Plus, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { GmailAccount } from '@/types/email';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface GmailConnectProps {
  onConnected: () => void;
}

export const GmailConnect = ({ onConnected }: GmailConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [accounts, setAccounts] = useState<GmailAccount[]>([]);
  const [isChecking, setIsChecking] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = useState<GmailAccount | null>(null);

  useEffect(() => {
    checkConnection();
    
    // Check if we just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true') {
      toast.success('Gmail connected successfully!');
      window.history.replaceState({}, '', window.location.pathname);
      checkConnection();
      onConnected();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gmail-scan', {
        body: { action: 'check_connection' }
      });

      if (!error && data?.connected) {
        setAccounts(data.accounts || []);
        onConnected();
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Connection check error:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const redirectUri = `${window.location.origin}/gmail/callback`;
      const { data, error } = await supabase.functions.invoke('gmail-auth-url', {
        body: { redirectUri },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Gmail connect error:', error);
      toast.error('Failed to start Gmail connection. Please try again.');
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (account: GmailAccount) => {
    setIsDisconnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Delete the account from gmail_accounts table
      const { error } = await supabase
        .from('gmail_accounts')
        .delete()
        .eq('id', account.id);

      if (error) throw error;

      setAccounts(prev => prev.filter(a => a.id !== account.id));
      setAccountToDisconnect(null);
      toast.success(`Disconnected ${account.email}`);
    } catch (error) {
      console.error('Gmail disconnect error:', error);
      toast.error('Failed to disconnect Gmail. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isChecking) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="hidden sm:inline">Checking...</span>
      </div>
    );
  }

  // Show connected accounts dropdown when at least one account is connected
  if (accounts.length > 0) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">
                {accounts.length} Account{accounts.length > 1 ? 's' : ''}
              </span>
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {accounts.length}
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Connected Gmail Accounts
            </div>
            {accounts.map((account) => (
              <DropdownMenuItem key={account.id} className="flex items-center justify-between gap-2 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">{account.email}</span>
                  {account.isPrimary && (
                    <Badge variant="secondary" className="text-xs px-1 py-0 flex-shrink-0">
                      Primary
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setAccountToDisconnect(account);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleConnect} disabled={isConnecting} className="gap-2">
              <Plus className="h-4 w-4" />
              Add another account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Disconnect confirmation dialog */}
        <AlertDialog open={!!accountToDisconnect} onOpenChange={(open) => !open && setAccountToDisconnect(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Disconnect Gmail Account?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will remove <strong>{accountToDisconnect?.email}</strong> from your connected accounts. You can reconnect it later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => accountToDisconnect && handleDisconnect(accountToDisconnect)}
                disabled={isDisconnecting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  // Show connect button when no accounts are connected
  return (
    <Button 
      onClick={handleConnect} 
      disabled={isConnecting}
      variant="default"
      size="sm"
      className="gap-2"
    >
      {isConnecting ? (
        <>
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="hidden sm:inline">Connecting...</span>
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" />
          <span className="hidden sm:inline">Connect Gmail</span>
        </>
      )}
    </Button>
  );
};
