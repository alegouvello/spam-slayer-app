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
  FolderOpen,
  Users,
  ShieldCheck
} from 'lucide-react';
import { EmailList } from './EmailList';
import { EmailPreviewDialog } from './EmailPreviewDialog';
import { CleanupConfirmDialog } from './CleanupConfirmDialog';
import { ScheduleSettings } from './ScheduleSettings';
import { StatsCards } from './StatsCards';
import { GmailConnect } from './GmailConnect';
import { SpamSendersList } from './SpamSendersList';
import { Email, CleanupStats } from '@/types/email';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import dashboardBg from '@/assets/dashboard-bg.jpg';

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const [emails, setEmails] = useState<Email[]>([]);
  const [folderFilter, setFolderFilter] = useState<'all' | 'spam' | 'trash'>('all');
  const [showSafeSenders, setShowSafeSenders] = useState(false);
  const [hiddenSafeCount, setHiddenSafeCount] = useState(0);
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
    autoUnsubscribes: 0,
  });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmDialogType, setConfirmDialogType] = useState<'selected' | 'all-spam'>('selected');
  const [pendingCleanupCount, setPendingCleanupCount] = useState(0);

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
        autoUnsubscribes: history.filter(h => h.unsubscribe_method === 'auto_header').length,
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

  // Filter emails based on folder selection and safe sender toggle
  const filteredEmails = emails.filter(email => {
    // Apply folder filter
    if (folderFilter !== 'all' && email.folder !== folderFilter) return false;
    
    // Apply safe sender filter (unless showing safe senders)
    if (!showSafeSenders) {
      const senderEmail = email.senderEmail?.toLowerCase();
      if (senderEmail && senderFeedback[senderEmail] === false) {
        return false;
      }
    }
    
    return true;
  });

  // Count emails from safe senders
  const safeSenderEmailCount = emails.filter(email => {
    const senderEmail = email.senderEmail?.toLowerCase();
    return senderEmail && senderFeedback[senderEmail] === false;
  }).length;

  const spamFolderCount = emails.filter(e => e.folder === 'spam').length;
  const trashFolderCount = emails.filter(e => e.folder === 'trash').length;

  const handleScanSpam = async () => {
    setIsScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-scan', {
        body: { action: 'scan' }
      });

      if (error) throw error;

      // Apply learned feedback to pre-flag known spammers (keep all emails for toggle)
      const allEmails = data.emails || [];
      
      // Count safe senders
      const safeSenderCount = allEmails.filter((email: Email) => {
        const senderEmail = email.senderEmail?.toLowerCase();
        return senderEmail && senderFeedback[senderEmail] === false;
      }).length;

      // Process emails with feedback (keep all, filtering happens in filteredEmails)
      const emailsWithFeedback = allEmails.map((email: Email) => {
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
      setHiddenSafeCount(safeSenderCount);
      
      const preMarked = emailsWithFeedback.filter((e: Email) => e.spamConfidence).length;
      const visibleCount = emailsWithFeedback.length - safeSenderCount;
      
      let message = `Found ${visibleCount} emails`;
      if (safeSenderCount > 0) {
        message += ` (${safeSenderCount} from safe senders hidden)`;
      }
      if (preMarked > 0) {
        message += ` (${preMarked} flagged as spam)`;
      }
      toast.success(message);
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

  const requestCleanAllSpam = () => {
    const spamEmails = emails.filter(e => 
      e.spamConfidence === 'definitely_spam' || e.spamConfidence === 'likely_spam'
    );
    
    if (spamEmails.length === 0) {
      toast.error('No spam emails found. Run AI Analyze first.');
      return;
    }

    setPendingCleanupCount(spamEmails.length);
    setConfirmDialogType('all-spam');
    setConfirmDialogOpen(true);
  };

  const handleCleanAllSpam = async () => {
    const spamEmails = emails.filter(e => 
      e.spamConfidence === 'definitely_spam' || e.spamConfidence === 'likely_spam'
    );
    
    if (spamEmails.length === 0) {
      return;
    }

    setIsProcessing(true);
    let succeeded = 0;
    let failed = 0;
    let webOpened = 0;
    let autoUnsubs = 0;
    const deletedEmailIds: string[] = [];
    let deleteFailures = 0;
    let permissionFailures = 0;

    for (const email of spamEmails) {
      try {
        if (email.hasListUnsubscribe) {
          // Auto-unsubscribe AND delete
          const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { 
              emailId: email.id, 
              method: 'header',
              sender: email.sender,
              subject: email.subject,
              spamConfidence: email.spamConfidence,
              aiReasoning: email.aiReasoning
            }
          });

          if (error) throw error;

          if (data?.deleted) {
            deletedEmailIds.push(email.id);
          } else {
            deleteFailures++;
            const reason = data?.deleteError?.reason;
            if (reason === 'insufficientPermissions' || reason === 'insufficientAuthenticationScopes') {
              permissionFailures++;
            }
          }
          autoUnsubs++;
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
              subject: email.subject,
              spamConfidence: email.spamConfidence,
              aiReasoning: email.aiReasoning
            }
          });
          
          if (!error && data?.deleted) {
            deletedEmailIds.push(email.id);
          } else {
            deleteFailures++;
            const reason = data?.deleteError?.reason;
            if (reason === 'insufficientPermissions' || reason === 'insufficientAuthenticationScopes') {
              permissionFailures++;
            }
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
              subject: email.subject,
              spamConfidence: email.spamConfidence,
              aiReasoning: email.aiReasoning
            }
          });
          
          if (!error && data?.deleted) {
            deletedEmailIds.push(email.id);
          } else {
            deleteFailures++;
            const reason = data?.deleteError?.reason;
            if (reason === 'insufficientPermissions' || reason === 'insufficientAuthenticationScopes') {
              permissionFailures++;
            }
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
      autoUnsubscribes: prev.autoUnsubscribes + autoUnsubs,
    }));

    if (deleteFailures > 0) {
      const msg = permissionFailures > 0
        ? 'Some emails could not be permanently deleted. Please reconnect Gmail and try again.'
        : 'Some emails could not be permanently deleted. Please try again.';
      toast.error(msg);
    }

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

  const requestProcess = () => {
    const selectedEmails = emails.filter(e => e.selected);
    if (selectedEmails.length === 0) {
      toast.error('Please select emails to process');
      return;
    }

    setPendingCleanupCount(selectedEmails.length);
    setConfirmDialogType('selected');
    setConfirmDialogOpen(true);
  };

  const handleProcess = async () => {
    const selectedEmails = emails.filter(e => e.selected);
    if (selectedEmails.length === 0) {
      return;
    }

    setIsProcessing(true);
    let processed = 0;
    let succeeded = 0;
    let failed = 0;
    let webOpened = 0;
    let deleted = 0;
    let autoUnsubs = 0;
    const deletedEmailIds: string[] = [];

    for (const email of selectedEmails) {
      try {
        if (email.hasListUnsubscribe) {
          const { data, error } = await supabase.functions.invoke('gmail-unsubscribe', {
            body: { 
              emailId: email.id, 
              method: 'header',
              sender: email.sender,
              subject: email.subject,
              spamConfidence: email.spamConfidence,
              aiReasoning: email.aiReasoning
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
          autoUnsubs++;
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
      autoUnsubscribes: prev.autoUnsubscribes + autoUnsubs,
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

  const handleMarkNotSpam = async (email: Email) => {
    // Save feedback that this sender is NOT spam
    await saveSenderFeedback(email, false);
    
    // Remove from the list since it's not spam
    setEmails(prev => prev.filter(e => e.id !== email.id));
  };

  const handleBulkMarkNotSpam = async () => {
    const selectedEmails = emails.filter(e => e.selected);
    if (selectedEmails.length === 0) {
      toast.error('Please select emails to mark as not spam');
      return;
    }

    setIsProcessing(true);
    let processed = 0;

    for (const email of selectedEmails) {
      await saveSenderFeedback(email, false);
      processed++;
    }

    // Remove all selected emails from the list
    const selectedIds = new Set(selectedEmails.map(e => e.id));
    setEmails(prev => prev.filter(e => !selectedIds.has(e.id)));

    toast.success(`Marked ${processed} email${processed > 1 ? 's' : ''} as not spam`);
    setIsProcessing(false);
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
            autoUnsubscribes: prev.autoUnsubscribes + 1,
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

  // Create a set of safe senders for quick lookup
  const safeSenders = new Set(
    Object.entries(senderFeedback)
      .filter(([_, isSpam]) => isSpam === false)
      .map(([email]) => email)
  );

  const handleConfirmCleanup = () => {
    if (confirmDialogType === 'all-spam') {
      handleCleanAllSpam();
    } else {
      handleProcess();
    }
  };
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Background */}
      <div 
        className="fixed inset-0 bg-cover bg-center -z-20"
        style={{ backgroundImage: `url(${dashboardBg})` }}
      />
      
      {/* Gradient Overlay for readability */}
      <div className="fixed inset-0 bg-gradient-to-br from-background/70 via-background/50 to-background/80 -z-10" />
      
      {/* Decorative floating orbs */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse -z-10" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse -z-10" style={{ animationDelay: '1s' }} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary/10 to-success/10 rounded-full blur-3xl -z-10" />

      {/* Header */}
      <header className="border-b border-white/20 bg-white/40 backdrop-blur-xl sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
              <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div>
              <span className="font-semibold text-base sm:text-lg">Spam Slayer</span>
              <span className="text-xs text-muted-foreground hidden sm:block -mt-0.5">Clean inbox, clear mind</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3 bg-white/50 backdrop-blur-sm rounded-full px-2 sm:px-4 py-1.5 sm:py-2">
              <Avatar className="h-7 w-7 sm:h-8 sm:w-8 ring-2 ring-white shadow-md">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:inline">{user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} className="h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:text-foreground hover:bg-white/50 transition-all rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 sm:px-6 py-6 sm:py-12 max-w-5xl">
        {/* Hero Section */}
        <div className="mb-8 sm:mb-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-primary/10 backdrop-blur-sm text-primary px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
            AI-Powered Cleanup
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text">
            Welcome back
          </h1>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-md">
            Take control of your inbox. Scan, analyze, and eliminate spam in seconds.
          </p>
        </div>

        <Tabs defaultValue="cleanup" className="space-y-6 sm:space-y-8">
          <TabsList className="bg-white/50 backdrop-blur-sm p-1 sm:p-1.5 rounded-xl sm:rounded-2xl w-full sm:w-fit shadow-lg shadow-black/5 border border-white/50 grid grid-cols-3 sm:flex">
            <TabsTrigger value="cleanup" className="gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Cleanup</span>
            </TabsTrigger>
            <TabsTrigger value="senders" className="gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Learned</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl px-2 sm:px-6 py-2 sm:py-2.5 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all text-xs sm:text-sm">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Schedule</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cleanup" className="space-y-8 animate-fade-in">
            {/* Gmail Connection */}
            <GmailConnect onConnected={() => setGmailConnected(true)} />

            {/* Stats */}
            <StatsCards stats={stats} />

            {/* Actions Card */}
            <Card className="border border-white/50 bg-white/60 backdrop-blur-xl shadow-xl shadow-black/5 overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
              <CardHeader className="pb-3 sm:pb-4 relative px-4 sm:px-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <Inbox className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg sm:text-xl font-semibold">Spam & Trash</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Scan, review, and clean up unwanted emails
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative px-4 sm:px-6">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <Button 
                    onClick={handleScanSpam} 
                    disabled={isScanning}
                    size="default"
                    className="gap-2 rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4"
                  >
                    {isScanning ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scan className="h-4 w-4" />
                    )}
                    {isScanning ? 'Scanning...' : 'Scan'}
                  </Button>

                  {emails.length > 0 && (
                    <>
                      <Button 
                        variant="secondary"
                        onClick={handleAnalyze} 
                        disabled={isAnalyzing}
                        size="default"
                        className="gap-2 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20 border border-violet-500/20 text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4"
                      >
                        {isAnalyzing ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-violet-600" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'AI Analyze'}
                      </Button>

                      {spamCount > 0 && (
                        <Button 
                          variant="destructive"
                          onClick={requestCleanAllSpam}
                          disabled={isProcessing}
                          size="default"
                          className="gap-2 rounded-xl shadow-lg shadow-destructive/20 text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4"
                        >
                          {isProcessing ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">{isProcessing ? 'Cleaning...' : `Clean All Spam (${spamCount})`}</span>
                          <span className="sm:hidden">{isProcessing ? '...' : `Clean (${spamCount})`}</span>
                        </Button>
                      )}

                      {selectedCount > 0 && (
                        <>
                          <Button 
                            variant="outline"
                            onClick={requestProcess} 
                            disabled={isProcessing}
                            size="default"
                            className="gap-2 rounded-xl border-2 text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4"
                          >
                            {isProcessing ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Process ({selectedCount})</span>
                            <span className="sm:hidden">({selectedCount})</span>
                          </Button>
                          <Button 
                            variant="outline"
                            onClick={handleBulkMarkNotSpam} 
                            disabled={isProcessing}
                            size="default"
                            className="gap-2 rounded-xl border-2 border-success/30 text-success hover:bg-success/10 hover:text-success text-sm sm:text-base h-9 sm:h-11 px-3 sm:px-4"
                          >
                            {isProcessing ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldCheck className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Not Spam ({selectedCount})</span>
                            <span className="sm:hidden">Safe</span>
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Folder Filter & Email List */}
            {emails.length > 0 && (
              <div className="space-y-4 sm:space-y-6 animate-fade-in">
                {/* Folder Filter Tabs */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-1 sm:gap-2 p-1 sm:p-1.5 bg-white/50 backdrop-blur-sm rounded-xl sm:rounded-2xl w-full sm:w-fit shadow-lg shadow-black/5 border border-white/50">
                    <Button
                      variant={folderFilter === 'all' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFolderFilter('all')}
                      className={`gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl transition-all flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9 ${folderFilter === 'all' ? 'shadow-md' : 'hover:bg-white/50'}`}
                    >
                      <FolderOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      All ({filteredEmails.length})
                    </Button>
                    <Button
                      variant={folderFilter === 'spam' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFolderFilter('spam')}
                      className={`gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl transition-all flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9 ${folderFilter === 'spam' ? 'shadow-md' : 'hover:bg-white/50'}`}
                    >
                      <Inbox className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Spam ({spamFolderCount})
                    </Button>
                    <Button
                      variant={folderFilter === 'trash' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setFolderFilter('trash')}
                      className={`gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl transition-all flex-1 sm:flex-none text-xs sm:text-sm h-8 sm:h-9 ${folderFilter === 'trash' ? 'shadow-md' : 'hover:bg-white/50'}`}
                    >
                      <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      Trash ({trashFolderCount})
                    </Button>
                  </div>

                  {/* Safe Senders Toggle */}
                  {safeSenderEmailCount > 0 && (
                    <Button
                      variant={showSafeSenders ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setShowSafeSenders(!showSafeSenders)}
                      className={`gap-2 rounded-xl transition-all ${
                        showSafeSenders 
                          ? 'bg-success text-success-foreground hover:bg-success/90' 
                          : 'border-success/30 text-success hover:bg-success/10'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      {showSafeSenders ? 'Showing' : 'Show'} Safe ({safeSenderEmailCount})
                    </Button>
                  )}
                </div>

                {/* Email List with glass container */}
                <div className="bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-black/5 p-6">
                  <EmailList 
                    emails={filteredEmails}
                    onSelect={handleSelectEmail}
                    onSelectAll={handleSelectAll}
                    onPreview={handlePreviewEmail}
                    onRemove={handleRemoveEmail}
                    onMarkNotSpam={handleMarkNotSpam}
                    safeSenders={safeSenders}
                  />
                </div>
              </div>
            )}

            {/* Empty state when no emails */}
            {emails.length === 0 && (
              <div className="text-center py-16 bg-white/40 backdrop-blur-xl rounded-3xl border border-white/50 shadow-xl shadow-black/5">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Mail className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ready to clean up?</h3>
                <p className="text-muted-foreground max-w-sm mx-auto">
                  Click "Scan Emails" to fetch emails from your Spam and Trash folders, then let AI analyze them.
                </p>
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

            {/* Cleanup Confirmation Dialog */}
            <CleanupConfirmDialog
              open={confirmDialogOpen}
              onOpenChange={setConfirmDialogOpen}
              onConfirm={handleConfirmCleanup}
              emailCount={pendingCleanupCount}
              type={confirmDialogType}
            />
          </TabsContent>

          <TabsContent value="senders" className="animate-fade-in">
            <SpamSendersList />
          </TabsContent>

          <TabsContent value="schedule" className="animate-fade-in">
            <ScheduleSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};
