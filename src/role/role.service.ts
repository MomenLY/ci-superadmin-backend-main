import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Search,
} from '@nestjs/common';
import { CreateRoleDto, RoleDto } from './dto/create-role.dto';
import { Role, RoleType } from './entities/role.entity';
import { In, MongoRepository, Repository } from 'typeorm';
import { isMongoDB } from 'src/utils/helper';
import { TENANT_CONNECTION } from 'src/tenant/tenant.module';
import { ErrorMessages } from 'src/utils/messages';
import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';
import { User } from 'src/users/entities/user.entity';
import { RoleMongoService } from './role.mongo.service';
import { RolePostgresService } from './role.postgres.service';

@Injectable()
export class RoleService {
  private roleRepository: Repository<Role> & MongoRepository<Role>;
  private userRepository: Repository<User> & MongoRepository<User>;

  constructor(
    @Inject(TENANT_CONNECTION) private connection, 
    private roleMongoService:RoleMongoService, 
    private rolePostgresService: RolePostgresService) {
    this.roleRepository = this.connection.getRepository(Role);
    this.userRepository = this.connection.getRepository(User);
  }

  async create(createRole: CreateRoleDto) {
    const { name, roleType, acl } = createRole;
    if (!Object.values(RoleType).includes(roleType)) {
      throw new BadRequestException(ErrorMessages.INVALID_ROLE_TYPE);
    }

    const role = new Role();

    role.name = name;
    role.roleType = roleType || RoleType.ADMIN;
    role.acl = acl as any;
    return await this.roleRepository.save(role);
  }

  async findAll(): Promise<any> {
    const roles = await this.roleRepository.find();
    return roles;
  }

  async bulkUpdate(roles: Partial<Role>[]): Promise<Role[]> {
    const updatedRoles: Role[] = [];

    for (const roleData of roles) {
      let role;
      if(isMongoDB) {
        role = await this.roleMongoService.findOneById(this.roleRepository, roleData._id)
      } else {
        role = await this.rolePostgresService.findOneById(this.roleRepository, roleData._id)
      }

      if (!role) {
        throw new NotFoundException(`Role with ID ${roleData._id} not found`);
      }

      const updatedRole = this.roleRepository.merge(role, roleData);
      updatedRoles.push(await this.roleRepository.save(updatedRole));
    }

    return updatedRoles;
  }

  // async paginate(
  //   options: IPaginationOptions,
  //   sortBy?: string,
  //   orderBy?: 'asc' | 'desc',
  // ): Promise<Pagination<RoleDto>> {
  //   const page = Number(options.page);
  //   const limit = Number(options.limit);

  //   if (this.roleRepository instanceof MongoRepository) {
  //     const sortOptions: { [key: string]: 1 | -1 } = {};

  //     if (sortBy) {
  //       sortOptions[sortBy] = orderBy === 'asc' ? 1 : -1;
  //     }

  //     const [items, totalItems] = await this.roleRepository.findAndCount({
  //       skip: (page - 1) * limit,
  //       take: limit,
  //       // sort: sortOptions,
  //     });

  //     const roles = items.map((role) => new RoleDto(role));

  //     return {
  //       items: roles,
  //       meta: {
  //         totalItems,
  //         itemCount: items.length,
  //         itemsPerPage: limit,
  //         totalPages: Math.ceil(totalItems / limit),
  //         currentPage: page,
  //       },
  //     };
  //   } else {
  //     const roleRepository = this.roleRepository as Repository<Role>;
  //     const queryBuilder = roleRepository
  //       .createQueryBuilder('Role')
  //       .skip((page - 1) * limit)
  //       .take(limit);

  //     if (sortBy) {
  //       const order = orderBy ? orderBy.toUpperCase() : 'ASC';
  //       if (order === 'ASC' || order === 'DESC') {
  //         queryBuilder.orderBy(`Role.${sortBy}`, order);
  //       }
  //     }

  //     const [items, totalItems] = await queryBuilder.getManyAndCount();
  //     const roles = items.map((role) => new RoleDto(role));

  //     return {
  //       items: roles,
  //       meta: {
  //         totalItems,
  //         itemCount: items.length,
  //         itemsPerPage: limit,
  //         totalPages: Math.ceil(totalItems / limit),
  //         currentPage: page,
  //       },
  //     };
  //   }
  // }

  async searchAndPaginate(
    options: IPaginationOptions,
    keyword?: string,
    type?: string,
    sortBy?: string,
    orderBy?: 'asc' | 'desc',
  ): Promise<Pagination<RoleDto>> {
    const page = Number(options.page);
    const limit = Number(options.limit);

    if (isMongoDB) {
      return this.roleMongoService.searchRoles(this.roleRepository, keyword, type, sortBy, orderBy, limit, page)
    } else {
      return this.rolePostgresService.searchRoles(this.roleRepository, keyword, type, sortBy, orderBy, limit, page)
    }
  }

  async findByIds(ids: string[]) {
    if(isMongoDB) {
      return this.roleMongoService.findByIds(this.roleRepository, ids);
    } else {
      return this.rolePostgresService.findByIds(this.roleRepository, ids);
    }
  }

  async findOne(_id: any) {
    const role = await this.roleRepository.findOneBy({ _id });

    if (role) {
      const { ...rest } = role;
      return rest;
    } else {
      throw new NotFoundException(ErrorMessages.ROLE_NOT_FOUND);
    }
  }

  async findOneByRoleType(roleType: RoleType) {
    return this.roleRepository.findOne({ where: { roleType } });
  }

  async bulkDeleteRoles(roleIds: string[]): Promise<{ message: string }> {
    console.log('bulk delete....................');

    let existingRoles = [];
    if(isMongoDB) {
      existingRoles = await this.roleMongoService.findByIds(this.roleRepository, roleIds)
    } else {
      existingRoles = await this.rolePostgresService.findByIds(this.roleRepository, roleIds)
    }

    const nonExistingRoleIds = roleIds.filter(
      (id) => !existingRoles.some((role) => role._id === id),
    );

    if (nonExistingRoleIds.length > 0) {
      throw new NotFoundException(
        `Roles with IDs ${nonExistingRoleIds.join(', ')} not found`,
      );
    }

    let deletedCount = 0;
    if (isMongoDB) {
      deletedCount = await this.roleMongoService.deleteMany(this.roleRepository, roleIds);
    } else {
      deletedCount = await this.rolePostgresService.deleteMany(this.roleRepository, roleIds);
    }

    if (deletedCount === 0) {
      throw new NotFoundException('No roles found with the provided IDs');
    }

    return { message: 'Roles deleted successfully' };
  }

  async findUsersByRole(
    options: IPaginationOptions,
    keyword?: string,
    type?: string,
    sortBy?: string,
    orderBy?: 'asc' | 'desc',
  ): Promise<Pagination<RoleDto>> {
    console.log(" params for pagination, search", keyword, options);
    try{
    const page = Number(options.page);
    const limit = Number(options.limit);
      if (isMongoDB) {
        const response = await this.roleMongoService.usersByRoleMongo(this.userRepository, keyword, type, sortBy, orderBy, limit, page);
        console.log(response, "from mongo");
        return response;
      } else {
        const response = await this.rolePostgresService.usersByRolePostgres(this.roleRepository, keyword, type, sortBy, orderBy, limit, page);
        console.log(response, "from postgres");
        return response;
      }
    } catch (error) {
      console.error('Error executing query', error);
      throw error;
    }
  }

  async deleteById(id: any) {
    return this.roleRepository.delete(id);
  }

}
