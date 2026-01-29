import { Email } from '@/types/email';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  X, 
  Zap, 
  ExternalLink, 
  Calendar, 
  User,
  Mail
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
  onUnsubscribe,
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
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg font-medium leading-tight mb-2">
                {email.subject}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  {email.sender}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(email.date).toLocaleDateString()}
                </span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {email.hasListUnsubscribe && (
                <Badge variant="outline" className="gap-1 text-xs font-normal text-primary border-primary/30">
                  <Zap className="h-3 w-3" /> Auto
                </Badge>
              )}
              {email.unsubscribeLink && !email.hasListUnsubscribe && (
                <Badge variant="outline" className="gap-1 text-xs font-normal">
                  <ExternalLink className="h-3 w-3" /> Web
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <Separator />

        <ScrollArea className="flex-1 px-6 py-4">
          <div className="prose prose-sm max-w-none text-foreground">
            {email.body ? (
              <div dangerouslySetInnerHTML={{ __html: email.body }} />
            ) : email.snippet ? (
              <p className="text-muted-foreground">{email.snippet}</p>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Email content preview not available
                </p>
              </div>
            )}
          </div>

          {email.aiReasoning && (
            <div className="mt-6 p-4 rounded-lg bg-accent/50 border border-accent">
              <p className="text-xs font-medium text-muted-foreground mb-1">AI Analysis</p>
              <p className="text-sm">{email.aiReasoning}</p>
            </div>
          )}
        </ScrollArea>

        <Separator />

        <div className="p-4 flex items-center justify-between gap-3">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="h-4 w-4 mr-1.5" />
            Remove
          </Button>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {(email.hasListUnsubscribe || email.unsubscribeLink) && (
              <Button size="sm" onClick={handleUnsubscribe} className="rounded-full">
                {email.hasListUnsubscribe ? (
                  <>
                    <Zap className="h-4 w-4 mr-1.5" />
                    Unsubscribe
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-1.5" />
                    Open Link
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
