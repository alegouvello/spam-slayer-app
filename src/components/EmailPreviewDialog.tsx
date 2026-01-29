import { Email } from '@/types/email';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  Calendar, 
  User, 
  ExternalLink, 
  Zap,
  X,
  Trash2
} from 'lucide-react';

interface EmailPreviewDialogProps {
  email: Email | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (emailId: string) => void;
  onUnsubscribe: (email: Email) => void;
}

export const EmailPreviewDialog = ({ 
  email, 
  open, 
  onOpenChange,
  onRemove,
  onUnsubscribe
}: EmailPreviewDialogProps) => {
  if (!email) return null;

  const handleRemove = () => {
    onRemove(email.id);
    onOpenChange(false);
  };

  const handleUnsubscribe = () => {
    onUnsubscribe(email);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-8">
            <Mail className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
            <span className="line-clamp-2">{email.subject}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0">
          {/* Email metadata */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="font-medium text-foreground">{email.sender}</span>
              <span>&lt;{email.senderEmail}&gt;</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date(email.date).toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {email.hasListUnsubscribe && (
                <Badge variant="outline" className="gap-1">
                  <Zap className="h-3 w-3" /> Auto-unsubscribe available
                </Badge>
              )}
              {email.unsubscribeLink && !email.hasListUnsubscribe && (
                <Badge variant="outline" className="gap-1">
                  <ExternalLink className="h-3 w-3" /> Web unsubscribe
                </Badge>
              )}
              {email.spamConfidence === 'definitely_spam' && (
                <Badge variant="destructive">Definitely Spam</Badge>
              )}
              {email.spamConfidence === 'likely_spam' && (
                <Badge className="bg-warning text-warning-foreground">Likely Spam</Badge>
              )}
              {email.spamConfidence === 'might_be_important' && (
                <Badge variant="secondary">Might Be Important</Badge>
              )}
            </div>
          </div>

          <Separator />

          {/* Email body */}
          <ScrollArea className="flex-1 min-h-[200px] max-h-[300px]">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {email.body ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: email.body }} 
                  className="text-sm leading-relaxed"
                />
              ) : (
                <p className="text-muted-foreground italic">{email.snippet}</p>
              )}
            </div>
          </ScrollArea>

          {email.aiReasoning && (
            <>
              <Separator />
              <div className="text-sm">
                <span className="font-medium text-muted-foreground">AI Analysis: </span>
                <span className="italic">"{email.aiReasoning}"</span>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleRemove}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Remove from List
          </Button>
          {(email.hasListUnsubscribe || email.unsubscribeLink) && (
            <Button 
              onClick={handleUnsubscribe}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {email.hasListUnsubscribe ? 'Unsubscribe & Delete' : 'Open Unsubscribe Link'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
