
"use client";

import { useState, type FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Logo from '@/components/shared/Logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { auth, resetUserPassword } from '@/lib/firebase';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import type { AuthStep } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export default function LoginPageHub() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { isAuthLoading, loginAndManageSession } = useAuth();
  const [, setAuthStepFromLS] = useLocalStorage<AuthStep>('bharatconnect-auth-step', 'initial_loading');

  const handleContinue = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Use the new context method for login
      await loginAndManageSession(email, password);
      // On success, AuthContext and FirebaseAuthObserver handle the rest.
      // A successful login here might just mean the user is authenticated,
      // but the session conflict dialog might appear.
    } catch (err: any) {
      console.error("[Login Hub] Firebase SignIn Error:", err);
      let userMessage = 'An unexpected error occurred. Please try again.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        userMessage = 'Incorrect email or password. If you\'re new, please Sign Up!';
        toast({
            variant: 'default',
            title: "👋 Whoops! New to BharatConnect?",
            description: "That email & password combo didn't match. If you're new here, tap 'Sign Up' below!",
        });
      } else if (err.code === 'auth/invalid-email') {
        userMessage = 'Invalid email format. Please check your email address.';
      } else if (err.code === 'auth/network-request-failed') {
        userMessage = 'Network error. Please check your connection and try again.';
      } else if (err.code === 'auth/too-many-requests') {
        userMessage = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
      }
      setError(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = () => {
    toast({ title: "Coming Soon!", description: "Google Sign-In will be available soon." });
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address to reset your password.');
      toast({ title: "Email Required", description: "Enter your email to reset password.", variant: "default" });
      return;
    }
    setError('');
    setIsSubmitting(true);
    try {
      await resetUserPassword(email);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a password reset link has been sent.` });
    } catch (err: any) {
      console.error("Error sending password reset email:", err);
      if (err.code === 'auth/invalid-email' || err.code === 'auth/user-not-found') {
        setError('No user found with this email. Please sign up if you are new.');
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUpClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setAuthStepFromLS('signup');
    router.push('/signup');
  };

  if (isAuthLoading) { 
    return (
      <div className="flex flex-col h-[calc(var(--vh)*100)] bg-background items-center justify-center">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
        <p className="mt-4 text-muted-foreground text-center">Loading Login...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            <Logo size="large" />
          </div>
          <CardTitle className="text-2xl font-semibold">Welcome to BharatConnect</CardTitle>
          <CardDescription className="text-muted-foreground pt-2">
            Sign in or create an account to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled>
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /><path d="M1 1h22v22H1z" fill="none" /></svg>
            Sign in with Google (Coming Soon)
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with
              </span>
            </div>
          </div>

          <form onSubmit={handleContinue} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-describedby="login-error"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                aria-describedby="login-error"
                disabled={isSubmitting}
              />
            </div>
            {error && <p id="login-error" className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90 transition-opacity" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : 'Continue'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex-col items-center space-y-3">
          <Button variant="link" size="sm" onClick={handleForgotPassword} className="text-xs text-muted-foreground hover:text-primary">
            Forgot Password?
          </Button>
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link
              href="/signup"
              onClick={handleSignUpClick}
              className="text-primary hover:underline"
            >
              Sign Up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
