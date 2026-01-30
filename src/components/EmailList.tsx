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
  Info,
  Eye,
  X,
  ShieldCheck
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
  onPreview: (email: Email) => void;
  onRemove: (emailId: string) => void;
  onMarkNotSpam?: (email: Email) => void;
  safeSenders?: Set<string>;
}

export const EmailList = ({ emails, onSelect, onSelectAll, onPreview, onRemove, onMarkNotSpam, safeSenders }: EmailListProps) => {
  const allSelected = emails.length > 0 && emails.every(e => e.selected);

  const getConfidenceBadge = (confidence?: string) => {
    switch (confidence) {
      case 'definitely_spam':
        return <Badge variant="destructive" className="gap-1 text-xs font-normal"><XCircle className="h-3 w-3" /> Spam</Badge>;
      case 'likely_spam':
        return <Badge className="gap-1 text-xs font-normal bg-warning/15 text-warning-foreground border-warning/30"><AlertTriangle className="h-3 w-3" /> Likely Spam</Badge>;
      case 'might_be_important':
        return <Badge variant="secondary" className="gap-1 text-xs font-normal"><Info className="h-3 w-3" /> Maybe Important</Badge>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'success':
        return <Badge className="gap-1 text-xs font-normal bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3" /> Done</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="gap-1 text-xs font-normal"><XCircle className="h-3 w-3" /> Failed</Badge>;
      case 'opened_link':
        return <Badge variant="outline" className="gap-1 text-xs font-normal"><ExternalLink className="h-3 w-3" /> Opened</Badge>;
      default:
        return null;
    }
  };

  return (
    <Card className="border bg-background/60 backdrop-blur-sm border-border/50">
      <CardHeader className="flex flex-row items-center justify-between pb-3 sm:pb-4 px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg font-medium flex items-center gap-2 sm:gap-3">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          </div>
          <span>Emails ({emails.length})</span>
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs hover:bg-primary/10 h-8 px-2 sm:px-3">
          {allSelected ? 'Deselect' : 'Select All'}
        </Button>
      </CardHeader>
      <CardContent className="pt-0 px-3 sm:px-6">
        <ScrollArea className="h-[400px] sm:h-[480px]">
          <div className="space-y-2">
            {emails.map((email, index) => (
              <div 
                key={email.id}
                className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition-all duration-200 hover:shadow-md ${
                  email.selected 
                    ? 'bg-primary/5 border-primary/30 shadow-sm' 
                    : 'bg-background/80 hover:bg-background border-transparent hover:border-border/50'
                }`}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <Checkbox 
                    checked={email.selected}
                    onCheckedChange={() => onSelect(email.id)}
                    className="mt-0.5"
                  />
                  <div 
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => onPreview(email)}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                      <span className="font-medium text-xs sm:text-sm truncate max-w-[150px] sm:max-w-none">{email.sender}</span>
                      {safeSenders?.has(email.senderEmail.toLowerCase()) && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-normal bg-success/15 text-success border-success/30 px-1.5 sm:px-2">
                              <ShieldCheck className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> <span className="hidden sm:inline">Safe</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            You marked this sender as safe
                          </TooltipContent>
                        </Tooltip>
                      )}
                      {email.hasListUnsubscribe && (
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="outline" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-normal text-primary border-primary/30 bg-primary/5 px-1.5 sm:px-2">
                              <Zap className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> <span className="hidden sm:inline">Auto</span>
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
                            <Badge variant="outline" className="gap-0.5 sm:gap-1 text-[10px] sm:text-xs font-normal px-1.5 sm:px-2">
                              <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> <span className="hidden sm:inline">Web</span>
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            Opens unsubscribe page
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate mb-1.5 sm:mb-2">
                      {email.subject}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <span className="text-[10px] sm:text-xs text-muted-foreground">
                        {new Date(email.date).toLocaleDateString()}
                      </span>
                      {getConfidenceBadge(email.spamConfidence)}
                      {getStatusBadge(email.unsubscribeStatus)}
                    </div>
                    {email.aiReasoning && (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 italic line-clamp-1 bg-accent/30 rounded-md sm:rounded-lg px-1.5 sm:px-2 py-0.5 sm:py-1">
                        ✨ "{email.aiReasoning}"
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                    {onMarkNotSpam && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-success hover:bg-success/10 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              onMarkNotSpam(email);
                            }}
                          >
                            <ShieldCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Not Spam</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreview(email);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Preview</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-7 w-7 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemove(email.id);
                          }}
                        >
                          <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Remove</TooltipContent>
                    </Tooltip>
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
