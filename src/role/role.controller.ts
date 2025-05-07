import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  DefaultValuePipe,
  ParseIntPipe,
  Delete,
  Patch,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto, RoleDto } from './dto/create-role.dto';
import { Public } from 'src/auth/auth.decorator';
import { IPaginationOptions, Pagination } from 'nestjs-typeorm-paginate';

@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Public()
  @Post()
  create(@Body() role: CreateRoleDto) {
    return this.roleService.create(role);
  }

  // @Get()
  // findAll() {
  //   return this.roleService.findAll();
  // }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('orderBy') orderBy?: 'asc' | 'desc',
  ): Promise<Pagination<RoleDto>> {
    limit = limit > 100 ? 100 : limit;

    const options: IPaginationOptions = {
      page,
      limit,
    };

    let roles: Pagination<RoleDto>;

    // if (search || type) {
      roles = await this.roleService.searchAndPaginate(
        options,
        search,
        type,
        sortBy,
        orderBy,
      );
    // } else {
    //   roles = await this.roleService.paginate(options, sortBy, orderBy);
    // }

    return roles;
  }

  @Patch()
  bulkUpdateRole(@Body() data: any) {
    return this.roleService.bulkUpdate(data);
  }

  @Get('users')
  async findUsers(
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
  @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit = 10,
  @Query('search') keyword?: string,
  @Query('type') type?: string,
  @Query('sortBy') sortBy?: string,
  @Query('orderBy') orderBy?: 'asc' | 'desc') : Promise<Pagination<RoleDto>> {
    const options: IPaginationOptions = {
      page,
      limit,
    };
    console.log(keyword, "pppppppppppppppppppppppppp")

    let roles: Pagination<RoleDto>;
    roles = await this.roleService.findUsersByRole(options,
      keyword,
      type,
      sortBy,
      orderBy);
        
    return roles;
  }

  @Get(':id')
  findOne(@Param('id') id: any) {
    return this.roleService.findOne(id);
  }

  @Delete()
  bulkDeleteRoles(@Body('roleIds') roleIds: string[]) {
    this.roleService.bulkDeleteRoles(roleIds);
  }

  @Delete(':id')
  deleteRole(@Param('id') id: any) {
    return this.roleService.deleteById(id);
  }
}
