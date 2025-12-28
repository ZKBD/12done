'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PropertyWizard } from '@/components/properties/wizard';

export default function NewPropertyPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create New Property</h1>
          <p className="text-muted-foreground">
            Fill in the details to list your property
          </p>
        </div>
      </div>

      {/* Wizard */}
      <PropertyWizard />
    </div>
  );
}
