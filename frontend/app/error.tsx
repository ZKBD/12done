'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription className="text-base">
            We apologize for the inconvenience. An unexpected error has occurred.
          </CardDescription>
        </CardHeader>
        {process.env.NODE_ENV === 'development' && error.message && (
          <CardContent>
            <div className="bg-muted p-4 rounded-lg overflow-auto max-h-40">
              <code className="text-sm text-red-600 whitespace-pre-wrap">
                {error.message}
              </code>
            </div>
          </CardContent>
        )}
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3">
          <Button onClick={reset} className="gap-2 w-full sm:w-auto">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
