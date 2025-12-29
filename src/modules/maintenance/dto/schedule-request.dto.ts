import { IsString, IsDateString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ScheduleRequestDto {
  @ApiProperty({
    description: 'Date for the scheduled maintenance',
    example: '2025-01-15',
  })
  @IsDateString()
  scheduledDate: string;

  @ApiProperty({
    description: 'Time slot for the maintenance (HH:MM-HH:MM format)',
    example: '09:00-12:00',
  })
  @IsString()
  @Matches(/^\d{2}:\d{2}-\d{2}:\d{2}$/, {
    message: 'Time slot must be in format HH:MM-HH:MM',
  })
  scheduledTimeSlot: string;
}
