import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
    @IsString()
    identifier: string;

    @IsOptional()
    @IsString()
    tenantName?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    phone?: string;
}
