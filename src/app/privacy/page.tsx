
"use client";

import { useState, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  const [lastUpdatedDate, setLastUpdatedDate] = useState('');

  useEffect(() => {
    setLastUpdatedDate(new Date().toLocaleDateString());
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Privacy Policy" />
      <main className="flex-grow p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Privacy Policy for BharatConnect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-foreground/80">
            <p>Last updated: {lastUpdatedDate || 'Loading...'}</p>
            <p>BharatConnect ("us", "we", or "our") operates the BharatConnect mobile application (the "Service").</p>
            <p>This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.</p>
            <p>We use your data to provide and improve the Service. By using the Service, you agree to the collection and use of information in accordance with this policy.</p>
            <h2 className="text-xl font-semibold pt-2">Information Collection and Use</h2>
            <p>We collect several different types of information for various purposes to provide and improve our Service to you.</p>
            <h3 className="text-lg font-semibold pt-1">Types of Data Collected</h3>
            <h4 className="text-md font-semibold">Personal Data</h4>
            <p>While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data"). Personally identifiable information may include, but is not limited to:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Phone number</li>
              <li>Name</li>
              <li>Profile picture (optional)</li>
              <li>Usage Data</li>
            </ul>
            <h2 className="text-xl font-semibold pt-2">Use of Data</h2>
            <p>BharatConnect uses the collected data for various purposes:</p>
            <ul className="list-disc list-inside ml-4">
              <li>To provide and maintain the Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service when you choose to do so</li>
              <li>To provide customer care and support</li>
              <li>To provide analysis or valuable information so that we can improve the Service</li>
              <li>To monitor the usage of the Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
            <p>...</p>
            <p className="font-semibold">More privacy details will be added here as the application develops features requiring data handling.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
