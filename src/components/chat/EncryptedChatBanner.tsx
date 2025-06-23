"use client";

import { useRouter } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';

export default function EncryptedChatBanner() {
    const router = useRouter();
    return (
        <Alert variant="destructive" className="m-2 rounded-lg border-primary/50 text-primary [&>svg]:text-primary bg-primary/10">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>Encrypted History</AlertTitle>
            <AlertDescription>
                Past messages are unreadable on this device.
                <Button variant="link" className="p-0 h-auto ml-1 text-primary" onClick={() => router.push('/account')}>
                    Restore from backup
                </Button> to view them.
            </AlertDescription>
        </Alert>
    );
}
