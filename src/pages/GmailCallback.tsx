import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const GmailCallback = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  const { code, error } = useMemo(() => {
    const url = new URL(window.location.href);
    return {
      code: url.searchParams.get('code'),
      error: url.searchParams.get('error') || url.searchParams.get('error_description'),
    };
  }, []);

  useEffect(() => {
    const run = async () => {
      if (error) {
        setStatus('error');
        toast.error(typeof error === 'string' ? error : 'Gmail authorization failed');
        return;
      }

      if (!code) {
        setStatus('error');
        toast.error('Missing authorization code from Google');
        return;
      }

      try {
        const redirectUri = `${window.location.origin}/gmail/callback`;
        const { error: exchangeError } = await supabase.functions.invoke('gmail-token-exchange', {
          body: { code, redirectUri },
        });

        if (exchangeError) throw exchangeError;

        toast.success('Gmail connected successfully!');
        navigate('/?gmail_connected=true', { replace: true });
      } catch (e) {
        console.error('Token exchange error:', e);
        setStatus('error');
        toast.error('Failed to finish Gmail connection. Please try again.');
      }
    };

    run();
  }, [code, error, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Connecting Gmail…</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'loading' ? (
            <p className="text-sm text-muted-foreground">Finishing authorization, please wait.</p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Something went wrong. You can close this tab and try “Connect Gmail Account” again.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default GmailCallback;
