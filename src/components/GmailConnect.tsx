import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, CheckCircle2, ExternalLink, Sparkles } from 'lucide-react';
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

  if (isConnected) {
    return (
      <Card className="border-success/30 bg-success/5 backdrop-blur-sm">
        <CardContent className="flex items-center gap-3 py-4">
          <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-success" />
          </div>
          <span className="text-success font-medium">Gmail Connected</span>
        </CardContent>
      </Card>
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
