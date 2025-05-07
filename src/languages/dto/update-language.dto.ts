import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateLanguageDto } from './create-language.dto';

export class UpdateLanguageDto extends OmitType(CreateLanguageDto, ['module'] as const) { }
