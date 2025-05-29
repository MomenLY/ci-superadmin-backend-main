import { IsOptional, IsString, IsInt, IsBoolean } from 'class-validator';
import { PaginationDto } from './pagination.dto';


export class SearchTenantDto extends PaginationDto{
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  @IsOptional()
  sortColumn?: string;
  
  @IsString()
  @IsOptional()
  sortOrder?: string;

  @IsOptional()
  isReport?: string;

}
