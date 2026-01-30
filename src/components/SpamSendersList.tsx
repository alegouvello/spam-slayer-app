import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Users, 
  Trash2, 
  ShieldCheck, 
  ShieldX,
  RefreshCw,
  Mail,
  Plus,
  Search
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
interface SenderFeedback {
  id: string;
  sender_email: string;
  sender_name: string | null;
  marked_as_spam: boolean;
  feedback_count: number;
  created_at: string;
  updated_at: string;
}

const senderSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }).max(255),
  name: z.string().trim().max(100).optional(),
});

export const SpamSendersList = () => {
  const [senders, setSenders] = useState<SenderFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newSenderEmail, setNewSenderEmail] = useState('');
  const [newSenderName, setNewSenderName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  useEffect(() => {
    loadSenders();
  }, []);

  const loadSenders = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('sender_feedback')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSenders(data || []);
    } catch (error) {
      console.error('Failed to load senders:', error);
      toast.error('Failed to load sender list');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSpamStatus = async (sender: SenderFeedback) => {
    try {
      const { error } = await supabase
        .from('sender_feedback')
        .update({ marked_as_spam: !sender.marked_as_spam })
        .eq('id', sender.id);

      if (error) throw error;

      setSenders(prev => prev.map(s => 
        s.id === sender.id ? { ...s, marked_as_spam: !s.marked_as_spam } : s
      ));
      
      toast.success(`${sender.sender_name || sender.sender_email} marked as ${!sender.marked_as_spam ? 'spam' : 'safe'}`);
    } catch (error) {
      console.error('Failed to update sender:', error);
      toast.error('Failed to update sender');
    }
  };

  const removeSender = async (sender: SenderFeedback) => {
    try {
      const { error } = await supabase
        .from('sender_feedback')
        .delete()
        .eq('id', sender.id);

      if (error) throw error;

      setSenders(prev => prev.filter(s => s.id !== sender.id));
      toast.success(`Removed ${sender.sender_name || sender.sender_email} from learned list`);
    } catch (error) {
      console.error('Failed to remove sender:', error);
      toast.error('Failed to remove sender');
    }
  };

  const handleAddSender = async () => {
    setValidationError(null);
    
    const result = senderSchema.safeParse({
      email: newSenderEmail,
      name: newSenderName || undefined,
    });
    
    if (!result.success) {
      setValidationError(result.error.errors[0].message);
      return;
    }

    // Check if sender already exists
    const existingSender = senders.find(
      s => s.sender_email.toLowerCase() === newSenderEmail.toLowerCase().trim()
    );
    
    if (existingSender) {
      setValidationError('This sender is already in your list');
      return;
    }

    setIsAdding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('sender_feedback')
        .insert({
          user_id: user.id,
          sender_email: newSenderEmail.trim().toLowerCase(),
          sender_name: newSenderName.trim() || null,
          marked_as_spam: true,
          feedback_count: 1,
        })
        .select()
        .single();

      if (error) throw error;

      setSenders(prev => [data, ...prev]);
      setNewSenderEmail('');
      setNewSenderName('');
      setIsAddDialogOpen(false);
      toast.success(`Added ${newSenderName || newSenderEmail} to spam list`);
    } catch (error) {
      console.error('Failed to add sender:', error);
      toast.error('Failed to add sender');
    } finally {
      setIsAdding(false);
    }
  };

  // Filter senders based on search query
  const filteredSenders = senders.filter(sender => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      sender.sender_email.toLowerCase().includes(query) ||
      (sender.sender_name?.toLowerCase().includes(query) ?? false)
    );
  });

  const spamCount = senders.filter(s => s.marked_as_spam).length;
  const safeCount = senders.filter(s => !s.marked_as_spam).length;

  if (isLoading) {
    return (
      <Card className="border border-white/50 bg-white/60 backdrop-blur-xl shadow-xl shadow-black/5">
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-white/50 bg-white/60 backdrop-blur-xl shadow-xl shadow-black/5 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      
      <CardHeader className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
              <Users className="h-6 w-6 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold">Learned Senders</CardTitle>
              <CardDescription>
                AI learns from your selections to improve over time
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) {
                setNewSenderEmail('');
                setNewSenderName('');
                setValidationError(null);
              }
            }}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                  <Plus className="h-4 w-4" />
                  Add Sender
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Spam Sender</DialogTitle>
                  <DialogDescription>
                    Manually add an email address to your spam list. The AI will learn to flag emails from this sender.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="sender-email">Email Address *</Label>
                    <Input
                      id="sender-email"
                      type="email"
                      placeholder="spam@example.com"
                      value={newSenderEmail}
                      onChange={(e) => {
                        setNewSenderEmail(e.target.value);
                        setValidationError(null);
                      }}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sender-name">Sender Name (optional)</Label>
                    <Input
                      id="sender-name"
                      type="text"
                      placeholder="Company Name"
                      value={newSenderName}
                      onChange={(e) => setNewSenderName(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  {validationError && (
                    <p className="text-sm text-destructive">{validationError}</p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="rounded-xl"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddSender}
                    disabled={isAdding || !newSenderEmail}
                    className="rounded-xl gap-1.5"
                  >
                    {isAdding ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add to Spam List
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="icon" onClick={loadSenders} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Stats */}
        {senders.length > 0 && (
          <div className="flex gap-3 mt-4">
            <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0 gap-1.5 px-3 py-1">
              <ShieldX className="h-3.5 w-3.5" />
              {spamCount} spam
            </Badge>
            <Badge variant="secondary" className="bg-success/10 text-success border-0 gap-1.5 px-3 py-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              {safeCount} safe
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="relative">
        {senders.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
              <Mail className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              No learned senders yet. Select emails to train the AI.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search senders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl bg-white/50"
              />
            </div>

            {filteredSenders.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground">
                  No senders match "{searchQuery}"
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[260px] pr-4">
                <div className="space-y-2">
                  {filteredSenders.map((sender) => (
                <div 
                  key={sender.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    sender.marked_as_spam 
                      ? 'bg-destructive/5 border border-destructive/20' 
                      : 'bg-success/5 border border-success/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      sender.marked_as_spam ? 'bg-destructive/10' : 'bg-success/10'
                    }`}>
                      {sender.marked_as_spam ? (
                        <ShieldX className="h-5 w-5 text-destructive" />
                      ) : (
                        <ShieldCheck className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">
                        {sender.sender_name || sender.sender_email}
                      </p>
                      {sender.sender_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {sender.sender_email}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleSpamStatus(sender)}
                      className={`rounded-lg text-xs ${
                        sender.marked_as_spam 
                          ? 'hover:bg-success/10 hover:text-success' 
                          : 'hover:bg-destructive/10 hover:text-destructive'
                      }`}
                    >
                      {sender.marked_as_spam ? 'Mark Safe' : 'Mark Spam'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSender(sender)}
                      className="rounded-lg h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
