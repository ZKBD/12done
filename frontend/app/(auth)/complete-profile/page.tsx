'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/providers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import type { Country } from '@/lib/types';

const profileSchema = z.object({
  address: z.string().min(1, 'Address is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(2, 'Country is required'),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in international format without spaces (e.g., +36201234567)'),
});

type ProfileForm = z.infer<typeof profileSchema>;

export default function CompleteProfilePage() {
  const { completeProfile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    mode: 'onBlur', // Validate on blur for better UX
  });

  useEffect(() => {
    // Fetch countries
    apiClient.get<Country[]>('/countries').then(setCountries).catch(() => {
      // Use a fallback list
      setCountries([
        { code: 'HU', name: 'Hungary', phonePrefix: '+36', currency: 'HUF' },
        { code: 'DE', name: 'Germany', phonePrefix: '+49', currency: 'EUR' },
        { code: 'AT', name: 'Austria', phonePrefix: '+43', currency: 'EUR' },
        { code: 'US', name: 'United States', phonePrefix: '+1', currency: 'USD' },
        { code: 'GB', name: 'United Kingdom', phonePrefix: '+44', currency: 'GBP' },
      ]);
    });
  }, []);

  const onSubmit = async (data: ProfileForm) => {
    setIsLoading(true);
    try {
      await completeProfile(data);
      toast({
        title: 'Profile completed!',
        description: 'Welcome to 12done. Start exploring properties now.',
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to complete profile';
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Complete your profile</CardTitle>
          <CardDescription>
            Hi {user?.firstName}, just a few more details to get started
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                {...register('address')}
                disabled={isLoading}
              />
              {errors.address && (
                <p className="text-sm text-destructive">{errors.address.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal code</Label>
                <Input
                  id="postalCode"
                  placeholder="1051"
                  {...register('postalCode')}
                  disabled={isLoading}
                />
                {errors.postalCode && (
                  <p className="text-sm text-destructive">{errors.postalCode.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Budapest"
                  {...register('city')}
                  disabled={isLoading}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <select
                id="country"
                {...register('country')}
                disabled={isLoading}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Select a country</option>
                {countries.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p className="text-sm text-destructive">{errors.country.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+36201234567"
                {...register('phone')}
                disabled={isLoading || isSubmitting}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                International format without spaces (e.g., +36201234567)
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isLoading || isSubmitting}
              onClick={handleSubmit(onSubmit)}
            >
              {(isLoading || isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Complete Profile
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
