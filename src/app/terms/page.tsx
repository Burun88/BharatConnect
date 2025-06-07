import PageHeader from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Terms of Service" />
      <main className="flex-grow p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-headline">Terms of Service for BharatConnect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-foreground/80">
            <p>Last updated: {new Date().toLocaleDateString()}</p>
            <p>Welcome to BharatConnect! These terms and conditions outline the rules and regulations for the use of BharatConnect's Application.</p>
            <p>By accessing this app we assume you accept these terms and conditions. Do not continue to use BharatConnect if you do not agree to take all of the terms and conditions stated on this page.</p>
            <h2 className="text-xl font-semibold pt-2">License</h2>
            <p>Unless otherwise stated, BharatConnect and/or its licensors own the intellectual property rights for all material on BharatConnect. All intellectual property rights are reserved. You may access this from BharatConnect for your own personal use subjected to restrictions set in these terms and conditions.</p>
            <p>You must not:</p>
            <ul className="list-disc list-inside ml-4">
              <li>Republish material from BharatConnect</li>
              <li>Sell, rent or sub-license material from BharatConnect</li>
              <li>Reproduce, duplicate or copy material from BharatConnect</li>
              <li>Redistribute content from BharatConnect</li>
            </ul>
            <p>This Agreement shall begin on the date hereof.</p>
            <h2 className="text-xl font-semibold pt-2">User Comments</h2>
            <p>Parts of this app may offer an opportunity for users to post and exchange opinions and information. BharatConnect does not filter, edit, publish or review Comments prior to their presence on the app. Comments do not reflect the views and opinions of BharatConnect, its agents and/or affiliates. Comments reflect the views and opinions of the person who posts their views and opinions.</p>
            <p>...</p>
            <p className="font-semibold">More terms and conditions will be detailed here as the application develops.</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
