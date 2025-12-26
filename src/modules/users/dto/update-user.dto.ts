import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  Length,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'John', description: 'First name' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(50, { message: 'First name must not exceed 50 characters' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Last name' })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(50, { message: 'Last name must not exceed 50 characters' })
  lastName?: string;

  @ApiPropertyOptional({ example: '+36201234567', description: 'Phone in international format' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format (e.g., +36201234567)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '123 Main Street', description: 'Street address' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1051', description: 'Postal/ZIP code' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Budapest', description: 'City name' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'HU', description: 'ISO 3166-1 alpha-2 country code' })
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-letter ISO code' })
  country?: string;
}
