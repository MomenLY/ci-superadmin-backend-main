import { IsOptional, IsString, IsInt, IsBoolean, IsNotEmpty } from 'class-validator';
import { PaginationDto } from './pagination.dto';


export class SingleTenantDto extends PaginationDto{
  @IsNotEmpty()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  keyword?: string;

}
