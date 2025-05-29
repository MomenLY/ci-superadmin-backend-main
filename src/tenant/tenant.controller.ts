import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, Request } from '@nestjs/common';
import { Public } from 'src/auth/auth.decorator';
import { TenantService } from './tenant.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { SearchTenantDto } from './dto/search-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { SingleTenantDto } from './dto/single-tenant.dto';
import { single } from 'rxjs';

@Controller('tenant')
export class TenantController {
    constructor(
        private readonly tenantService: TenantService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) {

    }

    @Get()
    async findAll(
        @Query() searchTenantDto: SearchTenantDto,
        @Request() req,
    ): Promise<{}> {
        //for getting expo details from  default db
        let expoLists;
        const isReport = searchTenantDto.isReport || false;
        if (isReport == 'true') {
            try {
                const crossTokenData = {
                    createdAt: uuidv4().slice(0, 5)
                };

                const crossToken = await this.jwtService.sign(crossTokenData, {
                    secret: this.configService.get('JWT_SECRET'),
                    expiresIn: '1h',
                });

                const user_headers = {
                    'x-tenant-id': process.env.DEFAULT_TENANT_ID,
                    'cross-token': crossToken
                };

                expoLists = await axios.post(
                    `${process.env.BACKEND_URL}/expo/expo-counts`,
                    {},
                    { headers: user_headers }
                );
            } catch (error) {
                console.log("Axios error", error);
            }
        }
        return await this.tenantService.findAll(searchTenantDto, req, expoLists);
    }

    @Get('single-tenant')
    async singleTenant(
        @Query() singleTenantDto: SingleTenantDto,
        @Request() req,
    ): Promise<{}> {
        //for getting expo details from  secondary db
        const { identifier, keyword, page, limit } = singleTenantDto;
        try {
            const crossTokenData = {
                createdAt: uuidv4().slice(0, 5)
            };

            const crossToken = await this.jwtService.sign(crossTokenData, {
                secret: this.configService.get('JWT_SECRET'),
                expiresIn: '1h',
            });

            const user_headers = {
                'x-tenant-id': identifier,
                'cross-token': crossToken
            };

            const expoLists = await axios.post(
                `${process.env.BACKEND_URL}/expo/get-expos`,
                { keyword, page, limit },
                { headers: user_headers }
            );
            return expoLists.data.data;
        } catch (error) {
            console.log("Axios error", error);
        }
    }
    @Get(':id')
    async getSingleTenant(@Param('id') id: string, @Request() req: any) {
        return await this.tenantService.getSingleTenant(id, req)
    }
    @Put()
    async updateTenant(@Req() req, @Body() updateTenant: UpdateTenantDto) {
        return this.tenantService.updateTenant(req.user, updateTenant);
    }

    @Delete(':id')
    async deleteTenant(@Req() req, @Param('id') id: string) {
        return this.tenantService.deleteTenant(id, req)
    }

    @Post(':id')
    async loginAsAdmin(@Req() req: any, @Param('id') id: string) {
        return this.tenantService.loginAsAdmin(req, id)
    }
}
