import { CleanupStats } from '@/types/email';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ExternalLink,
  Zap
} from 'lucide-react';

interface StatsCardsProps {
  stats: CleanupStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  // Don't show stats if nothing has been processed yet
  const hasActivity = stats.totalProcessed > 0 || stats.successfulUnsubscribes > 0 || 
                      stats.failedUnsubscribes > 0 || stats.deletedEmails > 0 || 
                      stats.webLinksOpened > 0;
  
  if (!hasActivity) {
    return null;
  }

  const totalUnsubscribes = stats.autoUnsubscribes + stats.webLinksOpened;
  const autoPercent = totalUnsubscribes > 0 ? Math.round((stats.autoUnsubscribes / totalUnsubscribes) * 100) : 0;
  const webPercent = totalUnsubscribes > 0 ? Math.round((stats.webLinksOpened / totalUnsubscribes) * 100) : 0;

  const cards = [
    {
      title: 'Processed',
      value: stats.totalProcessed,
      icon: Trash2,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
    },
    {
      title: 'Unsubscribed',
      value: stats.successfulUnsubscribes,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'border-success/20',
    },
    {
      title: 'Failed',
      value: stats.failedUnsubscribes,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      borderColor: 'border-destructive/20',
    },
    {
      title: 'Links Opened',
      value: stats.webLinksOpened,
      icon: ExternalLink,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <Card 
            key={card.title} 
            className={`border bg-background/60 backdrop-blur-sm ${card.borderColor} hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </div>
              <p className="text-3xl font-medium mb-1">{card.value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{card.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Unsubscribe Method Breakdown */}
      {totalUnsubscribes > 0 && (
        <Card className="border bg-background/60 backdrop-blur-sm border-border/50">
          <CardContent className="pt-6">
            <h4 className="text-sm font-medium mb-4">Unsubscribe Method Breakdown</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10">
                      <Zap className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span>Auto (Header)</span>
                  </div>
                  <span className="font-medium">{stats.autoUnsubscribes} ({autoPercent}%)</span>
                </div>
                <Progress value={autoPercent} className="h-2" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-warning/10">
                      <ExternalLink className="h-3.5 w-3.5 text-warning" />
                    </div>
                    <span>Web Links</span>
                  </div>
                  <span className="font-medium">{stats.webLinksOpened} ({webPercent}%)</span>
                </div>
                <Progress value={webPercent} className="h-2 [&>div]:bg-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
