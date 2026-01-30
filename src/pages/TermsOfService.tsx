import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const TermsOfService = () => {
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
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Title */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
              <FileText className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Terms of Service</h1>
              <p className="text-sm text-muted-foreground">Last updated: January 30, 2026</p>
            </div>
          </div>

          {/* Terms Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using Spam Slayer ("the Service"), you accept and agree to be bound by 
                the terms and provisions of this agreement. If you do not agree to these terms, please 
                do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Spam Slayer provides an AI-powered email management service that helps users identify 
                and manage unwanted emails, including spam and promotional content. The Service connects 
                to your Gmail account to scan, analyze, and optionally delete or unsubscribe from 
                unwanted email sources.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. User Accounts and Gmail Access</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                To use the Service, you must:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Have a valid Gmail account</li>
                <li>Grant the Service access to your Gmail through Google OAuth</li>
                <li>Be at least 18 years old or have parental consent</li>
                <li>Provide accurate and complete information</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                You are responsible for maintaining the confidentiality of your account and for all 
                activities that occur under your account.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data and Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We take your privacy seriously. Our Service accesses your email metadata and content 
                solely for the purpose of identifying spam and unwanted emails. We do not sell, share, 
                or use your email data for any purpose other than providing the Service. Please review 
                our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for 
                detailed information about how we handle your data.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                You agree not to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Use the Service for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the Service</li>
                <li>Use the Service to send spam or unsolicited messages</li>
                <li>Reverse engineer or attempt to extract source code</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Service Limitations</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service uses AI to identify spam, which may not be 100% accurate. We are not 
                responsible for emails incorrectly identified as spam or legitimate emails that are 
                missed. Users should review suggestions before taking permanent actions like deletion.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Modifications to Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify or discontinue the Service at any time, with or without 
                notice. We shall not be liable to you or any third party for any modification, 
                suspension, or discontinuance of the Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
              <p className="text-muted-foreground leading-relaxed">
                THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, 
                EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, 
                SECURE, OR ERROR-FREE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                IN NO EVENT SHALL SPAM SLAYER BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, 
                CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA OR EMAILS, ARISING OUT 
                OF YOUR USE OF THE SERVICE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms from time to time. We will notify you of any changes by 
                posting the new Terms on this page and updating the "Last updated" date. Your continued 
                use of the Service after changes constitutes acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about these Terms, please contact us at{' '}
                <a href="mailto:legal@spamslayer.app" className="text-primary hover:underline">
                  legal@spamslayer.app
                </a>
              </p>
            </section>
          </div>

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

export default TermsOfService;
