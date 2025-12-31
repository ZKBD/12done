/*
  Warnings:

  - The `descriptionTone` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `error` on the `VirtualStagingRequest` table. All the data in the column will be lost.
  - You are about to drop the column `processedAt` on the `VirtualStagingRequest` table. All the data in the column will be lost.
  - You are about to drop the column `stagingStyle` on the `VirtualStagingRequest` table. All the data in the column will be lost.
  - Added the required column `style` to the `VirtualStagingRequest` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID');

-- CreateEnum
CREATE TYPE "BackgroundCheckType" AS ENUM ('BASIC', 'STANDARD', 'COMPREHENSIVE');

-- CreateEnum
CREATE TYPE "DescriptionTone" AS ENUM ('LUXURY', 'FAMILY_FRIENDLY', 'INVESTMENT_FOCUSED', 'MODERN_PROFESSIONAL', 'COZY_WELCOMING');

-- CreateEnum
CREATE TYPE "SplitPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ParticipantPaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EscrowStatus" AS ENUM ('PENDING', 'FUNDED', 'PARTIAL_RELEASE', 'RELEASED', 'DISPUTED', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EscrowMilestoneStatus" AS ENUM ('PENDING', 'COMPLETED', 'APPROVED', 'RELEASED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "VoiceStyle" AS ENUM ('HISTORICAL', 'FRIENDLY', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "InterestCategory" AS ENUM ('HISTORY', 'FOOD', 'ARCHITECTURE', 'NATURE', 'SHOPPING', 'NIGHTLIFE', 'CULTURE', 'SPORTS', 'FAMILY', 'ART');

-- CreateEnum
CREATE TYPE "PoiType" AS ENUM ('RESTAURANT', 'BUILDING', 'PARK', 'SHOP', 'LANDMARK', 'MUSEUM', 'HOTEL', 'TRANSPORT', 'ENTERTAINMENT', 'HEALTHCARE', 'EDUCATION', 'OTHER');

-- CreateEnum
CREATE TYPE "AmbientSoundCategory" AS ENUM ('BEACH', 'CITY', 'NATURE', 'PARK', 'MARKET', 'CAFE', 'MUSEUM', 'TRANSPORT', 'RAIN', 'NIGHT');

-- CreateEnum
CREATE TYPE "PlatformProviderStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InsuranceType" AS ENUM ('HOME', 'RENTERS', 'LANDLORD', 'TITLE', 'MORTGAGE', 'LIABILITY', 'FLOOD', 'FIRE', 'OTHER');

-- CreateEnum
CREATE TYPE "MortgageProductType" AS ENUM ('FIXED_30', 'FIXED_15', 'FIXED_20', 'FIXED_10', 'ARM_5_1', 'ARM_7_1', 'FHA', 'VA', 'JUMBO', 'USDA', 'REFINANCE', 'HOME_EQUITY', 'OTHER');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING', 'VIEWED', 'RESPONDED', 'CLOSED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SchoolLevel" AS ENUM ('ELEMENTARY', 'MIDDLE', 'HIGH', 'PRIVATE', 'CHARTER');

-- CreateEnum
CREATE TYPE "AmenityCategory" AS ENUM ('RESTAURANT', 'GROCERY', 'SHOPPING', 'HEALTHCARE', 'FITNESS', 'PARK', 'ENTERTAINMENT', 'COFFEE', 'BANK', 'TRANSIT', 'SCHOOL', 'LIBRARY', 'PHARMACY', 'GAS_STATION');

-- CreateEnum
CREATE TYPE "ClimateRiskType" AS ENUM ('FLOOD', 'FIRE', 'EARTHQUAKE', 'HURRICANE', 'TORNADO', 'DROUGHT');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'EXTREME');

-- CreateEnum
CREATE TYPE "FinancialPropertyType" AS ENUM ('RESIDENTIAL_SINGLE', 'RESIDENTIAL_MULTI', 'COMMERCIAL', 'INDUSTRIAL', 'MIXED_USE');

-- CreateEnum
CREATE TYPE "MarketTrend" AS ENUM ('UP', 'DOWN', 'STABLE');

-- CreateEnum
CREATE TYPE "RevenueShareType" AS ENUM ('PLATFORM_OWNER', 'BUYER_REWARD', 'DIRECT_INVITER', 'UPSTREAM_NETWORK', 'ALL_USERS_SHARE');

-- CreateEnum
CREATE TYPE "RevenueShareStatus" AS ENUM ('PENDING', 'PROCESSED', 'PAID_OUT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripPlanStatus" AS ENUM ('DRAFT', 'PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttractionCategory" AS ENUM ('MUSEUM', 'MONUMENT', 'PARK', 'RESTAURANT', 'BAR', 'BEACH', 'HIKING_TRAIL', 'VIEWPOINT', 'SHOPPING_CENTER', 'ENTERTAINMENT', 'SPA', 'SPORTS_FACILITY', 'HISTORICAL_SITE', 'RELIGIOUS_SITE', 'NATURE_RESERVE', 'THEME_PARK', 'ZOO', 'AQUARIUM');

-- CreateEnum
CREATE TYPE "AttractionBookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CateringQuoteStatus" AS ENUM ('REQUESTED', 'QUOTED', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MESSAGE_RECEIVED';

-- DropForeignKey
ALTER TABLE "VirtualStagingRequest" DROP CONSTRAINT "VirtualStagingRequest_propertyId_fkey";

-- DropForeignKey
ALTER TABLE "VirtualStagingRequest" DROP CONSTRAINT "VirtualStagingRequest_requestedById_fkey";

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "descriptionTone",
ADD COLUMN     "descriptionTone" "DescriptionTone";

-- AlterTable
ALTER TABLE "VirtualStagingRequest" DROP COLUMN "error",
DROP COLUMN "processedAt",
DROP COLUMN "stagingStyle",
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "providerName" TEXT,
ADD COLUMN     "providerRequestId" TEXT,
ADD COLUMN     "stagedUrl" TEXT,
ADD COLUMN     "style" "StagingStyle" NOT NULL;

-- CreateTable
CREATE TABLE "VerificationRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "documentUrl" TEXT NOT NULL,
    "selfieUrl" TEXT,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "VerificationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundCheck" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "BackgroundCheckType" NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "reportUrl" TEXT,
    "providerName" TEXT,
    "providerReference" TEXT,
    "consentGivenAt" TIMESTAMP(3),
    "consentIpAddress" TEXT,
    "resultSummary" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "BackgroundCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecommendationFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "isPositive" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecommendationFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitPayment" (
    "id" TEXT NOT NULL,
    "rentPaymentId" TEXT,
    "transactionId" TEXT,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "SplitPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "paidCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SplitPaymentParticipant" (
    "id" TEXT NOT NULL,
    "splitPaymentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "paymentToken" TEXT NOT NULL,
    "paymentLinkUrl" TEXT,
    "stripeSessionId" TEXT,
    "status" "ParticipantPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "reminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SplitPaymentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Escrow" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "heldAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "releasedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "thresholdAmount" DECIMAL(12,2),
    "status" "EscrowStatus" NOT NULL DEFAULT 'PENDING',
    "providerName" TEXT,
    "providerReference" TEXT,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "fundedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "disputedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowMilestone" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "conditions" TEXT,
    "status" "EscrowMilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "evidence" TEXT,
    "approvalNotes" TEXT,
    "completedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowDispute" (
    "id" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "evidence" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "voiceStyle" "VoiceStyle" NOT NULL DEFAULT 'FRIENDLY',
    "language" TEXT NOT NULL DEFAULT 'en',
    "interests" JSONB NOT NULL DEFAULT '[]',
    "followMeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "poiRadius" INTEGER NOT NULL DEFAULT 100,
    "ambientSoundEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ambientSoundVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TourPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedPlace" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeType" "PoiType" NOT NULL DEFAULT 'OTHER',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedPlace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomTour" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "estimatedDuration" INTEGER,
    "totalDistance" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomTour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TourStop" (
    "id" TEXT NOT NULL,
    "tourId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "placeName" TEXT NOT NULL,
    "placeType" "PoiType" NOT NULL DEFAULT 'OTHER',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "arrivalDuration" INTEGER,
    "stayDuration" INTEGER NOT NULL DEFAULT 15,
    "customNarration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TourStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserNote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "placeName" TEXT,
    "text" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbientSound" (
    "id" TEXT NOT NULL,
    "category" "AmbientSoundCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "audioUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "loopable" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AmbientSound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterestHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "interest" "InterestCategory" NOT NULL,
    "queryCount" INTEGER NOT NULL DEFAULT 1,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InterestHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflineRegion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "centerLat" DOUBLE PRECISION NOT NULL,
    "centerLng" DOUBLE PRECISION NOT NULL,
    "radiusKm" DOUBLE PRECISION NOT NULL,
    "poiCount" INTEGER NOT NULL DEFAULT 0,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfflineRegion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfflinePoiCache" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "narrations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OfflinePoiCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsuranceProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogo" TEXT,
    "licenseNumber" TEXT NOT NULL,
    "licenseState" TEXT NOT NULL,
    "licenseExpiry" TIMESTAMP(3),
    "taxId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "description" TEXT,
    "yearFounded" INTEGER,
    "employeeCount" INTEGER,
    "insuranceTypes" "InsuranceType"[],
    "coverageAreas" TEXT[],
    "status" "PlatformProviderStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "applicationNotes" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "isPlatformPartner" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MortgageProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyLogo" TEXT,
    "nmlsId" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "licenseState" TEXT,
    "licenseExpiry" TIMESTAMP(3),
    "taxId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'US',
    "description" TEXT,
    "yearFounded" INTEGER,
    "employeeCount" INTEGER,
    "productTypes" "MortgageProductType"[],
    "minLoanAmount" DECIMAL(12,2),
    "maxLoanAmount" DECIMAL(12,2),
    "minCreditScore" INTEGER,
    "lendingAreas" TEXT[],
    "rates" JSONB NOT NULL DEFAULT '{}',
    "status" "PlatformProviderStatus" NOT NULL DEFAULT 'PENDING',
    "statusReason" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "applicationNotes" TEXT,
    "documents" JSONB NOT NULL DEFAULT '[]',
    "isPlatformPartner" BOOLEAN NOT NULL DEFAULT false,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "responseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgResponseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MortgageProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderInquiry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "insuranceProviderId" TEXT,
    "mortgageProviderId" TEXT,
    "providerType" TEXT NOT NULL,
    "propertyId" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "insuranceType" "InsuranceType",
    "mortgageType" "MortgageProductType",
    "loanAmount" DECIMAL(12,2),
    "downPayment" DECIMAL(12,2),
    "creditScore" INTEGER,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "viewedAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,
    "responseBy" TEXT,
    "rating" INTEGER,
    "feedback" TEXT,
    "feedbackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeighborhoodData" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zipCode" TEXT,
    "city" TEXT,
    "state" TEXT,
    "aiDescription" TEXT,
    "neighborhood" TEXT,
    "walkScore" INTEGER,
    "transitScore" INTEGER,
    "bikeScore" INTEGER,
    "safetyScore" INTEGER,
    "crimeData" JSONB,
    "crimeRating" TEXT,
    "demographics" JSONB,
    "noiseLevel" TEXT,
    "airQuality" INTEGER,
    "pollenLevel" TEXT,
    "dataSource" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeighborhoodData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolData" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "name" TEXT NOT NULL,
    "level" "SchoolLevel" NOT NULL,
    "rating" DOUBLE PRECISION,
    "studentCount" INTEGER,
    "address" TEXT,
    "distanceKm" DOUBLE PRECISION,
    "walkingMinutes" INTEGER,
    "drivingMinutes" INTEGER,
    "publicPrivate" TEXT,
    "schoolDistrict" TEXT,
    "grades" TEXT,
    "externalId" TEXT,
    "dataSource" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClimateRiskData" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zipCode" TEXT,
    "floodRisk" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "floodZone" TEXT,
    "fireRisk" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "earthquakeRisk" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "hurricaneRisk" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "tornadoRisk" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "droughtRisk" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "overallRiskScore" INTEGER,
    "overallRiskLevel" "RiskLevel" NOT NULL DEFAULT 'MINIMAL',
    "historicalEvents" JSONB,
    "insuranceNotes" TEXT,
    "floodInsuranceRequired" BOOLEAN NOT NULL DEFAULT false,
    "dataSource" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClimateRiskData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NearbyAmenity" (
    "id" TEXT NOT NULL,
    "refLatitude" DOUBLE PRECISION NOT NULL,
    "refLongitude" DOUBLE PRECISION NOT NULL,
    "category" "AmenityCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distanceMeters" DOUBLE PRECISION NOT NULL,
    "walkingMinutes" INTEGER,
    "drivingMinutes" INTEGER,
    "rating" DOUBLE PRECISION,
    "priceLevel" INTEGER,
    "placeId" TEXT,
    "photoUrl" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "isOpenNow" BOOLEAN,
    "hours" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NearbyAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FutureDevelopment" (
    "id" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "city" TEXT,
    "zipCode" TEXT,
    "projectName" TEXT NOT NULL,
    "projectType" TEXT NOT NULL,
    "description" TEXT,
    "developer" TEXT,
    "plannedStart" TIMESTAMP(3),
    "expectedEnd" TIMESTAMP(3),
    "status" TEXT,
    "impactRadius" DOUBLE PRECISION,
    "estimatedUnits" INTEGER,
    "squareFootage" INTEGER,
    "permitNumber" TEXT,
    "sourceUrl" TEXT,
    "dataSource" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FutureDevelopment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyValuation" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "estimatedValue" DECIMAL(14,2) NOT NULL,
    "confidenceLow" DECIMAL(14,2) NOT NULL,
    "confidenceHigh" DECIMAL(14,2) NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "comparableSales" JSONB,
    "marketData" JSONB,
    "propertyDetails" JSONB,
    "valuationMethod" TEXT NOT NULL DEFAULT 'COMPARABLE',
    "modelVersion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyValuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "price" DECIMAL(14,2) NOT NULL,
    "pricePerSqm" DECIMAL(10,2),
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "daysOnMarket" INTEGER,
    "marketTrend" "MarketTrend",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentPortfolio" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "totalValue" DECIMAL(14,2),
    "totalEquity" DECIMAL(14,2),
    "totalIncome" DECIMAL(14,2),
    "totalExpenses" DECIMAL(14,2),
    "cashFlow" DECIMAL(14,2),
    "overallRoi" DOUBLE PRECISION,
    "cashOnCash" DOUBLE PRECISION,
    "lastCalculatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentPortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioProperty" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "purchasePrice" DECIMAL(14,2) NOT NULL,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "closingCosts" DECIMAL(12,2),
    "renovationCosts" DECIMAL(12,2),
    "downPayment" DECIMAL(12,2),
    "loanAmount" DECIMAL(14,2),
    "interestRate" DOUBLE PRECISION,
    "loanTermYears" INTEGER,
    "monthlyPayment" DECIMAL(10,2),
    "monthlyRent" DECIMAL(10,2),
    "occupancyRate" DOUBLE PRECISION DEFAULT 95,
    "otherIncome" DECIMAL(10,2),
    "propertyTax" DECIMAL(10,2),
    "insurance" DECIMAL(10,2),
    "maintenance" DECIMAL(10,2),
    "utilities" DECIMAL(10,2),
    "hoaFees" DECIMAL(10,2),
    "managementFee" DOUBLE PRECISION,
    "otherExpenses" DECIMAL(10,2),
    "currentValue" DECIMAL(14,2),
    "valueDate" TIMESTAMP(3),
    "depreciationType" "FinancialPropertyType",
    "depreciationYears" INTEGER DEFAULT 27,
    "depreciationStartDate" TIMESTAMP(3),
    "landValue" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DownPaymentProgram" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "programType" TEXT NOT NULL,
    "state" TEXT,
    "county" TEXT,
    "city" TEXT,
    "maxIncome" DECIMAL(12,2),
    "maxPurchasePrice" DECIMAL(14,2),
    "firstTimeBuyer" BOOLEAN NOT NULL DEFAULT true,
    "minCreditScore" INTEGER,
    "maxAmount" DECIMAL(12,2),
    "percentageOfPrice" DOUBLE PRECISION,
    "applicationUrl" TEXT,
    "contactInfo" TEXT,
    "deadline" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DownPaymentProgram_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taxYear" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "rentalIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "otherIncome" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "mortgageInterest" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "propertyTaxes" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "insurance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "repairs" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "maintenance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "utilities" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "management" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "professional" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "depreciation" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherExpenses" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalExpenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netIncome" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "propertyDetails" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowProjection" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "projectionMonths" INTEGER NOT NULL DEFAULT 12,
    "vacancyRate" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "rentGrowthRate" DOUBLE PRECISION NOT NULL DEFAULT 2,
    "expenseGrowthRate" DOUBLE PRECISION NOT NULL DEFAULT 3,
    "projections" JSONB NOT NULL,
    "totalProjectedIncome" DECIMAL(14,2) NOT NULL,
    "totalProjectedExpenses" DECIMAL(14,2) NOT NULL,
    "totalProjectedCashFlow" DECIMAL(14,2) NOT NULL,
    "averageMonthlyCashFlow" DECIMAL(12,2) NOT NULL,
    "baseMonthlyRent" DECIMAL(10,2) NOT NULL,
    "baseMonthlyExpense" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformConfiguration" (
    "id" TEXT NOT NULL,
    "platformOwnerPercent" DOUBLE PRECISION NOT NULL DEFAULT 30,
    "userNetworkTotalPercent" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "allUsersSharePercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "buyerRewardPercent" DOUBLE PRECISION NOT NULL DEFAULT 10,
    "directInviterPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "upstreamNetworkPercent" DOUBLE PRECISION NOT NULL DEFAULT 20,
    "maxUpstreamLevels" INTEGER NOT NULL DEFAULT 10,
    "upstreamLevelWeights" JSONB NOT NULL DEFAULT '[10, 9, 8, 7, 6, 5, 4, 3, 2, 1]',
    "minPayoutAmount" DECIMAL(10,2) NOT NULL DEFAULT 50.00,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "updatedById" TEXT,
    "activatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserWallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "totalEarnings" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "buyerRewardsEarned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inviterCommissionsEarned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "networkSharesEarned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "allUsersShareEarned" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalPaidOut" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "lastPayoutAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueDistribution" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "totalRevenue" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "platformAmount" DECIMAL(14,2) NOT NULL,
    "buyerRewardAmount" DECIMAL(14,2) NOT NULL,
    "directInviterAmount" DECIMAL(14,2) NOT NULL,
    "upstreamNetworkAmount" DECIMAL(14,2) NOT NULL,
    "allUsersShareAmount" DECIMAL(14,2) NOT NULL,
    "configSnapshot" JSONB NOT NULL,
    "status" "RevenueShareStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueDistribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevenueShare" (
    "id" TEXT NOT NULL,
    "distributionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "shareType" "RevenueShareType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "upstreamLevel" INTEGER,
    "status" "RevenueShareStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "payoutMethod" TEXT NOT NULL,
    "payoutDetails" JSONB NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "processedBy" TEXT,
    "externalReference" TEXT,
    "notes" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StayPlanningSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT,
    "season" "Season",
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "budgetMin" DECIMAL(10,2),
    "budgetMax" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "interests" "InterestCategory"[],
    "numberOfGuests" INTEGER,
    "hasChildren" BOOLEAN,
    "childrenAges" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "mobilityNeeds" BOOLEAN DEFAULT false,
    "preferredPace" TEXT,
    "proposals" JSONB,
    "selectedProposalIndex" INTEGER,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StayPlanningSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "planningSessionId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "TripPlanStatus" NOT NULL DEFAULT 'DRAFT',
    "estimatedBudget" DECIMAL(10,2),
    "actualSpent" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "calendarExportedAt" TIMESTAMP(3),
    "icalUid" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripDay" (
    "id" TEXT NOT NULL,
    "tripPlanId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "theme" TEXT,
    "weatherForecast" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripActivity" (
    "id" TEXT NOT NULL,
    "tripDayId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "order" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "InterestCategory",
    "location" TEXT,
    "address" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "travelTimeMinutes" INTEGER,
    "travelMode" TEXT,
    "travelDistance" DOUBLE PRECISION,
    "attractionId" TEXT,
    "bookingId" TEXT,
    "estimatedCost" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "mealType" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attraction" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "AttractionCategory" NOT NULL,
    "subcategory" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "googlePlaceId" TEXT,
    "tripAdvisorId" TEXT,
    "yelpId" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "tripAdvisorRating" DOUBLE PRECISION,
    "googleRating" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "imageUrls" TEXT[],
    "website" TEXT,
    "phone" TEXT,
    "priceLevel" INTEGER,
    "estimatedDuration" INTEGER,
    "openingHours" JSONB,
    "features" TEXT[],
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttractionBooking" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attractionId" TEXT NOT NULL,
    "tripPlanId" TEXT,
    "bookingDate" TIMESTAMP(3) NOT NULL,
    "bookingTime" TIMESTAMP(3),
    "numberOfGuests" INTEGER NOT NULL,
    "ticketType" TEXT,
    "provider" TEXT,
    "externalBookingId" TEXT,
    "externalUrl" TEXT,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "pricePaid" DECIMAL(10,2),
    "status" "AttractionBookingStatus" NOT NULL DEFAULT 'PENDING',
    "confirmedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "confirmationCode" TEXT,
    "ticketUrl" TEXT,
    "qrCode" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttractionBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "serviceRadius" INTEGER,
    "cuisineTypes" TEXT[],
    "eventTypes" TEXT[],
    "minGuests" INTEGER,
    "maxGuests" INTEGER,
    "pricePerPerson" DECIMAL(8,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringMenu" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "menuType" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "pricePerPerson" DECIMAL(8,2) NOT NULL,
    "minimumGuests" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "vegetarianOptions" BOOLEAN NOT NULL DEFAULT false,
    "veganOptions" BOOLEAN NOT NULL DEFAULT false,
    "glutenFreeOptions" BOOLEAN NOT NULL DEFAULT false,
    "halalOptions" BOOLEAN NOT NULL DEFAULT false,
    "kosherOptions" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringMenu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CateringQuote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT NOT NULL,
    "numberOfGuests" INTEGER NOT NULL,
    "venue" TEXT,
    "venueAddress" TEXT,
    "propertyId" TEXT,
    "cuisinePreferences" TEXT[],
    "dietaryRequirements" TEXT[],
    "budgetMin" DECIMAL(10,2),
    "budgetMax" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "additionalNotes" TEXT,
    "status" "CateringQuoteStatus" NOT NULL DEFAULT 'REQUESTED',
    "quotedAmount" DECIMAL(10,2),
    "quotedDetails" TEXT,
    "quotedMenuId" TEXT,
    "quotedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "responseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CateringQuote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VerificationRequest_userId_idx" ON "VerificationRequest"("userId");

-- CreateIndex
CREATE INDEX "VerificationRequest_status_idx" ON "VerificationRequest"("status");

-- CreateIndex
CREATE INDEX "VerificationRequest_submittedAt_idx" ON "VerificationRequest"("submittedAt");

-- CreateIndex
CREATE INDEX "BackgroundCheck_userId_idx" ON "BackgroundCheck"("userId");

-- CreateIndex
CREATE INDEX "BackgroundCheck_status_idx" ON "BackgroundCheck"("status");

-- CreateIndex
CREATE INDEX "BackgroundCheck_requestedAt_idx" ON "BackgroundCheck"("requestedAt");

-- CreateIndex
CREATE INDEX "RecommendationFeedback_userId_idx" ON "RecommendationFeedback"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RecommendationFeedback_userId_propertyId_key" ON "RecommendationFeedback"("userId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "SplitPayment_rentPaymentId_key" ON "SplitPayment"("rentPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "SplitPayment_transactionId_key" ON "SplitPayment"("transactionId");

-- CreateIndex
CREATE INDEX "SplitPayment_status_idx" ON "SplitPayment"("status");

-- CreateIndex
CREATE INDEX "SplitPayment_createdById_idx" ON "SplitPayment"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "SplitPaymentParticipant_paymentToken_key" ON "SplitPaymentParticipant"("paymentToken");

-- CreateIndex
CREATE INDEX "SplitPaymentParticipant_splitPaymentId_idx" ON "SplitPaymentParticipant"("splitPaymentId");

-- CreateIndex
CREATE INDEX "SplitPaymentParticipant_email_idx" ON "SplitPaymentParticipant"("email");

-- CreateIndex
CREATE INDEX "SplitPaymentParticipant_paymentToken_idx" ON "SplitPaymentParticipant"("paymentToken");

-- CreateIndex
CREATE INDEX "SplitPaymentParticipant_status_idx" ON "SplitPaymentParticipant"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Escrow_transactionId_key" ON "Escrow"("transactionId");

-- CreateIndex
CREATE INDEX "Escrow_status_idx" ON "Escrow"("status");

-- CreateIndex
CREATE INDEX "Escrow_buyerId_idx" ON "Escrow"("buyerId");

-- CreateIndex
CREATE INDEX "Escrow_sellerId_idx" ON "Escrow"("sellerId");

-- CreateIndex
CREATE INDEX "EscrowMilestone_escrowId_idx" ON "EscrowMilestone"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowMilestone_status_idx" ON "EscrowMilestone"("status");

-- CreateIndex
CREATE INDEX "EscrowDispute_escrowId_idx" ON "EscrowDispute"("escrowId");

-- CreateIndex
CREATE INDEX "EscrowDispute_status_idx" ON "EscrowDispute"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TourPreferences_userId_key" ON "TourPreferences"("userId");

-- CreateIndex
CREATE INDEX "SavedPlace_userId_idx" ON "SavedPlace"("userId");

-- CreateIndex
CREATE INDEX "SavedPlace_placeId_idx" ON "SavedPlace"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedPlace_userId_placeId_key" ON "SavedPlace"("userId", "placeId");

-- CreateIndex
CREATE INDEX "CustomTour_userId_idx" ON "CustomTour"("userId");

-- CreateIndex
CREATE INDEX "CustomTour_isPublic_idx" ON "CustomTour"("isPublic");

-- CreateIndex
CREATE INDEX "TourStop_tourId_idx" ON "TourStop"("tourId");

-- CreateIndex
CREATE INDEX "TourStop_placeId_idx" ON "TourStop"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "TourStop_tourId_orderIndex_key" ON "TourStop"("tourId", "orderIndex");

-- CreateIndex
CREATE INDEX "UserNote_userId_idx" ON "UserNote"("userId");

-- CreateIndex
CREATE INDEX "UserNote_placeId_idx" ON "UserNote"("placeId");

-- CreateIndex
CREATE INDEX "UserNote_userId_placeId_idx" ON "UserNote"("userId", "placeId");

-- CreateIndex
CREATE INDEX "AmbientSound_category_idx" ON "AmbientSound"("category");

-- CreateIndex
CREATE INDEX "InterestHistory_userId_idx" ON "InterestHistory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "InterestHistory_userId_interest_key" ON "InterestHistory"("userId", "interest");

-- CreateIndex
CREATE INDEX "OfflineRegion_userId_idx" ON "OfflineRegion"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflineRegion_userId_name_key" ON "OfflineRegion"("userId", "name");

-- CreateIndex
CREATE INDEX "OfflinePoiCache_regionId_idx" ON "OfflinePoiCache"("regionId");

-- CreateIndex
CREATE INDEX "OfflinePoiCache_placeId_idx" ON "OfflinePoiCache"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "OfflinePoiCache_regionId_placeId_key" ON "OfflinePoiCache"("regionId", "placeId");

-- CreateIndex
CREATE UNIQUE INDEX "InsuranceProvider_userId_key" ON "InsuranceProvider"("userId");

-- CreateIndex
CREATE INDEX "InsuranceProvider_status_idx" ON "InsuranceProvider"("status");

-- CreateIndex
CREATE INDEX "InsuranceProvider_isPlatformPartner_idx" ON "InsuranceProvider"("isPlatformPartner");

-- CreateIndex
CREATE INDEX "InsuranceProvider_averageRating_idx" ON "InsuranceProvider"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "MortgageProvider_userId_key" ON "MortgageProvider"("userId");

-- CreateIndex
CREATE INDEX "MortgageProvider_status_idx" ON "MortgageProvider"("status");

-- CreateIndex
CREATE INDEX "MortgageProvider_nmlsId_idx" ON "MortgageProvider"("nmlsId");

-- CreateIndex
CREATE INDEX "MortgageProvider_isPlatformPartner_idx" ON "MortgageProvider"("isPlatformPartner");

-- CreateIndex
CREATE INDEX "MortgageProvider_averageRating_idx" ON "MortgageProvider"("averageRating");

-- CreateIndex
CREATE INDEX "ProviderInquiry_userId_idx" ON "ProviderInquiry"("userId");

-- CreateIndex
CREATE INDEX "ProviderInquiry_insuranceProviderId_idx" ON "ProviderInquiry"("insuranceProviderId");

-- CreateIndex
CREATE INDEX "ProviderInquiry_mortgageProviderId_idx" ON "ProviderInquiry"("mortgageProviderId");

-- CreateIndex
CREATE INDEX "ProviderInquiry_status_idx" ON "ProviderInquiry"("status");

-- CreateIndex
CREATE INDEX "ProviderInquiry_providerType_idx" ON "ProviderInquiry"("providerType");

-- CreateIndex
CREATE INDEX "NeighborhoodData_zipCode_idx" ON "NeighborhoodData"("zipCode");

-- CreateIndex
CREATE INDEX "NeighborhoodData_expiresAt_idx" ON "NeighborhoodData"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NeighborhoodData_latitude_longitude_key" ON "NeighborhoodData"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "SchoolData_latitude_longitude_idx" ON "SchoolData"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "SchoolData_level_idx" ON "SchoolData"("level");

-- CreateIndex
CREATE INDEX "SchoolData_rating_idx" ON "SchoolData"("rating");

-- CreateIndex
CREATE INDEX "SchoolData_expiresAt_idx" ON "SchoolData"("expiresAt");

-- CreateIndex
CREATE INDEX "ClimateRiskData_zipCode_idx" ON "ClimateRiskData"("zipCode");

-- CreateIndex
CREATE INDEX "ClimateRiskData_overallRiskLevel_idx" ON "ClimateRiskData"("overallRiskLevel");

-- CreateIndex
CREATE INDEX "ClimateRiskData_expiresAt_idx" ON "ClimateRiskData"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClimateRiskData_latitude_longitude_key" ON "ClimateRiskData"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "NearbyAmenity_refLatitude_refLongitude_idx" ON "NearbyAmenity"("refLatitude", "refLongitude");

-- CreateIndex
CREATE INDEX "NearbyAmenity_category_idx" ON "NearbyAmenity"("category");

-- CreateIndex
CREATE INDEX "NearbyAmenity_expiresAt_idx" ON "NearbyAmenity"("expiresAt");

-- CreateIndex
CREATE INDEX "FutureDevelopment_latitude_longitude_idx" ON "FutureDevelopment"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "FutureDevelopment_projectType_idx" ON "FutureDevelopment"("projectType");

-- CreateIndex
CREATE INDEX "FutureDevelopment_status_idx" ON "FutureDevelopment"("status");

-- CreateIndex
CREATE INDEX "FutureDevelopment_expiresAt_idx" ON "FutureDevelopment"("expiresAt");

-- CreateIndex
CREATE INDEX "PropertyValuation_propertyId_idx" ON "PropertyValuation"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyValuation_createdAt_idx" ON "PropertyValuation"("createdAt");

-- CreateIndex
CREATE INDEX "PriceHistory_propertyId_idx" ON "PriceHistory"("propertyId");

-- CreateIndex
CREATE INDEX "PriceHistory_eventDate_idx" ON "PriceHistory"("eventDate");

-- CreateIndex
CREATE INDEX "InvestmentPortfolio_userId_idx" ON "InvestmentPortfolio"("userId");

-- CreateIndex
CREATE INDEX "PortfolioProperty_portfolioId_idx" ON "PortfolioProperty"("portfolioId");

-- CreateIndex
CREATE INDEX "PortfolioProperty_propertyId_idx" ON "PortfolioProperty"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PortfolioProperty_portfolioId_propertyId_key" ON "PortfolioProperty"("portfolioId", "propertyId");

-- CreateIndex
CREATE INDEX "DownPaymentProgram_state_idx" ON "DownPaymentProgram"("state");

-- CreateIndex
CREATE INDEX "DownPaymentProgram_isActive_idx" ON "DownPaymentProgram"("isActive");

-- CreateIndex
CREATE INDEX "TaxReport_userId_idx" ON "TaxReport"("userId");

-- CreateIndex
CREATE INDEX "TaxReport_taxYear_idx" ON "TaxReport"("taxYear");

-- CreateIndex
CREATE UNIQUE INDEX "TaxReport_userId_taxYear_key" ON "TaxReport"("userId", "taxYear");

-- CreateIndex
CREATE INDEX "CashFlowProjection_propertyId_idx" ON "CashFlowProjection"("propertyId");

-- CreateIndex
CREATE INDEX "PlatformConfiguration_isActive_idx" ON "PlatformConfiguration"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "UserWallet_userId_key" ON "UserWallet"("userId");

-- CreateIndex
CREATE INDEX "UserWallet_balance_idx" ON "UserWallet"("balance");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueDistribution_transactionId_key" ON "RevenueDistribution"("transactionId");

-- CreateIndex
CREATE INDEX "RevenueDistribution_status_idx" ON "RevenueDistribution"("status");

-- CreateIndex
CREATE INDEX "RevenueDistribution_createdAt_idx" ON "RevenueDistribution"("createdAt");

-- CreateIndex
CREATE INDEX "RevenueShare_distributionId_idx" ON "RevenueShare"("distributionId");

-- CreateIndex
CREATE INDEX "RevenueShare_recipientId_idx" ON "RevenueShare"("recipientId");

-- CreateIndex
CREATE INDEX "RevenueShare_shareType_idx" ON "RevenueShare"("shareType");

-- CreateIndex
CREATE INDEX "RevenueShare_status_idx" ON "RevenueShare"("status");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "PayoutRequest_walletId_idx" ON "PayoutRequest"("walletId");

-- CreateIndex
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");

-- CreateIndex
CREATE INDEX "PayoutRequest_createdAt_idx" ON "PayoutRequest"("createdAt");

-- CreateIndex
CREATE INDEX "StayPlanningSession_userId_idx" ON "StayPlanningSession"("userId");

-- CreateIndex
CREATE INDEX "StayPlanningSession_propertyId_idx" ON "StayPlanningSession"("propertyId");

-- CreateIndex
CREATE INDEX "StayPlanningSession_isCompleted_idx" ON "StayPlanningSession"("isCompleted");

-- CreateIndex
CREATE UNIQUE INDEX "TripPlan_planningSessionId_key" ON "TripPlan"("planningSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "TripPlan_icalUid_key" ON "TripPlan"("icalUid");

-- CreateIndex
CREATE INDEX "TripPlan_userId_idx" ON "TripPlan"("userId");

-- CreateIndex
CREATE INDEX "TripPlan_propertyId_idx" ON "TripPlan"("propertyId");

-- CreateIndex
CREATE INDEX "TripPlan_status_idx" ON "TripPlan"("status");

-- CreateIndex
CREATE INDEX "TripPlan_startDate_idx" ON "TripPlan"("startDate");

-- CreateIndex
CREATE INDEX "TripDay_tripPlanId_idx" ON "TripDay"("tripPlanId");

-- CreateIndex
CREATE INDEX "TripDay_date_idx" ON "TripDay"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TripDay_tripPlanId_dayNumber_key" ON "TripDay"("tripPlanId", "dayNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TripActivity_bookingId_key" ON "TripActivity"("bookingId");

-- CreateIndex
CREATE INDEX "TripActivity_tripDayId_idx" ON "TripActivity"("tripDayId");

-- CreateIndex
CREATE INDEX "TripActivity_attractionId_idx" ON "TripActivity"("attractionId");

-- CreateIndex
CREATE INDEX "TripActivity_startTime_idx" ON "TripActivity"("startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Attraction_googlePlaceId_key" ON "Attraction"("googlePlaceId");

-- CreateIndex
CREATE UNIQUE INDEX "Attraction_tripAdvisorId_key" ON "Attraction"("tripAdvisorId");

-- CreateIndex
CREATE INDEX "Attraction_city_country_idx" ON "Attraction"("city", "country");

-- CreateIndex
CREATE INDEX "Attraction_category_idx" ON "Attraction"("category");

-- CreateIndex
CREATE INDEX "Attraction_rating_idx" ON "Attraction"("rating");

-- CreateIndex
CREATE INDEX "Attraction_latitude_longitude_idx" ON "Attraction"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "AttractionBooking_userId_idx" ON "AttractionBooking"("userId");

-- CreateIndex
CREATE INDEX "AttractionBooking_attractionId_idx" ON "AttractionBooking"("attractionId");

-- CreateIndex
CREATE INDEX "AttractionBooking_tripPlanId_idx" ON "AttractionBooking"("tripPlanId");

-- CreateIndex
CREATE INDEX "AttractionBooking_status_idx" ON "AttractionBooking"("status");

-- CreateIndex
CREATE INDEX "AttractionBooking_bookingDate_idx" ON "AttractionBooking"("bookingDate");

-- CreateIndex
CREATE INDEX "CateringProvider_city_country_idx" ON "CateringProvider"("city", "country");

-- CreateIndex
CREATE INDEX "CateringProvider_isActive_idx" ON "CateringProvider"("isActive");

-- CreateIndex
CREATE INDEX "CateringProvider_rating_idx" ON "CateringProvider"("rating");

-- CreateIndex
CREATE INDEX "CateringMenu_providerId_idx" ON "CateringMenu"("providerId");

-- CreateIndex
CREATE INDEX "CateringMenu_isActive_idx" ON "CateringMenu"("isActive");

-- CreateIndex
CREATE INDEX "CateringQuote_userId_idx" ON "CateringQuote"("userId");

-- CreateIndex
CREATE INDEX "CateringQuote_providerId_idx" ON "CateringQuote"("providerId");

-- CreateIndex
CREATE INDEX "CateringQuote_propertyId_idx" ON "CateringQuote"("propertyId");

-- CreateIndex
CREATE INDEX "CateringQuote_status_idx" ON "CateringQuote"("status");

-- CreateIndex
CREATE INDEX "CateringQuote_eventDate_idx" ON "CateringQuote"("eventDate");

-- CreateIndex
CREATE INDEX "VirtualStagingRequest_requestedById_idx" ON "VirtualStagingRequest"("requestedById");

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundCheck" ADD CONSTRAINT "BackgroundCheck_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecommendationFeedback" ADD CONSTRAINT "RecommendationFeedback_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPayment" ADD CONSTRAINT "SplitPayment_rentPaymentId_fkey" FOREIGN KEY ("rentPaymentId") REFERENCES "RentPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPayment" ADD CONSTRAINT "SplitPayment_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SplitPaymentParticipant" ADD CONSTRAINT "SplitPaymentParticipant_splitPaymentId_fkey" FOREIGN KEY ("splitPaymentId") REFERENCES "SplitPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Escrow" ADD CONSTRAINT "Escrow_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowMilestone" ADD CONSTRAINT "EscrowMilestone_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowDispute" ADD CONSTRAINT "EscrowDispute_escrowId_fkey" FOREIGN KEY ("escrowId") REFERENCES "Escrow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourPreferences" ADD CONSTRAINT "TourPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedPlace" ADD CONSTRAINT "SavedPlace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomTour" ADD CONSTRAINT "CustomTour_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TourStop" ADD CONSTRAINT "TourStop_tourId_fkey" FOREIGN KEY ("tourId") REFERENCES "CustomTour"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserNote" ADD CONSTRAINT "UserNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterestHistory" ADD CONSTRAINT "InterestHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflineRegion" ADD CONSTRAINT "OfflineRegion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfflinePoiCache" ADD CONSTRAINT "OfflinePoiCache_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "OfflineRegion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsuranceProvider" ADD CONSTRAINT "InsuranceProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MortgageProvider" ADD CONSTRAINT "MortgageProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInquiry" ADD CONSTRAINT "ProviderInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInquiry" ADD CONSTRAINT "ProviderInquiry_insuranceProviderId_fkey" FOREIGN KEY ("insuranceProviderId") REFERENCES "InsuranceProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInquiry" ADD CONSTRAINT "ProviderInquiry_mortgageProviderId_fkey" FOREIGN KEY ("mortgageProviderId") REFERENCES "MortgageProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderInquiry" ADD CONSTRAINT "ProviderInquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyValuation" ADD CONSTRAINT "PropertyValuation_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentPortfolio" ADD CONSTRAINT "InvestmentPortfolio_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProperty" ADD CONSTRAINT "PortfolioProperty_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "InvestmentPortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioProperty" ADD CONSTRAINT "PortfolioProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxReport" ADD CONSTRAINT "TaxReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowProjection" ADD CONSTRAINT "CashFlowProjection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserWallet" ADD CONSTRAINT "UserWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueDistribution" ADD CONSTRAINT "RevenueDistribution_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShare" ADD CONSTRAINT "RevenueShare_distributionId_fkey" FOREIGN KEY ("distributionId") REFERENCES "RevenueDistribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevenueShare" ADD CONSTRAINT "RevenueShare_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutRequest" ADD CONSTRAINT "PayoutRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "UserWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayPlanningSession" ADD CONSTRAINT "StayPlanningSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StayPlanningSession" ADD CONSTRAINT "StayPlanningSession_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripPlan" ADD CONSTRAINT "TripPlan_planningSessionId_fkey" FOREIGN KEY ("planningSessionId") REFERENCES "StayPlanningSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripDay" ADD CONSTRAINT "TripDay_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripActivity" ADD CONSTRAINT "TripActivity_tripDayId_fkey" FOREIGN KEY ("tripDayId") REFERENCES "TripDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripActivity" ADD CONSTRAINT "TripActivity_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TripActivity" ADD CONSTRAINT "TripActivity_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "AttractionBooking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttractionBooking" ADD CONSTRAINT "AttractionBooking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttractionBooking" ADD CONSTRAINT "AttractionBooking_attractionId_fkey" FOREIGN KEY ("attractionId") REFERENCES "Attraction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttractionBooking" ADD CONSTRAINT "AttractionBooking_tripPlanId_fkey" FOREIGN KEY ("tripPlanId") REFERENCES "TripPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringMenu" ADD CONSTRAINT "CateringMenu_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CateringProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringQuote" ADD CONSTRAINT "CateringQuote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringQuote" ADD CONSTRAINT "CateringQuote_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "CateringProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CateringQuote" ADD CONSTRAINT "CateringQuote_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;
