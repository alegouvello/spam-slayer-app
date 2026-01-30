import { Mail, Trash2, Zap, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { lovable } from '@/integrations/lovable';
import { useState } from 'react';
import heroVideo from '@/assets/hero-video.mp4';

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative min-h-[85vh] sm:min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Video */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-background/30 via-background/70 to-background" />
        
        <div className="container mx-auto px-4 sm:px-6 relative z-10">
          <div className="max-w-2xl">
            <p className="text-xs sm:text-sm font-medium text-primary mb-3 sm:mb-4 tracking-wide uppercase">
              Email Simplified
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-medium tracking-tight mb-4 sm:mb-6 leading-[1.1]">
              A cleaner inbox
              <br />
              <span className="text-muted-foreground">starts here</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mb-8 sm:mb-10 max-w-lg leading-relaxed">
              Effortlessly remove spam and unwanted subscriptions. 
              Our AI handles the unsubscribing so you don't have to.
            </p>
            
            {error && (
              <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            
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
            <p className="text-xs text-muted-foreground mt-3 sm:mt-4 text-center sm:text-left">
              Read-only access to your spam folder
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 sm:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-xl mb-10 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-medium mb-3 sm:mb-4">
              How it works
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Three steps to email peace of mind
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-12 md:gap-8">
            {features.map((feature, index) => (
              <div key={feature.title} className="group">
                <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-accent flex items-center justify-center">
                    <feature.icon className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-medium mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-14 sm:py-20 border-t">
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-medium mb-3 sm:mb-4">
            Ready to clean up?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-md mx-auto">
            Join thousands who've already reclaimed their inbox
          </p>
          <Button 
            size="lg" 
            variant="outline"
            className="gap-2 rounded-full h-11 sm:h-12 px-6 sm:px-8 w-full sm:w-auto"
            onClick={handleSignIn}
            disabled={isLoading}
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t">
        <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Spam Cleanup</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Simple email management
          </p>
        </div>
      </footer>
    </div>
  );
};
