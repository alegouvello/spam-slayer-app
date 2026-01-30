import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, { message: 'Name is required' })
    .max(100, { message: 'Name must be less than 100 characters' }),
  email: z
    .string()
    .trim()
    .min(1, { message: 'Email is required' })
    .email({ message: 'Please enter a valid email address' })
    .max(255, { message: 'Email must be less than 255 characters' }),
  subject: z
    .string()
    .trim()
    .min(1, { message: 'Subject is required' })
    .max(200, { message: 'Subject must be less than 200 characters' }),
  message: z
    .string()
    .trim()
    .min(10, { message: 'Message must be at least 10 characters' })
    .max(2000, { message: 'Message must be less than 2000 characters' }),
});

type ContactFormData = z.infer<typeof contactSchema>;

const Contact = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    
    // Simulate form submission delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    // In a real app, you would send this to your backend
    // For now, we'll just show a success state
    setIsSubmitted(true);
    toast.success('Message sent successfully!');
    reset();
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Back to Home</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <Mail className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Contact Us</h1>
              <p className="text-sm text-muted-foreground">We'd love to hear from you</p>
            </div>
          </div>

          {isSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Message Sent!</h2>
              <p className="text-muted-foreground mb-6">
                Thank you for reaching out. We'll get back to you as soon as possible.
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => setIsSubmitted(false)}
              >
                Send Another Message
              </Button>
            </motion.div>
          ) : (
            <>
              {/* Intro */}
              <p className="text-muted-foreground mb-8 leading-relaxed">
                Have a question, feedback, or need help? Fill out the form below and our team 
                will respond within 24-48 hours.
              </p>

              {/* Contact Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      {...register('name')}
                      className={errors.name ? 'border-destructive' : ''}
                    />
                    {errors.name && (
                      <p className="text-xs text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      {...register('email')}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-xs text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="What's this about?"
                    {...register('subject')}
                    className={errors.subject ? 'border-destructive' : ''}
                  />
                  {errors.subject && (
                    <p className="text-xs text-destructive">{errors.subject.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Tell us what's on your mind..."
                    rows={6}
                    {...register('message')}
                    className={errors.message ? 'border-destructive' : ''}
                  />
                  {errors.message && (
                    <p className="text-xs text-destructive">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="rounded-full gap-2 w-full sm:w-auto"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>

              {/* Alternative Contact */}
              <div className="mt-12 pt-8 border-t">
                <h3 className="text-sm font-medium mb-3">Other ways to reach us</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Email:{' '}
                    <a href="mailto:support@spamslayer.app" className="text-primary hover:underline">
                      support@spamslayer.app
                    </a>
                  </p>
                  <p>Response time: Usually within 24-48 hours</p>
                </div>
              </div>
            </>
          )}

          {/* Back Button */}
          <div className="mt-12 pt-8 border-t">
            <Button asChild variant="outline" className="rounded-full gap-2">
              <Link to="/">
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default Contact;
