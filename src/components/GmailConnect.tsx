import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface GmailConnectProps {
  onConnected: () => void;
}

export const GmailConnect = ({ onConnected }: GmailConnectProps) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

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

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Checking Gmail connection...</div>
        </CardContent>
      </Card>
    );
  }

  if (isConnected) {
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-green-500" />
          <span className="text-green-700 dark:text-green-400 font-medium">Gmail Connected</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connect Gmail
        </CardTitle>
        <CardDescription>
          Connect your Gmail account to scan and clean up your spam folder
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleConnect} 
          disabled={isConnecting}
          className="gap-2"
        >
          {isConnecting ? (
            <>Connecting...</>
          ) : (
            <>
              <ExternalLink className="h-4 w-4" />
              Connect Gmail Account
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-3">
          We'll request permission to read and modify your spam folder only.
        </p>
      </CardContent>
    </Card>
  );
};
