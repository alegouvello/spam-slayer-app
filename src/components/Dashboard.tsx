import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Mail, 
  LogOut, 
  Scan, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  RefreshCw
} from 'lucide-react';
import { EmailList } from './EmailList';
import { ScheduleSettings } from './ScheduleSettings';
import { StatsCards } from './StatsCards';
import { GmailConnect } from './GmailConnect';
import { Email, CleanupStats } from '@/types/email';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [stats, setStats] = useState<CleanupStats>({
    totalProcessed: 0,
    successfulUnsubscribes: 0,
    failedUnsubscribes: 0,
    deletedEmails: 0,
    webLinksOpened: 0,
  });

  const handleScanSpam = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-scan', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      setEmails(data.emails || []);
      toast.success(`Found ${data.emails?.length || 0} emails in your spam folder`);
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Failed to scan spam folder. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAnalyze = async () => {
    if (emails.length === 0) {
      toast.error('Please scan your spam folder first');
      return;
    }

    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-spam', {
        body: { emails: emails.slice(0, 20) } // Analyze up to 20 emails at a time
      });

      if (error) throw error;

      setEmails(prev => prev.map(email => {
        const analyzed = data.results?.find((r: any) => r.id === email.id);
        if (analyzed) {
          return {
            ...email,
            spamConfidence: analyzed.spamConfidence,
            aiReasoning: analyzed.reasoning,
          };
        }
        return email;
      }));

      toast.success('AI analysis complete!');
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze emails. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSelectEmail = (emailId: string) => {
    setEmails(prev => prev.map(email => 
      email.id === emailId ? { ...email, selected: !email.selected } : email
    ));
  };

  const handleSelectAll = () => {
    const allSelected = emails.every(e => e.selected);
    setEmails(prev => prev.map(email => ({ ...email, selected: !allSelected })));
  };

  const handleProcess = async () => {
    const selectedEmails = emails.filter(e => e.selected);
    if (selectedEmails.length === 0) {
      toast.error('Please select emails to process');
      return;
    }

    setIsProcessing(true);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let webOpened = 0;

    for (const email of selectedEmails) {
      try {
        if (email.hasListUnsubscribe) {
          // Auto-unsubscribe via header
          const { error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { emailId: email.id, method: 'header' }
          });

          if (error) throw error;

          setEmails(prev => prev.map(e => 
            e.id === email.id ? { ...e, unsubscribeStatus: 'success' } : e
          ));
          succeeded++;
          toast.success(`Unsubscribed from ${email.sender}`);
        } else if (email.unsubscribeLink) {
          // Open web link for manual unsubscribe
          window.open(email.unsubscribeLink, '_blank');
          setEmails(prev => prev.map(e => 
            e.id === email.id ? { ...e, unsubscribeStatus: 'opened_link' } : e
          ));
          webOpened++;
        }
        processed++;
      } catch (error) {
        console.error('Process error:', error);
        setEmails(prev => prev.map(e => 
          e.id === email.id ? { ...e, unsubscribeStatus: 'failed' } : e
        ));
        failed++;
      }
    }

    setStats(prev => ({
      ...prev,
      totalProcessed: prev.totalProcessed + processed,
      successfulUnsubscribes: prev.successfulUnsubscribes + succeeded,
      failedUnsubscribes: prev.failedUnsubscribes + failed,
      webLinksOpened: prev.webLinksOpened + webOpened,
    }));

    setIsProcessing(false);
  };

  const selectedCount = emails.filter(e => e.selected).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Spam Cleanup</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm hidden md:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="cleanup" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="cleanup" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Cleanup
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cleanup" className="space-y-6">
            {/* Gmail Connection */}
            <GmailConnect onConnected={() => setGmailConnected(true)} />

            {/* Stats */}
            <StatsCards stats={stats} />

            {/* Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Spam Folder Cleanup</CardTitle>
                <CardDescription>
                  Scan your spam folder, review AI suggestions, and clean up unwanted emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={handleScanSpam} 
                    disabled={isScanning}
                    className="gap-2"
                  >
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                    {isScanning ? 'Scanning...' : 'Scan Spam Folder'}
                  </Button>

                  {emails.length > 0 && (
                    <>
                      <Button 
                        variant="secondary"
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="gap-2"
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <AlertCircle className="h-4 w-4" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                      </Button>

                      <Button 
                        variant="default"
                        onClick={handleProcess} 
                        disabled={isProcessing || selectedCount === 0}
                        className="gap-2"
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isProcessing ? 'Processing...' : `Process Selected (${selectedCount})`}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Email List */}
            {emails.length > 0 && (
              <EmailList 
                emails={emails}
                onSelect={handleSelectEmail}
                onSelectAll={handleSelectAll}
              />
            )}
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
