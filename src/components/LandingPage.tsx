import { Mail, Trash2, Zap, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lovable } from '@/integrations/lovable';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SeamlessVideo } from '@/components/SeamlessVideo';

export const LandingPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    
    const result = await lovable.auth.signInWithOAuth('google', {
      redirect_uri: window.location.origin,
    });

    if (result.redirected) {
      return;
    }

    if (result.error) {
      setError(result.error.message);
      setIsLoading(false);
      return;
    }

    setIsLoading(false);
  };

  const features = [
    {
      icon: Zap,
      title: 'One-Click Cleanup',
      description: 'Automatically unsubscribe and delete unwanted emails',
    },
    {
      icon: Shield,
      title: 'Privacy First',
      description: 'Your data stays secure. We only access what\'s necessary.',
    },
    {
      icon: Trash2,
      title: 'Smart Detection',
      description: 'AI identifies spam patterns and subscription emails',
    },
  ];

  return (
    <div className="min-h-screen bg-background relative isolate">
      {/* Seamless Background Video */}
      <SeamlessVideo />
      {/* Blocking overlay - prevents native media controls from being triggered */}
      <div className="fixed inset-0 z-[1]" aria-hidden="true" />
      {/* Gradient overlay for text readability */}
      <div className="fixed inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background z-[2]" />
      {/* Bottom gradient to cover iOS native video controls */}
      <div className="fixed bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background via-background to-transparent z-[3]" />
      
      {/* Shimmer overlay effect */}
      <motion.div
        className="fixed inset-0 pointer-events-none z-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.03, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          background: 'linear-gradient(135deg, transparent 0%, hsl(var(--primary) / 0.1) 50%, transparent 100%)',
        }}
      />

      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Single-Screen Layout */}
      <div className="relative min-h-screen flex flex-col z-10">
        {/* Hero Content */}
        <div className="flex-1 flex items-center">
          <div className="container mx-auto px-4 sm:px-6">
            <motion.div 
              className="max-w-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.p 
                className="text-xs sm:text-sm font-medium text-primary mb-3 sm:mb-4 tracking-wide uppercase"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                Email Simplified
              </motion.p>
              <motion.h1 
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-4 sm:mb-6 leading-[1.1]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                A cleaner inbox
                <br />
                <span className="text-muted-foreground">starts here</span>
              </motion.h1>
              <motion.p 
                className="text-base sm:text-lg text-muted-foreground mb-6 max-w-lg leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Effortlessly remove spam and unwanted subscriptions. 
                Our AI handles the unsubscribing so you don't have to.
              </motion.p>
              
              {error && (
                <motion.div 
                  className="mb-4 p-3 sm:p-4 bg-destructive/10 text-destructive rounded-lg text-sm"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {error}
                </motion.div>
              )}
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Button 
                  size="lg" 
                  className="gap-2 sm:gap-3 text-sm sm:text-base px-6 sm:px-8 h-11 sm:h-12 rounded-full elegant-shadow w-full sm:w-auto"
                  onClick={handleSignIn}
                  disabled={isLoading}
                >
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  {isLoading ? 'Connecting...' : 'Continue with Google'}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">
                  Read-only access to your spam folder
                </p>
              </motion.div>

              {/* Inline Features */}
              <motion.div 
                className="flex flex-wrap gap-6 mt-10 pt-8 border-t border-border/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {features.map((feature) => (
                  <div key={feature.title} className="flex items-center gap-2">
                    <feature.icon className="h-4 w-4 text-primary" />
                    <span className="text-sm text-muted-foreground">{feature.title}</span>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="py-4 sm:py-6">
          <div className="container mx-auto px-4 sm:px-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" />
                <span>Spam Slayer</span>
              </div>
              <div className="flex items-center gap-4">
                <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              </div>
              <p>© {new Date().getFullYear()}</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
