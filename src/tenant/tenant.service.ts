import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, MongoRepository, Not, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Tenant } from './entities/tenant.entity';
import { ConfigService } from '@nestjs/config';
import { SearchTenantDto } from './dto/search-tenant.dto';
import { delCache, getCache } from 'onioncache';
import { pagination, selectFields, sort } from 'src/utils/data.processor';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorMessages, SuccessMessages } from 'src/utils/messages';
import { TenantUsersService } from './modules/tenant-users/tenant-users.service';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import { TenantUser } from './modules/tenant-users/entities/tenant-user.entity';

const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);
@Injectable()
export class TenantService {
    constructor(private readonly mainDataSource: DataSource, @InjectRepository(Tenant) private tenantRepository: Repository<Tenant> & MongoRepository<Tenant>, private tenantUserService: TenantUsersService, private configService: ConfigService, private readonly jwtService: JwtService,) { }
    async findAll(
        searchTenantDto: SearchTenantDto,
        request: any,
        expoLists: any
    ) {
        const {
            keyword,
            page = 1,
            limit,
            sortColumn,
            sortOrder,
            status
        } = searchTenantDto;
        const tenantRepository = await this.mainDataSource.getRepository(Tenant);
        let key = 'tenant_list';
        const getTenant = async () => {
            return await tenantRepository.find({
                where: {
                    identifier: Not(process.env.DEFAULT_TENANT_ID), // Exclude rows where identifier is 'abc'
                },
            });
        };
        let allTenants = await getCache(key, getTenant);
        if (!allTenants) {
            return { allTenant: [], total: 0, totalPages: 0, currentPage: 1, limit };
        }

        let allTenant = allTenants;
        if (keyword && keyword != undefined) {
            let lowercaseKeyword = keyword.toLowerCase().trim();
            allTenant = allTenant.filter(
                (tenant) =>
                    (keyword
                        ? (tenant.tenantName ? tenant.tenantName : "").toLowerCase().includes(lowercaseKeyword)
                        : true) ||
                    (keyword
                        ? (tenant.email ? tenant.email : "").toLowerCase().includes(lowercaseKeyword)
                        : true) ||
                    (keyword
                        ? (tenant.identifier ? tenant.identifier : "").toLowerCase().includes(lowercaseKeyword)
                        : true) ||
                    (keyword
                        ? (tenant.identifier ? tenant.status : "").toLowerCase().includes(lowercaseKeyword)
                        : true)
            );
        }

        let updatedTenants = [];
        if (expoLists !== undefined) {
            updatedTenants = allTenant.map(tenant => {
                const expoCounts = expoLists.data.data[tenant.identifier] || { past: 0, ongoing: 0, future: 0, total: 0 };
                return {
                    ...tenant,
                    expoCounts,
                };
            });
        }
        const columnFields = ['_id', 'tenantName', 'email', 'status', 'identifier', 'expoCounts', 'createdAt'];
        allTenant = selectFields(updatedTenants.length != 0 ? updatedTenants : allTenant, columnFields);

        const totalCount = allTenant.length;

        if (sortColumn && sortColumn !== undefined) {
            allTenant = sort(allTenant, sortColumn, sortOrder);
        }
        
        if (page && limit) {
            allTenant = pagination(allTenant, page, limit);
        }

        const totalPages = Math.ceil(totalCount / limit);
        return {
            allTenant,
            total: totalCount,
            totalPages: totalPages,
            currentPage: page,
            limit: limit,
        };
    }

