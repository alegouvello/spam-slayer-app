import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Sparkles, LogOut, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

interface GmailConnectProps {
  onConnected: () => void;
}

export const GmailConnect = ({ onConnected }: GmailConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    checkConnection();
    
    // Check if we just came back from OAuth
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true') {
      setIsConnected(true);
      toast.success('Gmail connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
      onConnected();
    }
  }, []);

  const checkConnection = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('gmail-scan', {
        body: { action: 'check_connection' }
      });

      if (!error && data?.connected) {
        setIsConnected(true);
        onConnected();
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

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Clear Gmail tokens from profile
      const { error } = await supabase
        .from('profiles')
        .update({
          gmail_access_token: null,
          gmail_refresh_token: null,
          gmail_token_expires_at: null,
        })
        .eq('user_id', user.id);

      if (error) throw error;

      setIsConnected(false);
      toast.success('Gmail disconnected. You can now reconnect with updated permissions.');
    } catch (error) {
      console.error('Gmail disconnect error:', error);
      toast.error('Failed to disconnect Gmail. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isChecking) {
    return (
      <Card className="border bg-background/60 backdrop-blur-sm border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span>Checking Gmail connection...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show disconnect option when connected
  if (isConnected) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive">
            <LogOut className="h-4 w-4" />
            Disconnect Gmail
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Disconnect Gmail?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the Gmail connection. You'll need to reconnect to continue using the app.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  return (
    <Card className="border bg-background/60 backdrop-blur-sm border-border/50 overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <CardHeader className="relative">
        <CardTitle className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <span className="block">Connect Gmail</span>
            <span className="text-xs font-normal text-muted-foreground">Get started in seconds</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative">
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting}
          className="gap-2 rounded-full"
          size="lg"
        >
          {isConnecting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Connect Gmail Account
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          We'll only access your spam folder — nothing else.
        </p>
      </CardContent>
    </Card>
  );
};