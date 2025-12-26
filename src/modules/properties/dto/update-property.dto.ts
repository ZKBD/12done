import { PartialType, OmitType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['listingTypes'] as const),
) {
  // listingTypes handled separately since it's an array that should be replaced entirely
}
