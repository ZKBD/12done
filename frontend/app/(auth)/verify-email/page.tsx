'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { authApi } from '@/lib/api/auth';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2, CheckCircle2, XCircle, Mail } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const { setAuth } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'waiting'>(
    token ? 'loading' : 'waiting'
  );
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (token) {
      verifyEmail(token);
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await authApi.verifyEmail(verificationToken);
      setAuth(response.user, response.tokens.accessToken, response.tokens.refreshToken);
      setStatus('success');
      toast({
        title: 'Email verified!',
        description: 'Your email has been verified successfully.',
      });

      // Redirect after short delay
      setTimeout(() => {
        if (response.user.status === 'PENDING_PROFILE') {
          router.push('/complete-profile');
        } else {
          router.push('/dashboard');
        }
      }, 2000);
    } catch (error: unknown) {
      setStatus('error');
      const message = error instanceof Error ? error.message : 'Verification failed. The link may have expired.';
      setErrorMessage(message);
    }
  };

  if (status === 'waiting') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to{' '}
            <span className="font-medium text-foreground">{email || 'your email'}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>Click the link in the email to verify your account and complete registration.</p>
          <p className="mt-4 text-sm">
            Didn&apos;t receive the email? Check your spam folder or{' '}
            <button className="text-primary hover:underline">resend the email</button>.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Link href="/login">
            <Button variant="ghost">Back to login</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  if (status === 'loading') {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg">Verifying your email...</p>
        </CardContent>
      </Card>
    );
  }

  if (status === 'success') {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl">Email verified!</CardTitle>
          <CardDescription>
            Your email has been verified successfully. Redirecting...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-8 h-8 text-destructive" />
        </div>
        <CardTitle className="text-2xl">Verification failed</CardTitle>
        <CardDescription>{errorMessage}</CardDescription>
      </CardHeader>
      <CardFooter className="flex flex-col gap-2">
        <Link href="/register" className="w-full">
          <Button className="w-full">Try registering again</Button>
        </Link>
        <Link href="/login" className="w-full">
          <Button variant="ghost" className="w-full">Back to login</Button>
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-lg">Loading...</p>
          </CardContent>
        </Card>
      }>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