    async updateTenant(reqUser: any, updateTenant: any) {
        const queryRunnerMain = this.mainDataSource.createQueryRunner();
        await queryRunnerMain.connect();
        await queryRunnerMain.startTransaction();

        try {
            const tenant = await queryRunnerMain.manager.findOne(this.tenantRepository.target, { where: { identifier: updateTenant.identifier } });

            if (!tenant) {
                throw new Error(`Tenant with ID ${updateTenant._id} not found.`);
            }

            // Update tenant fields
            if (updateTenant.tenantName) tenant.tenantName = updateTenant.tenantName;
            if (updateTenant.status) tenant.status = updateTenant.status;
            if (updateTenant.email) tenant.email = updateTenant.email;
            if (updateTenant.phone) tenant.phone = updateTenant.phone;

            const response = await queryRunnerMain.manager.save(this.tenantRepository.target, tenant);
            await queryRunnerMain.commitTransaction();

            if (response) {
                const tenantUser = await this.tenantUserService.findOneByIdentifier(tenant.identifier);

                if (tenantUser) {
                    let userUpdatePayload = { "_id": tenantUser.userId } as { _id: string; email?: string; phoneNumber?: string, status?: string };
                    if (updateTenant.email) userUpdatePayload.email = updateTenant.email;
                    if (updateTenant.phone) userUpdatePayload.phoneNumber = updateTenant.phone;
                    if (updateTenant.status) userUpdatePayload.status = updateTenant.status.charAt(0) + updateTenant.status.slice(1).toLowerCase();

                    const crossToken = await this.jwtService.sign(
                        { createdAt: uuidv4().slice(0, 5) },
                        { secret: this.configService.get('JWT_SECRET'), expiresIn: '1h' }
                    );

                    const user_headers = {
                        'x-tenant-id': tenantUser.tenantIdentifier,
                        'cross-token': crossToken,
                        'role': 'admin'
                    };

                    const userUpdate = await axios.put(`${process.env.BACKEND_URL}/users/tenant/update`, [userUpdatePayload], { headers: user_headers });
                   
                    if (userUpdate.data.data.updateCount > 0) {
                        const tenant_cache = await getCache('tenant_list');
                        if (tenant_cache) {
                            delCache('tenant_list');
                        }
                        return {
                            error: false,
                            data: userUpdate.data
                        }
                    } else {
                        throw new BadRequestException(ErrorMessages.ERROR_UPDATING_TENANT_TDB)
                    }
                } else {
                    
                    throw new BadRequestException(ErrorMessages.TENANT_INFO_NOT_FOUND)
                }
            } else {
                throw new BadRequestException(ErrorMessages.ERROR_UPDATING_TENANT_SADB)
            }
        } catch (error) {
            if (queryRunnerMain.isTransactionActive) {
                await queryRunnerMain.rollbackTransaction();
            }

            if (error instanceof BadRequestException) {
                throw error;
            }

            throw new BadRequestException({
                status: "Error",
                message: error.message,
            });
        } finally {
            await queryRunnerMain.release();
        }
    }

    async deleteTenant(id: string, req: any) {
        try {
            const tenant = await this.tenantRepository.findOne({ where: { _id: id } });
            if (!tenant) {
                throw new NotFoundException(ErrorMessages.TENANT_NOT_FOUND);
            }
            const response = await this.tenantRepository.remove(tenant);

            if (response) {
                const tenantUserResponse = await this.tenantUserService.deleteTenantUser(tenant.email);
                if (tenantUserResponse) {
                    const tenant_cache = await getCache('tenant_list');
                    if (tenant_cache) {
                        delCache('tenant_list');
                    }
                    return {
                        error: false,
                        status: 'success',
                        message: SuccessMessages.TENANT_DELETE_SUCCESS
                    };
                }
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new BadRequestException({
                status: "Error",
                message: error.message || "An error occurred while deleting the tenant",
            });
        }
    }

    async getSingleTenant(id: string, req: any) {
        try {
            const tenant = await this.tenantRepository.findOne({ where: { identifier: id } });
            if (tenant) {
                const { tenantName, email, identifier, status, phone } = tenant;
                return {
                    data: {
                        tenantName, email, identifier, status, phone
                    }
                }
            } else {
                throw new NotFoundException(ErrorMessages.TENANT_NOT_FOUND);
            }
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }

            throw new BadRequestException({
                status: "Error",
                message: error.message || "An error occurred while deleting the tenant",
            });
        }
    }

    async loginAsAdmin(req: any, id: string) {
        try {
            const tenant = await this.tenantRepository.findOne({ where: { identifier: id } });
            if (tenant) {

                const payload = {
                    email: tenant.email,
                    identifier: tenant.identifier
                }
                const tenantToken = await this.jwtService.sign(payload, { secret: this.configService.get('JWT_SECRET'), expiresIn: '1h' });
                return tenantToken;
            } else {
                throw new NotFoundException(ErrorMessages.TENANT_NOT_FOUND);
            }
        } catch (e) {
            console.log(e)
            throw e
        }
    }
}
