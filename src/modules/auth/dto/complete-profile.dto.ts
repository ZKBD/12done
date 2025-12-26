import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompleteProfileDto {
  @ApiProperty({ example: '123 Main Street, Apt 4B', description: 'Street address' })
  @IsString()
  @IsNotEmpty({ message: 'Address is required' })
  address: string;

  @ApiProperty({ example: '1051', description: 'Postal/ZIP code' })
  @IsString()
  @IsNotEmpty({ message: 'Postal code is required' })
  postalCode: string;

  @ApiProperty({ example: 'Budapest', description: 'City name' })
  @IsString()
  @IsNotEmpty({ message: 'City is required' })
  city: string;

  @ApiProperty({ example: 'HU', description: 'ISO 3166-1 alpha-2 country code' })
  @IsString()
  @Length(2, 2, { message: 'Country must be a 2-letter ISO code' })
  country: string;

  @ApiProperty({ example: '+36201234567', description: 'Phone number in international format' })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone must be in international format (e.g., +36201234567)',
  })
  phone: string;
}
