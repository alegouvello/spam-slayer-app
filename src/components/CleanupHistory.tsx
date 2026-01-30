import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  History, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  Trash2,
  RefreshCw,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CleanupHistoryItem {
  id: string;
  email_id: string;
  sender: string | null;
  subject: string | null;
  spam_confidence: string | null;
  ai_reasoning: string | null;
  unsubscribe_method: string | null;
  unsubscribe_status: string | null;
  deleted: boolean | null;
  processed_at: string;
}

export const CleanupHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<CleanupHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deleted' | 'spam'>('all');

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('cleanup_history')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(200);
      
      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error('Failed to load cleanup history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceBadge = (confidence: string | null) => {
    switch (confidence) {
      case 'definitely_spam':
        return <Badge variant="destructive" className="gap-1 text-xs font-normal"><XCircle className="h-3 w-3" /> Spam</Badge>;
      case 'likely_spam':
        return <Badge className="gap-1 text-xs font-normal bg-warning/15 text-warning-foreground border-warning/30"><AlertTriangle className="h-3 w-3" /> Likely</Badge>;
      case 'might_be_important':
        return <Badge variant="secondary" className="gap-1 text-xs font-normal"><Info className="h-3 w-3" /> Important</Badge>;
      default:
        return <Badge variant="outline" className="text-xs font-normal">Unknown</Badge>;
    }
  };

  const getStatusBadge = (item: CleanupHistoryItem) => {
    if (item.deleted) {
      return <Badge className="gap-1 text-xs font-normal bg-success/15 text-success border-success/30"><Trash2 className="h-3 w-3" /> Deleted</Badge>;
    }
    if (item.unsubscribe_status === 'success') {
      return <Badge className="gap-1 text-xs font-normal bg-primary/15 text-primary border-primary/30"><CheckCircle2 className="h-3 w-3" /> Unsubscribed</Badge>;
    }
    if (item.unsubscribe_status === 'failed') {
      return <Badge variant="destructive" className="gap-1 text-xs font-normal"><XCircle className="h-3 w-3" /> Failed</Badge>;
    }
    return <Badge variant="outline" className="text-xs font-normal">Pending</Badge>;
  };

  const filteredHistory = history.filter(item => {
    if (filter === 'deleted') return item.deleted === true;
    if (filter === 'spam') return item.spam_confidence === 'definitely_spam' || item.spam_confidence === 'likely_spam';
    return true;
  });

  const stats = {
    total: history.length,
    deleted: history.filter(h => h.deleted).length,
    spam: history.filter(h => h.spam_confidence === 'definitely_spam' || h.spam_confidence === 'likely_spam').length,
  };

  if (isLoading) {
    return (
      <Card className="border bg-background/60 backdrop-blur-sm border-border/50">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="border bg-background/60 backdrop-blur-sm border-border/50">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
            <p className="text-2xl sm:text-3xl font-medium">{stats.total}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Total</p>
          </CardContent>
        </Card>
        <Card className="border bg-background/60 backdrop-blur-sm border-success/20">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
            <p className="text-2xl sm:text-3xl font-medium text-success">{stats.deleted}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Deleted</p>
          </CardContent>
        </Card>
        <Card className="border bg-background/60 backdrop-blur-sm border-destructive/20">
          <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6 text-center">
            <p className="text-2xl sm:text-3xl font-medium text-destructive">{stats.spam}</p>
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Spam</p>
          </CardContent>
        </Card>
      </div>

      {/* History Card */}
      <Card className="border bg-background/60 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <History className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg font-medium">Cleanup History</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {filteredHistory.length} records
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('all')}
                className="text-xs h-8 px-2 sm:px-3"
              >
                All
              </Button>
              <Button
                variant={filter === 'deleted' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('deleted')}
                className="text-xs h-8 px-2 sm:px-3"
              >
                Deleted
              </Button>
              <Button
                variant={filter === 'spam' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter('spam')}
                className="text-xs h-8 px-2 sm:px-3"
              >
                Spam
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadHistory}
                className="h-8 w-8"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0 px-3 sm:px-6">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">No history yet</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Processed emails will appear here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] sm:h-[500px]">
              <div className="space-y-2">
                {filteredHistory.map((item) => (
                  <div 
                    key={item.id}
                    className="p-3 sm:p-4 rounded-lg sm:rounded-xl border bg-background/80 hover:bg-background border-transparent hover:border-border/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                          <span className="font-medium text-xs sm:text-sm truncate max-w-[150px] sm:max-w-[200px]">
                            {item.sender || 'Unknown Sender'}
                          </span>
                          {getConfidenceBadge(item.spam_confidence)}
                          {getStatusBadge(item)}
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1.5 sm:mb-2">
                          {item.subject || 'No subject'}
                        </p>
                        {item.ai_reasoning && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground italic line-clamp-1 bg-accent/30 rounded-md px-1.5 sm:px-2 py-0.5 sm:py-1 mb-1.5">
                            ✨ "{item.ai_reasoning}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                          <span>{new Date(item.processed_at).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>{new Date(item.processed_at).toLocaleTimeString()}</span>
                          {item.unsubscribe_method && (
                            <>
                              <span>•</span>
                              <span className="capitalize">{item.unsubscribe_method.replace('_', ' ')}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
