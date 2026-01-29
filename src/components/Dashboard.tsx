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
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { EmailList } from './EmailList';
import { EmailPreviewDialog } from './EmailPreviewDialog';
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
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
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
      // Process all emails in batches of 20
      const batchSize = 20;
      const allResults: any[] = [];
      
      for (let i = 0; i < emails.length; i += batchSize) {
        const batch = emails.slice(i, i + batchSize);
        const { data, error } = await supabase.functions.invoke('analyze-spam', {
          body: { emails: batch }
        });

        if (error) throw error;
        if (data.results) {
          allResults.push(...data.results);
        }
      }

      setEmails(prev => prev.map(email => {
        const analyzed = allResults.find((r: any) => r.id === email.id);
        if (analyzed) {
          return {
            ...email,
            spamConfidence: analyzed.spamConfidence,
            aiReasoning: analyzed.reasoning,
          };
        }
        return email;
      }));

      const spamCount = allResults.filter(r => r.spamConfidence === 'definitely_spam' || r.spamConfidence === 'likely_spam').length;
      toast.success(`Analysis complete! Found ${spamCount} spam emails.`);
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('Failed to analyze emails. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCleanAllSpam = async () => {
    const spamEmails = emails.filter(e => 
      e.spamConfidence === 'definitely_spam' || e.spamConfidence === 'likely_spam'
    );
    
    if (spamEmails.length === 0) {
      toast.error('No spam emails found. Run AI Analyze first.');
      return;
    }

    setIsProcessing(true);
    let succeeded = 0;
    let failed = 0;
    let webOpened = 0;
    const deletedEmailIds: string[] = [];

    for (const email of spamEmails) {
      try {
        if (email.hasListUnsubscribe) {
          const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { 
              emailId: email.id, 
              method: 'header',
              sender: email.sender,
              subject: email.subject
            }
          });

          if (error) throw error;

          if (data?.deleted) {
            deletedEmailIds.push(email.id);
          }
          succeeded++;
        } else if (email.unsubscribeLink) {
          window.open(email.unsubscribeLink, '_blank');
          webOpened++;
        } else {
          // No unsubscribe option, just remove from list
          deletedEmailIds.push(email.id);
          succeeded++;
        }
      } catch (error) {
        console.error('Process error:', error);
        failed++;
      }
    }

    // Remove processed emails from the list
    if (deletedEmailIds.length > 0) {
      setEmails(prev => prev.filter(e => !deletedEmailIds.includes(e.id)));
    }

    setStats(prev => ({
      ...prev,
      totalProcessed: prev.totalProcessed + succeeded + failed,
      successfulUnsubscribes: prev.successfulUnsubscribes + succeeded,
      failedUnsubscribes: prev.failedUnsubscribes + failed,
      deletedEmails: prev.deletedEmails + deletedEmailIds.length,
      webLinksOpened: prev.webLinksOpened + webOpened,
    }));

    toast.success(`Cleaned ${succeeded} spam emails${webOpened > 0 ? `, ${webOpened} links opened` : ''}`);
    setIsProcessing(false);
  };

  const spamCount = emails.filter(e => 
    e.spamConfidence === 'definitely_spam' || e.spamConfidence === 'likely_spam'
  ).length;

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
    let deleted = 0;
    const deletedEmailIds: string[] = [];

    for (const email of selectedEmails) {
      try {
        if (email.hasListUnsubscribe) {
          const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { 
              emailId: email.id, 
              method: 'header',
              sender: email.sender,
              subject: email.subject
            }
          });

          if (error) throw error;

          if (data?.deleted) {
            deletedEmailIds.push(email.id);
            deleted++;
          } else {
            setEmails(prev => prev.map(e => 
              e.id === email.id ? { ...e, unsubscribeStatus: 'success' } : e
            ));
          }
          succeeded++;
          toast.success(`Unsubscribed from ${email.sender}`);
        } else if (email.unsubscribeLink) {
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

    if (deletedEmailIds.length > 0) {
      setEmails(prev => prev.filter(e => !deletedEmailIds.includes(e.id)));
    }

    setStats(prev => ({
      ...prev,
      totalProcessed: prev.totalProcessed + processed,
      successfulUnsubscribes: prev.successfulUnsubscribes + succeeded,
      failedUnsubscribes: prev.failedUnsubscribes + failed,
      deletedEmails: prev.deletedEmails + deleted,
      webLinksOpened: prev.webLinksOpened + webOpened,
    }));

    setIsProcessing(false);
  };

  const handlePreviewEmail = (email: Email) => {
    setPreviewEmail(email);
    setPreviewOpen(true);
  };

  const handleRemoveEmail = (emailId: string) => {
    setEmails(prev => prev.filter(e => e.id !== emailId));
    toast.success('Email removed from list');
  };

  const handleUnsubscribeFromPreview = async (email: Email) => {
    if (email.hasListUnsubscribe) {
      try {
        const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
          body: { 
            emailId: email.id, 
            method: 'header',
            sender: email.sender,
            subject: email.subject
          }
        });

        if (error) throw error;

        if (data?.deleted) {
          setEmails(prev => prev.filter(e => e.id !== email.id));
          setStats(prev => ({
            ...prev,
            totalProcessed: prev.totalProcessed + 1,
            successfulUnsubscribes: prev.successfulUnsubscribes + 1,
            deletedEmails: prev.deletedEmails + 1,
          }));
        }
        toast.success(`Unsubscribed from ${email.sender}`);
      } catch (error) {
        console.error('Unsubscribe error:', error);
        toast.error('Failed to unsubscribe');
      }
    } else if (email.unsubscribeLink) {
      window.open(email.unsubscribeLink, '_blank');
      setEmails(prev => prev.map(e => 
        e.id === email.id ? { ...e, unsubscribeStatus: 'opened_link' } : e
      ));
      setStats(prev => ({
        ...prev,
        webLinksOpened: prev.webLinksOpened + 1,
      }));
    }
  };

  const selectedCount = emails.filter(e => e.selected).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="font-medium">Spam Cleanup</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden md:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-2xl font-medium mb-1">Welcome back</h1>
          <p className="text-muted-foreground">Manage your spam and subscriptions</p>
        </div>

        <Tabs defaultValue="cleanup" className="space-y-8">
          <TabsList className="bg-muted/50 p-1 rounded-full w-fit">
            <TabsTrigger value="cleanup" className="gap-2 rounded-full px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Trash2 className="h-4 w-4" />
              Cleanup
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-2 rounded-full px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Clock className="h-4 w-4" />
              Schedule
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cleanup" className="space-y-8">
            {/* Gmail Connection */}
            <GmailConnect onConnected={() => setGmailConnected(true)} />

            {/* Stats */}
            <StatsCards stats={stats} />

            {/* Actions */}
            <Card className="border-0 elegant-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-medium">Spam Folder</CardTitle>
                <CardDescription>
                  Scan, review, and clean up unwanted emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button 
                    onClick={handleScanSpam} 
                    disabled={isScanning}
                    className="gap-2 rounded-full"
                  >
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                    {isScanning ? 'Scanning...' : 'Scan Spam'}
                  </Button>

                  {emails.length > 0 && (
                    <>
                      <Button 
                        variant="secondary"
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        className="gap-2 rounded-full"
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                      </Button>

                      {spamCount > 0 && (
                        <Button 
                          variant="destructive"
                          onClick={handleCleanAllSpam}
                          disabled={isProcessing}
                          className="gap-2 rounded-full"
                        >
                          {isProcessing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          {isProcessing ? 'Cleaning...' : `Clean All Spam (${spamCount})`}
                        </Button>
                      )}

                      <Button 
                        variant="outline"
                        onClick={handleProcess} 
                        disabled={isProcessing || selectedCount === 0}
                        className="gap-2 rounded-full"
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
                onPreview={handlePreviewEmail}
                onRemove={handleRemoveEmail}
              />
            )}

            {/* Email Preview Dialog */}
            <EmailPreviewDialog
              email={previewEmail}
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              onRemove={handleRemoveEmail}
              onUnsubscribe={handleUnsubscribeFromPreview}
            />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
