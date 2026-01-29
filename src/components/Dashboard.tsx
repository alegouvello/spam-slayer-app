import { useState, useEffect } from 'react';
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
  Sparkles,
  Inbox,
  FolderOpen
} from 'lucide-react';
import { EmailList } from './EmailList';
import { EmailPreviewDialog } from './EmailPreviewDialog';
import { ScheduleSettings } from './ScheduleSettings';
import { StatsCards } from './StatsCards';
import { GmailConnect } from './GmailConnect';
import { Email, CleanupStats } from '@/types/email';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import dashboardBg from '@/assets/dashboard-bg.jpg';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [folderFilter, setFolderFilter] = useState<'all' | 'spam' | 'trash'>('all');
  const [isScanning, setIsScanning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [previewEmail, setPreviewEmail] = useState<Email | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [senderFeedback, setSenderFeedback] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState<CleanupStats>({
    totalProcessed: 0,
    successfulUnsubscribes: 0,
    failedUnsubscribes: 0,
    deletedEmails: 0,
    webLinksOpened: 0,
  });

  // Load stats from cleanup history and sender feedback on mount
  useEffect(() => {
    if (user) {
      loadHistoryStats();
      loadSenderFeedback();
    }
  }, [user]);

  const loadHistoryStats = async () => {
    try {
      const { data, error } = await supabase
        .from('cleanup_history')
        .select('unsubscribe_status, unsubscribe_method, deleted');
      
      if (error) throw error;

      const history = data || [];
      setStats({
        totalProcessed: history.length,
        successfulUnsubscribes: history.filter(h => h.unsubscribe_status === 'success').length,
        failedUnsubscribes: history.filter(h => h.unsubscribe_status === 'failed').length,
        deletedEmails: history.filter(h => h.deleted === true).length,
        webLinksOpened: history.filter(h => h.unsubscribe_method === 'web_link').length,
      });
      setStatsLoaded(true);
    } catch (error) {
      console.error('Failed to load history stats:', error);
      setStatsLoaded(true);
    }
  };

  const loadSenderFeedback = async () => {
    try {
      const { data, error } = await supabase
        .from('sender_feedback')
        .select('sender_email, marked_as_spam');
      
      if (error) throw error;

      const feedback: Record<string, boolean> = {};
      (data || []).forEach(f => {
        feedback[f.sender_email.toLowerCase()] = f.marked_as_spam;
      });
      setSenderFeedback(feedback);
    } catch (error) {
      console.error('Failed to load sender feedback:', error);
    }
  };

  // Save feedback when user manually marks an email as spam
  const saveSenderFeedback = async (email: Email, markedAsSpam: boolean) => {
    try {
      const senderEmail = email.senderEmail.toLowerCase();
      
      // Upsert feedback
      const { error } = await supabase
        .from('sender_feedback')
        .upsert({
          user_id: user?.id,
          sender_email: senderEmail,
          sender_name: email.sender,
          marked_as_spam: markedAsSpam,
          feedback_count: 1,
        }, {
          onConflict: 'user_id,sender_email',
        });

      if (error) throw error;

      // Update local state
      setSenderFeedback(prev => ({
        ...prev,
        [senderEmail]: markedAsSpam,
      }));

      toast.success(`Learned: ${email.sender} is ${markedAsSpam ? 'spam' : 'not spam'}`);
    } catch (error) {
      console.error('Failed to save sender feedback:', error);
    }
  };

  // Filter emails based on folder selection
  const filteredEmails = emails.filter(email => {
    if (folderFilter === 'all') return true;
    return email.folder === folderFilter;
  });

  const spamFolderCount = emails.filter(e => e.folder === 'spam').length;
  const trashFolderCount = emails.filter(e => e.folder === 'trash').length;

  const handleScanSpam = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-scan', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      // Apply learned sender feedback to pre-flag known spammers
      const emailsWithFeedback = (data.emails || []).map((email: Email) => {
        const senderEmail = email.senderEmail?.toLowerCase();
        if (senderEmail && senderFeedback[senderEmail] === true) {
          return {
            ...email,
            spamConfidence: 'definitely_spam' as const,
            aiReasoning: 'Previously marked as spam by you',
          };
        }
        return email;
      });

      setEmails(emailsWithFeedback);
      
      const preMarked = emailsWithFeedback.filter((e: Email) => e.spamConfidence).length;
      toast.success(`Found ${emailsWithFeedback.length} emails${preMarked > 0 ? ` (${preMarked} already flagged from your history)` : ''}`);
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
          // Auto-unsubscribe AND delete
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
          // Open web link for manual unsubscribe, then delete from Gmail
          window.open(email.unsubscribeLink, '_blank');
          
          // Also delete from Gmail
          const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { 
              emailId: email.id, 
              method: 'delete_only',
              sender: email.sender,
              subject: email.subject
            }
          });
          
          if (!error && data?.deleted) {
            deletedEmailIds.push(email.id);
          }
          webOpened++;
          succeeded++;
        } else {
          // No unsubscribe option - just delete from Gmail
          const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { 
              emailId: email.id, 
              method: 'delete_only',
              sender: email.sender,
              subject: email.subject
            }
          });
          
          if (!error && data?.deleted) {
            deletedEmailIds.push(email.id);
          }
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

    toast.success(`Cleaned ${deletedEmailIds.length} spam emails${webOpened > 0 ? `, ${webOpened} unsubscribe links opened` : ''}`);
    setIsProcessing(false);
  };

  const spamCount = filteredEmails.filter(e => 
    e.spamConfidence === 'definitely_spam' || e.spamConfidence === 'likely_spam'
  ).length;

  const handleSelectEmail = (emailId: string) => {
    const email = emails.find(e => e.id === emailId);
    if (!email) return;

    const isSelecting = !email.selected;
    
    // If selecting an email that wasn't flagged as spam by AI, learn from it
    if (isSelecting && email.spamConfidence !== 'definitely_spam' && email.spamConfidence !== 'likely_spam') {
      saveSenderFeedback(email, true); // User is marking it as spam
    }

    setEmails(prev => prev.map(e => 
      e.id === emailId ? { ...e, selected: !e.selected } : e
    ));
  };

  const handleSelectAll = () => {
    const allSelected = filteredEmails.every(e => e.selected);
    const filteredIds = new Set(filteredEmails.map(e => e.id));
    setEmails(prev => prev.map(email => 
      filteredIds.has(email.id) ? { ...email, selected: !allSelected } : email
    ));
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

  const selectedCount = filteredEmails.filter(e => e.selected).length;

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="fixed inset-0 bg-cover bg-center opacity-40 -z-10"
        style={{ backgroundImage: `url(${dashboardBg})` }}
      />
      <div className="fixed inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background -z-10" />

      {/* Header */}
      <header className="border-b bg-background/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-4 w-4 text-primary" />
            </div>
            <span className="font-medium">Spam Cleanup</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8 ring-2 ring-background">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground hidden md:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="text-muted-foreground hover:text-foreground transition-colors">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-10 max-w-5xl animate-fade-in">
        <div className="mb-10">
          <p className="text-sm font-medium text-primary mb-2 tracking-wide uppercase">Dashboard</p>
          <h1 className="text-3xl font-medium mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Manage your spam and subscriptions with ease</p>
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

            {/* Folder Filter & Email List */}
            {emails.length > 0 && (
              <div className="space-y-4">
                {/* Folder Filter Tabs */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={folderFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFolderFilter('all')}
                    className="gap-2 rounded-full"
                  >
                    <FolderOpen className="h-4 w-4" />
                    All ({emails.length})
                  </Button>
                  <Button
                    variant={folderFilter === 'spam' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFolderFilter('spam')}
                    className="gap-2 rounded-full"
                  >
                    <Inbox className="h-4 w-4" />
                    Spam ({spamFolderCount})
                  </Button>
                  <Button
                    variant={folderFilter === 'trash' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFolderFilter('trash')}
                    className="gap-2 rounded-full"
                  >
                    <Trash2 className="h-4 w-4" />
                    Trash ({trashFolderCount})
                  </Button>
                </div>

                <EmailList 
                  emails={filteredEmails}
                  onSelect={handleSelectEmail}
                  onSelectAll={handleSelectAll}
                  onPreview={handlePreviewEmail}
                  onRemove={handleRemoveEmail}
                />
              </div>
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
