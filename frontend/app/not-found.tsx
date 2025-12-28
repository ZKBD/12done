import { FileQuestion, Home, Search, ArrowLeft } from 'lucide-react';
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

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileQuestion className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">Page Not Found</CardTitle>
          <CardDescription className="text-base">
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>Here are some helpful links:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <Link href="/" className="text-primary hover:underline">
                  Home Page
                </Link>
              </li>
              <li>
                <Link href="/properties" className="text-primary hover:underline">
                  Browse Properties
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-primary hover:underline">
                  Your Dashboard
                </Link>
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-3">
          <Link href="/" className="w-full sm:w-auto">
            <Button className="gap-2 w-full">
              <Home className="h-4 w-4" />
              Go Home
            </Button>
          </Link>
          <Link href="/properties" className="w-full sm:w-auto">
            <Button variant="outline" className="gap-2 w-full">
              <Search className="h-4 w-4" />
              Browse Properties
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
