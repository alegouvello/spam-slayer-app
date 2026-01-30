import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';

const PrivacyPolicy = () => {
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
              <Shield className="h-6 w-6 text-accent-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground">Last updated: January 30, 2026</p>
            </div>
          </div>

          {/* Privacy Content */}
          <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to Spam Slayer ("we," "our," or "us"). We are committed to protecting your 
                privacy and personal information. This Privacy Policy explains how we collect, use, 
                disclose, and safeguard your information when you use our email management service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We collect the following types of information:
              </p>
              
              <h3 className="text-lg font-medium mb-2 mt-4">Account Information</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Email address associated with your Google account</li>
                <li>Name and profile picture (if provided by Google)</li>
                <li>Account preferences and settings</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">Email Data</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Email metadata (sender, subject, date)</li>
                <li>Email content for spam analysis purposes only</li>
                <li>Unsubscribe link information</li>
              </ul>

              <h3 className="text-lg font-medium mb-2 mt-4">Usage Data</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Actions taken within the Service</li>
                <li>Cleanup history and preferences</li>
                <li>Device and browser information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use your information solely for the following purposes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>To provide and maintain our Service</li>
                <li>To analyze emails and identify spam or unwanted messages</li>
                <li>To execute unsubscribe requests on your behalf</li>
                <li>To improve our spam detection algorithms</li>
                <li>To communicate with you about service updates</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Sharing and Disclosure</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We do not sell your personal information. We may share your information only in the 
                following circumstances:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Service Providers:</strong> Third-party services that help us operate the Service (hosting, analytics)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Cookies and Tracking</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                We use cookies and similar tracking technologies to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Remember your preferences and settings</li>
                <li>Maintain your authenticated session</li>
                <li>Analyze usage patterns to improve our Service</li>
                <li>Store your cookie consent preferences</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                You can control cookies through your browser settings. Note that disabling cookies 
                may affect the functionality of our Service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate technical and organizational security measures to protect 
                your information, including encryption in transit and at rest, secure authentication, 
                and regular security audits. However, no method of transmission over the Internet is 
                100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your information for as long as your account is active or as needed to 
                provide you with our Service. Email analysis data is processed in real-time and not 
                permanently stored. Cleanup history is retained for your reference and can be deleted 
                upon request.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Your Rights (GDPR)</h2>
              <p className="text-muted-foreground leading-relaxed mb-3">
                If you are in the European Economic Area, you have the following rights:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Restriction:</strong> Request restriction of processing</li>
                <li><strong>Portability:</strong> Request transfer of your data</li>
                <li><strong>Objection:</strong> Object to processing of your data</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-3">
                To exercise these rights, contact us at{' '}
                <a href="mailto:privacy@spamslayer.app" className="text-primary hover:underline">
                  privacy@spamslayer.app
                </a>
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Google API Services</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our use of information received from Google APIs adheres to the{' '}
                <a 
                  href="https://developers.google.com/terms/api-services-user-data-policy" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google API Services User Data Policy
                </a>
                , including the Limited Use requirements. We only access the minimum data necessary 
                to provide our spam detection and management features.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service is not intended for users under 18 years of age. We do not knowingly 
                collect personal information from children. If we become aware that we have collected 
                data from a child, we will take steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the new policy on this page and updating the "Last 
                updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions or concerns about this Privacy Policy or our data practices, 
                please contact us at:
              </p>
              <div className="mt-3 p-4 bg-muted/50 rounded-lg">
                <p className="text-foreground font-medium">Spam Slayer Privacy Team</p>
                <p className="text-muted-foreground">
                  Email:{' '}
                  <a href="mailto:privacy@spamslayer.app" className="text-primary hover:underline">
                    privacy@spamslayer.app
                  </a>
                </p>
              </div>
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

export default PrivacyPolicy;
