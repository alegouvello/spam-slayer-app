import { useState, useEffect } from 'react';
import { X, Trash2, Mail, Users, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface TopSender {
  email: string;
  name: string;
  count: number;
}

interface CleanupRun {
  id: string;
  run_at: string;
  emails_scanned: number;
  emails_deleted: number;
  emails_unsubscribed: number;
  top_senders: TopSender[];
  is_dismissed: boolean;
}

export const CleanupSummaryCard = () => {
  const [latestRun, setLatestRun] = useState<CleanupRun | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    loadLatestRun();
  }, []);

  const loadLatestRun = async () => {
    try {
      const { data, error } = await supabase
        .from('cleanup_runs')
        .select('*')
        .eq('is_dismissed', false)
        .order('run_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code !== 'PGRST116') { // Not found error
          console.error('Failed to load cleanup run:', error);
        }
        return;
      }

      if (data) {
        // Parse top_senders if it's a string
        const topSenders = typeof data.top_senders === 'string' 
          ? JSON.parse(data.top_senders) 
          : data.top_senders;
        
        setLatestRun({
          ...data,
          top_senders: topSenders || [],
        });
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Failed to load cleanup run:', error);
    }
  };

  const handleDismiss = async () => {
    if (!latestRun) return;

    try {
      await supabase
        .from('cleanup_runs')
        .update({ is_dismissed: true })
        .eq('id', latestRun.id);

      setIsVisible(false);
      setTimeout(() => setLatestRun(null), 300);
    } catch (error) {
      console.error('Failed to dismiss:', error);
    }
  };

  if (!latestRun) return null;

  const hasActivity = latestRun.emails_scanned > 0 || latestRun.emails_deleted > 0;
  const timeAgo = formatDistanceToNow(new Date(latestRun.run_at), { addSuffix: true });

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Scheduled Cleanup Complete</span>
                    <Badge variant="secondary" className="text-xs">
                      {timeAgo}
                    </Badge>
                  </div>

                  {hasActivity ? (
                    <>
                      <div className="flex flex-wrap gap-4 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">
                            <span className="font-semibold">{latestRun.emails_scanned}</span>
                            <span className="text-muted-foreground"> scanned</span>
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          <span className="text-sm">
                            <span className="font-semibold text-destructive">{latestRun.emails_deleted}</span>
                            <span className="text-muted-foreground"> deleted</span>
                          </span>
                        </div>
                        {latestRun.emails_unsubscribed > 0 && (
                          <div className="flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5 text-primary" />
                            <span className="text-sm">
                              <span className="font-semibold text-primary">{latestRun.emails_unsubscribed}</span>
                              <span className="text-muted-foreground"> unsubscribed</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {latestRun.top_senders.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground font-medium">Top spam senders:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {latestRun.top_senders.slice(0, 3).map((sender, i) => (
                              <Badge 
                                key={i} 
                                variant="outline" 
                                className="text-xs font-normal truncate max-w-[180px]"
                              >
                                {sender.name || sender.email} ({sender.count})
                              </Badge>
                            ))}
                            {latestRun.top_senders.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{latestRun.top_senders.length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No spam emails found during this cleanup.
                    </p>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Dismiss</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
