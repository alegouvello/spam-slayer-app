import { Email } from '@/types/email';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Mail, 
  ExternalLink, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Info
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface EmailListProps {
  emails: Email[];
  onSelect: (emailId: string) => void;
  onSelectAll: () => void;
}

export const EmailList = ({ emails, onSelect, onSelectAll }: EmailListProps) => {
  const allSelected = emails.length > 0 && emails.every(e => e.selected);

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'definitely_spam':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Definitely Spam</Badge>;
      case 'likely_spam':
        return <Badge className="gap-1 bg-warning text-warning-foreground"><AlertTriangle className="h-3 w-3" /> Likely Spam</Badge>;
      case 'might_be_important':
        return <Badge variant="secondary" className="gap-1"><Info className="h-3 w-3" /> Might Be Important</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="gap-1 bg-success text-success-foreground"><CheckCircle2 className="h-3 w-3" /> Unsubscribed</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'opened_link':
        return <Badge variant="outline" className="gap-1"><ExternalLink className="h-3 w-3" /> Link Opened</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Spam Emails ({emails.length})
        </CardTitle>
        <Button variant="outline" size="sm" onClick={onSelectAll}>
          {allSelected ? 'Deselect All' : 'Select All'}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-3">
            {emails.map((email) => (
              <div 
                key={email.id}
                className={`p-4 rounded-lg border transition-colors ${
                  email.selected ? 'bg-primary/5 border-primary/30' : 'bg-card hover:bg-muted/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox 
                    checked={email.selected}
                    onCheckedChange={() => onSelect(email.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-medium truncate">{email.sender}</span>
                      {email.hasListUnsubscribe && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="gap-1 text-xs">
                              <Zap className="h-3 w-3" /> Auto
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Can be automatically unsubscribed
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {email.unsubscribeLink && !email.hasListUnsubscribe && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="gap-1 text-xs">
                              <ExternalLink className="h-3 w-3" /> Web
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Opens unsubscribe page in new tab
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {email.subject}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-muted-foreground">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                      {getConfidenceBadge(email.spamConfidence)}
                      {getStatusBadge(email.unsubscribeStatus)}
                    </div>
                    {email.aiReasoning && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        AI: "{email.aiReasoning}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
