import { motion } from 'framer-motion';
import { Inbox, Sparkles, CheckCircle2, Search, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReactNode } from 'react';

interface EmptyStateProps {
  type: 'no-spam' | 'no-results' | 'success' | 'not-connected';
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const illustrations: Record<string, { icon: ReactNode; gradient: string }> = {
  'no-spam': {
    icon: <Inbox className="h-12 w-12" />,
    gradient: 'from-primary/20 to-accent',
  },
  'no-results': {
    icon: <Search className="h-12 w-12" />,
    gradient: 'from-muted to-secondary',
  },
  'success': {
    icon: <CheckCircle2 className="h-12 w-12" />,
    gradient: 'from-success/20 to-accent',
  },
  'not-connected': {
    icon: <Mail className="h-12 w-12" />,
    gradient: 'from-primary/10 to-accent',
  },
};

const defaultContent: Record<string, { title: string; description: string }> = {
  'no-spam': {
    title: 'Your inbox is sparkling clean!',
    description: 'No spam emails found. Check back later or adjust your scan settings.',
  },
  'no-results': {
    title: 'No matches found',
    description: 'Try adjusting your search or filter criteria.',
  },
  'success': {
    title: 'All done!',
    description: 'Successfully processed all selected emails.',
  },
  'not-connected': {
    title: 'Connect your email',
    description: 'Link your Gmail account to start cleaning up spam.',
  },
};

export const EmptyState = ({ type, title, description, action }: EmptyStateProps) => {
  const illustration = illustrations[type];
  const content = defaultContent[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {/* Animated illustration */}
      <motion.div
        initial={{ y: 10 }}
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className={`relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${illustration.gradient}`}
      >
        <div className="text-foreground/70">
          {illustration.icon}
        </div>
        
        {/* Sparkle decorations */}
        {type === 'no-spam' && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
              className="absolute -right-1 -top-1"
            >
              <Sparkles className="h-5 w-5 text-primary" />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1.2 }}
              className="absolute -left-2 top-4"
            >
              <Sparkles className="h-4 w-4 text-primary/70" />
            </motion.div>
          </>
        )}
        
        {type === 'success' && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-success text-success-foreground"
          >
            <CheckCircle2 className="h-4 w-4" />
          </motion.div>
        )}
      </motion.div>

      <h3 className="mb-2 text-lg font-medium text-foreground">
        {title || content.title}
      </h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        {description || content.description}
      </p>

      {action && (
        <Button onClick={action.onClick} className="rounded-full">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
};
