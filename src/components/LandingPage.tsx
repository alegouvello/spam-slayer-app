import { Mail, Trash2, Zap, Shield, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { lovable } from '@/integrations/lovable';
import { useState } from 'react';

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
      icon: Mail,
      title: 'Smart Spam Detection',
      description: 'AI analyzes your spam folder and identifies unwanted subscriptions',
    },
    {
      icon: Zap,
      title: 'Auto-Unsubscribe',
      description: 'Automatically unsubscribe from emails with List-Unsubscribe headers',
    },
    {
      icon: Trash2,
      title: 'Auto-Delete',
      description: 'Processed emails are automatically deleted to keep your inbox clean',
    },
    {
      icon: Shield,
      title: 'Safe & Secure',
      description: 'Your data never leaves our secure servers. We only access what we need.',
    },
    {
      icon: Clock,
      title: 'Scheduled Cleanup',
      description: 'Set it and forget it with automatic daily, weekly, or monthly scans',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered',
      description: 'Smart classification tells you exactly why each email is marked as spam',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Email Cleanup
            </div>
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
              Clean Your{' '}
              <span className="text-primary">Spam Folder</span>
              <br />
              Automatically
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Stop drowning in spam. Our AI scans your spam folder, identifies unwanted subscriptions, 
              and automatically unsubscribes you — then deletes the emails.
            </p>
            
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <Button 
              size="lg" 
              className="gap-2 text-lg px-8 py-6 rounded-xl shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
              onClick={handleSignIn}
              disabled={isLoading}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
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
              {isLoading ? 'Connecting...' : 'Sign in with Google'}
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              We'll request access to read and manage your spam folder only
            </p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to a cleaner inbox
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {[
            { step: '1', title: 'Connect', desc: 'Sign in with Google and grant access to your spam folder' },
            { step: '2', title: 'Scan', desc: 'AI analyzes your spam and identifies unsubscribe opportunities' },
            { step: '3', title: 'Clean', desc: 'Approve the suggestions and watch your spam disappear' },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground text-xl font-bold flex items-center justify-center mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="border-0 shadow-lg">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Spam Cleanup — AI-powered email management</p>
        </div>
      </footer>
    </div>
  );
};
