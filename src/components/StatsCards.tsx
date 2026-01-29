import { CleanupStats } from '@/types/email';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ExternalLink
} from 'lucide-react';

interface StatsCardsProps {
  stats: CleanupStats;
}

export const StatsCards = ({ stats }: StatsCardsProps) => {
  const cards = [
    {
      title: 'Processed',
      value: stats.totalProcessed,
      icon: Trash2,
      color: 'text-primary',
      bgColor: 'bg-accent',
    },
    {
      title: 'Unsubscribed',
      value: stats.successfulUnsubscribes,
      icon: CheckCircle2,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Failed',
      value: stats.failedUnsubscribes,
      icon: XCircle,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
    {
      title: 'Links Opened',
      value: stats.webLinksOpened,
      icon: ExternalLink,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <Card key={card.title} className="border-0 elegant-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <p className="text-2xl font-medium mb-1">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.title}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
