import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RejectRequestDto {
  @ApiProperty({
    description: 'Reason for rejecting the maintenance request',
    example: 'This issue is tenant responsibility per lease agreement section 5.2',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  rejectionReason: string;
}
