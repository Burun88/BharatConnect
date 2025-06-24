
"use client";

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Lock, KeyRound } from 'lucide-react';

export default function PrivacyPage() {
  const [lastUpdatedDate, setLastUpdatedDate] = useState('');

  useEffect(() => {
    setLastUpdatedDate(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Privacy Policy" />
      <main className="flex-grow p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Privacy Policy for BharatConnect</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: {lastUpdatedDate || 'Loading...'}</p>
          </CardHeader>
          <CardContent className="space-y-6 text-foreground/80">
            
            <p>Welcome to BharatConnect. Your privacy is not just a policy for us; it's the foundation of our app. We are committed to protecting your personal conversations and data. This policy outlines how we handle your information with the utmost respect and transparency.</p>
            
            <div className="space-y-4 p-4 border-l-4 border-primary bg-primary/10 rounded-r-lg">
                <h2 className="text-xl font-semibold text-foreground flex items-center"><ShieldCheck className="w-6 h-6 mr-2 text-primary" />Our Core Privacy Promise</h2>
                <p className="font-semibold text-foreground/90">We cannot read your messages or listen to your calls, and no one else can either. Your conversations are yours alone.</p>
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center text-foreground"><Lock className="w-5 h-5 mr-2 text-accent" />End-to-End Encryption (E2EE)</h3>
                <p>Every message, photo, video, and call on BharatConnect is protected by default with state-of-the-art end-to-end encryption. This means that from the moment you send a message to the moment it's received, it is completely scrambled and secure. Only you and the person you're communicating with have the special keys needed to unlock and read them.</p>
            </div>

            <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center text-foreground"><KeyRound className="w-5 h-5 mr-2 text-accent" />Zero-Knowledge Encrypted Backups</h3>
                <p>We provide a feature to back up your chat history, but we do it in a way that preserves your privacy. When you enable cloud backup, you create a unique, secret password or PIN.</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Your secret encryption key is itself encrypted on your device using your password/PIN.</li>
                    <li>We only store this encrypted blob in our secure cloud. We never see your password or your unencrypted key.</li>
                    <li>Without your unique password, your backup is just unreadable, scrambled data to everyone, including us.</li>
                    <li>This means you are in full control. Only you can restore your chat history on a new device.</li>
                </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Information We Do Collect</h3>
              <p>To operate the BharatConnect service, we need to collect some basic information:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Account Information:</strong> When you register, we collect your email and ask you to create a unique username and display name. Your phone number is optional but helps others find you.</li>
                <li><strong>Connections:</strong> We maintain a list of your connections on the platform to enable communication.</li>
                <li><strong>Profile Information:</strong> Any information you voluntarily add to your profile, such as a profile picture or bio.</li>
                <li><strong>Technical Information:</strong> We may collect non-personally identifiable information for technical purposes, such as crash logs or performance data, to help us improve the app.</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">How We Use Your Information</h3>
              <p>We use the information we collect solely to:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide, operate, and maintain our chat service.</li>
                <li>Improve, personalize, and expand our service.</li>
                <li>Understand and analyze how you use our service to enhance user experience.</li>
                <li>Communicate with you for customer service or to provide you with updates.</li>
                <li>Prevent fraud and ensure the security of our platform.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Your Choices and Control</h3>
              <p>You have full control over your data. You can edit your profile information, manage your connections, and enable or disable the cloud backup feature at any time through the app's settings.</p>
            </div>
            
            <p className="pt-4">If you have any questions about this Privacy Policy, please contact us. Your trust is important to us, and we're committed to protecting your privacy.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
