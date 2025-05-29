import { IsOptional, IsString, IsInt } from 'class-validator';

export class ListTenantDto {
    @IsOptional()
    @IsString()
    host?: string;

    @IsOptional()
    @IsInt()
    port?: number;

    @IsOptional()
    @IsString()
    domain?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    tenantName?: string;

    @IsOptional()
    @IsString()
    identifier?: string;
}
