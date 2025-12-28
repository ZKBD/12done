'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useCreateProperty } from '@/hooks/use-my-properties';
import { BasicInfoStep } from './steps/basic-info-step';
import { LocationStep } from './steps/location-step';
import { DetailsStep } from './steps/details-step';
import { PricingStep } from './steps/pricing-step';
import { ReviewStep } from './steps/review-step';
import type { CreatePropertyDto } from '@/lib/api/my-properties';
import type { ListingType } from '@/lib/types';

export interface PropertyFormData {
  // Basic Info
  title: string;
  description: string;
  listingTypes: ListingType[];

  // Location
  address: string;
  postalCode: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;

  // Details
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  floors?: number;
  yearBuilt?: number;
  petFriendly: boolean;
  noAgents: boolean;

  // Pricing
  basePrice: number;
  currency: string;
}

const initialFormData: PropertyFormData = {
  title: '',
  description: '',
  listingTypes: [],
  address: '',
  postalCode: '',
  city: '',
  country: '',
  bedrooms: undefined,
  bathrooms: undefined,
  squareMeters: undefined,
  floors: undefined,
  yearBuilt: undefined,
  petFriendly: false,
  noAgents: false,
  basePrice: 0,
  currency: 'USD',
};

interface Step {
  id: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Title, description, and listing type',
  },
  {
    id: 'location',
    title: 'Location',
    description: 'Property address and location',
  },
  {
    id: 'details',
    title: 'Property Details',
    description: 'Bedrooms, bathrooms, and features',
  },
  {
    id: 'pricing',
    title: 'Pricing',
    description: 'Set your asking price',
  },
  {
    id: 'review',
    title: 'Review',
    description: 'Review and publish your listing',
  },
];

export function PropertyWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<PropertyFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createProperty = useCreateProperty();

  const updateFormData = useCallback(
    (data: Partial<PropertyFormData>) => {
      setFormData((prev) => ({ ...prev, ...data }));
      // Clear errors for updated fields
      const errorKeys = Object.keys(data);
      setErrors((prev) => {
        const newErrors = { ...prev };
        errorKeys.forEach((key) => delete newErrors[key]);
        return newErrors;
      });
    },
    []
  );

  const validateStep = useCallback(
    (stepIndex: number): boolean => {
      const newErrors: Record<string, string> = {};

      switch (stepIndex) {
        case 0: // Basic Info
          if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
          } else if (formData.title.length < 10) {
            newErrors.title = 'Title must be at least 10 characters';
          }
          if (formData.listingTypes.length === 0) {
            newErrors.listingTypes = 'Select at least one listing type';
          }
          break;

        case 1: // Location
          if (!formData.address.trim()) {
            newErrors.address = 'Address is required';
          }
          if (!formData.city.trim()) {
            newErrors.city = 'City is required';
          }
          if (!formData.country.trim()) {
            newErrors.country = 'Country is required';
          }
          if (!formData.postalCode.trim()) {
            newErrors.postalCode = 'Postal code is required';
          }
          break;

        case 2: // Details
          // Details are optional, no validation needed
          break;

        case 3: // Pricing
          if (!formData.basePrice || formData.basePrice <= 0) {
            newErrors.basePrice = 'Enter a valid price';
          }
          if (!formData.currency) {
            newErrors.currency = 'Currency is required';
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData]
  );

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async (asDraft: boolean = false) => {
    if (!validateStep(currentStep)) return;

    const propertyData: CreatePropertyDto = {
      title: formData.title,
      description: formData.description || undefined,
      listingTypes: formData.listingTypes,
      address: formData.address,
      postalCode: formData.postalCode,
      city: formData.city,
      country: formData.country,
      latitude: formData.latitude,
      longitude: formData.longitude,
      basePrice: formData.basePrice,
      currency: formData.currency,
      bedrooms: formData.bedrooms,
      bathrooms: formData.bathrooms,
      squareMeters: formData.squareMeters,
      floors: formData.floors,
      yearBuilt: formData.yearBuilt,
      petFriendly: formData.petFriendly,
      noAgents: formData.noAgents,
    };

    try {
      const property = await createProperty.mutateAsync(propertyData);
      // Redirect to property edit page to add media
      router.push(`/dashboard/properties/${property.id}`);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <BasicInfoStep
            data={formData}
            errors={errors}
            onChange={updateFormData}
          />
        );
      case 1:
        return (
          <LocationStep
            data={formData}
            errors={errors}
            onChange={updateFormData}
          />
        );
      case 2:
        return (
          <DetailsStep
            data={formData}
            errors={errors}
            onChange={updateFormData}
          />
        );
      case 3:
        return (
          <PricingStep
            data={formData}
            errors={errors}
            onChange={updateFormData}
          />
        );
      case 4:
        return <ReviewStep data={formData} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress */}
      <div className="mb-8">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between mt-4">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => {
                // Only allow going back or clicking completed steps
                if (index < currentStep) {
                  setCurrentStep(index);
                }
              }}
              disabled={index > currentStep}
              className={cn(
                'flex flex-col items-center text-center',
                index > currentStep && 'cursor-not-allowed opacity-50'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium mb-2 transition-colors',
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index < currentStep ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  'text-xs hidden sm:block',
                  index === currentStep
                    ? 'text-primary font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {step.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-background border rounded-xl p-6 mb-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">{steps[currentStep].title}</h2>
          <p className="text-muted-foreground">
            {steps[currentStep].description}
          </p>
        </div>

        {renderStep()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        <div className="flex gap-3">
          {currentStep === steps.length - 1 ? (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit(true)}
                disabled={createProperty.isPending}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSubmit(false)}
                disabled={createProperty.isPending}
                className="gap-2"
              >
                {createProperty.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Property'
                )}
              </Button>
            </>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
