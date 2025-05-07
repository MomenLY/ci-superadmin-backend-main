import {
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateBulkDto,
  CreateUserDto,
  ForgotPasswordDTO,
  ResetPasswordDTO,
  UserDto,
} from './dto/create-user.dto';
import { ILike, MongoRepository, Not, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from '@node-rs/bcrypt';
import {
  getDurationBetweenDates,
  isMongoDB,
  isObjectIdOrUUID,
} from 'src/utils/helper';
import { IDENTIFY_TENANT_FROM_PRIMARY_DB } from 'src/utils/db-utls';
import { ObjectId } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import {
  IPaginationOptions,
  Pagination,
  // paginate,
} from 'nestjs-typeorm-paginate';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, RoleType } from 'src/role/entities/role.entity';
import { TENANT_CONNECTION } from 'src/tenant/tenant.module';
import { TenantUser } from 'src/tenant/modules/tenant-users/entities/tenant-user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { delCache, getCache } from 'memcachelibrarybeta';
import { EmailLibrary } from '../utils/emailLibrary';
import { templateCode } from 'src/utils/config';
import { PasswordTokens } from 'src/password-token/entities/password-token.entity';
import { ErrorMessages, SuccessMessages } from 'src/utils/messages';
import { ProfileFieldsService } from 'src/profileFields/profileFields.service';
import { ColumnType } from 'src/profileFields/entities/profileFields.entity';
import { UsersMongoService } from './users.mongo.service';
import { UsersPostgresService } from './users.postgres.service';

@Injectable()
export class UsersService {
  private userRepository: Repository<User> & MongoRepository<User>;
  private roleRepository: Repository<Role> & MongoRepository<Role>;
  private passwordTokensRepository: Repository<PasswordTokens> &
    MongoRepository<PasswordTokens>;
  tokenLife: number;
  userService: any;

  constructor(
    @Inject(TENANT_CONNECTION) private connection,
    @InjectRepository(TenantUser)
    private tenantUserRepository: Repository<TenantUser>,
    private emailService: EmailLibrary,
    private profileFieldsService: ProfileFieldsService,
    private usersMongoService: UsersMongoService,
    private usersPostgresService: UsersPostgresService
  ) {
    this.tokenLife = 24; //in hours
    this.userRepository = this.connection.getRepository(User);
    this.roleRepository = this.connection.getRepository(Role);
    this.passwordTokensRepository =
      this.connection.getRepository(PasswordTokens);
  }

  async findOne(_id: any): Promise<User> {
    try {
      const getUserById = async (_id: any) => {
        let user;
        if (isMongoDB) {
          user = await this.usersMongoService.findOne(this.userRepository, _id);
        } else {
          user = await this.usersPostgresService.findOne(this.userRepository, _id);
        }
        if (!user) {
          throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
        }
        return user;
      };

      return getCache(_id, getUserById, _id);
    } catch (e) {
      throw e;
    }
  }

  async findOneByEmail(email: string): Promise<User> {
    return this.userRepository.findOne({ where: { email: email } });
  }

  // findByKeyword(keyword: string) {
  //   if (isMongoDB) {
  //     return this.userRepository.find({
  //       where: {
  //         $or: [
  //           { firstName: { $regex: keyword, $options: 'i' } },
  //           { lastName: { $regex: keyword, $options: 'i' } },
  //         ],
  //       },
  //       select: ['_id', 'firstName', 'lastName', 'email'],
  //     });
  //   } else {
  //     return this.userRepository.find({
  //       where: [
  //         { firstName: ILike(`%${keyword}%`) },
  //         { lastName: ILike(`%${keyword}%`) },
  //       ],
  //       select: ['_id', 'firstName', 'lastName', 'email'],
  //     });
  //   }
  // }

  async Validate(_id: any): Promise<any> {
    let user;
    if (isMongoDB) {
      user = await this.usersMongoService.findOne(this.userRepository, _id);
    } else {
      user = await this.usersPostgresService.findOne(this.userRepository, _id);
    }
    if (user) {
      const {} = user;
      return {
        user: {
          uuid: user._id,
          role: 'user',
          data: {
            displayName: user.firstName + ' ' + user.lastName,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            acl: user.acl,
            dateOfBirth: user.dateOfBirth,
            gender: user.gender,
            countryCode: user.countryCode,
            phoneNumber: user.phoneNumber,
            country: user.country,
            address: user.address,
            enforcePasswordReset: user.enforcePasswordReset,
          },
        },
      };
    } else {
      throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
    }
  }

  // async create(createUserDto: CreateUserDto) {
  //   const { email, password, firstName, lastName } = createUserDto;
  //   const serviceMessageObject = { message: '' };
  //   if (IDENTIFY_TENANT_FROM_PRIMARY_DB) {
  //     const user = await this.tenantUserRepository.findOne({
  //       where: { email },
  //     });
  //     if (user) {
  //       throw new NotFoundException(ErrorMessages.EMAIL_ALREADY_EXISTS);
  //     }
  //   }
  //   const user = await this.userRepository.findOne({ where: { email } });
  //   if (user) {
  //     throw new NotFoundException(ErrorMessages.EMAIL_ALREADY_EXISTS);
  //   }

  //   const role = await this.roleRepository.findOne({
  //     where: { roleType: RoleType.ENDUSER },
  //   });
  //   if (role) {
  //     const roleId = role._id;
  //     const saltRounds = 10;
  //     const hash = await bcrypt.hash(password, saltRounds);
  //     createUserDto.password = hash;
  //     if (!createUserDto.roleIds.includes(roleId)) {
  //       createUserDto.roleIds.push(roleId);
  //     }
  //     const newUser = await this.userRepository.save(createUserDto);
  //     if (IDENTIFY_TENANT_FROM_PRIMARY_DB) {
  //       await this.tenantUserRepository.save({
  //         name: firstName + ' ' + lastName,
  //         email: email,
  //         phone: '',
  //         tenantIdentifier: this.connection.name,
  //         userId: newUser._id,
  //       });
  //     }
  //     if (newUser) {
  //       const userRegistrationTemplate = templateCode.USERACCOUNTCREATION;
  //       const data = {
  //         Template: userRegistrationTemplate,
  //         recipientEmail: newUser.email,
  //         TemplateData: {
  //           receiverName: newUser.firstName + ' ' + newUser.lastName,
  //           url: `${process.env.CLIENT_SIDE_URL}/sign-in`,
  //         },
  //       };
  //       serviceMessageObject['message'] =
  //         SuccessMessages.USER_ACCOUNT_CREATION_SUCCESS;
  //       const response = await this.emailService.sendEmail(data);
  //       if (response['error'] === true) {
  //         serviceMessageObject['message'] =
  //           ErrorMessages.USER_ACCOUNT_CREATED_EMAIL_NOT_SENT;
  //       }
  //     } else {
  //       throw new BadRequestException(ErrorMessages.EMAIL_SENDING_ERROR);
  //     }

  //     return {
  //       ...newUser,
  //       password: undefined,
  //       message: serviceMessageObject['message'],
  //     };
  //   } else {
  //     throw new NotFoundException(ErrorMessages.ENDUSER_NOT_FOUND);
  //   }
  // }

  // async createUserBulk(createUserDto: CreateBulkDto) {
  //   const { users } = createUserDto;
  //   const savedUser = [];
  //   for (const userData of users) {
  //     const { email, password } = userData;
  //     const user = await this.userRepository.findOne({ where: { email } });
  //     if (user) {
  //       throw new BadRequestException(ErrorMessages.USER_ALREADY_EXIXTS);
  //     }

  //     const saltRounds = 10;
  //     const hash = await bcrypt.hash(password, saltRounds);
  //     userData.password = hash;

  //     const newUser = await this.userRepository.save(userData);
  //     savedUser.push({ ...newUser, password: undefined });
  //   }
  //   return savedUser;
  // }

  // findAll() {
  //   console.log('from sreeja');
  //   return this.userRepository.find({
  //     select: [
  //       'firstName',
  //       'lastName',
  //       'email',
  //       'gender',
  //       'phoneNumber',
  //       'address',
  //       'dateOfBirth',
  //       'enforcePasswordReset',
  //     ],
  //   });
  // }

  async adminResetPassword(_id: string) {
    const DEFAULT_PASSWORD = 'Welcome123';
    try {
      if (!isObjectIdOrUUID(_id)) {
        throw new BadRequestException(ErrorMessages.INVALID_UUID_FORMAT);
      }

      let user;
      if (isMongoDB) {
        user = await this.usersMongoService.findOne(this.userRepository, _id);
      } else {
        user = await this.usersPostgresService.findOne(this.userRepository, _id);
      }

      if (!user) {
        throw new NotFoundException(
          ErrorMessages.USER_NOT_FOUND + `with ID ${_id}`,
        );
      }

      const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
      user.password = hashedPassword;
      const result = await this.userRepository.save(user);

      return {
        _id: result._id,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      } else {
        throw new InternalServerErrorException(error.message);
      }
    }
  }

  // async update(
  //   id: string,
  //   updateUserDto: UpdateUserDto,
  //   resetPassword: boolean,
  // ) {
  //   const DEFAULT_PASSWORD = 'Welcome123';
  //   try {
  //     if (!isObjectIdOrUUID(id)) {
  //       throw new BadRequestException(ErrorMessages.INVALID_UUID_FORMAT);
  //     }
  //     const user = await this.userRepository.findOne({
  //       where: { _id: id },
  //       select: [
  //         '_id',
  //         'firstName',
  //         'lastName',
  //         'email',
  //         'dateOfBirth',
  //         'gender',
  //         'countryCode',
  //         'phoneNumber',
  //         'password',
  //         'country',
  //         'address',
  //         'acl',
  //         'roleIds',
  //         'createdAt',
  //         'updatedAt',
  //       ],
  //     });

  //     if (!user) {
  //       throw new NotFoundException(
  //         ErrorMessages.USER_NOT_FOUND + `with ID ${id}`,
  //       );
  //     }

  //     if (resetPassword === true) {
  //       console.log('yes resetpassword is true');

  //       const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  //       user.password = hashedPassword;
  //       const result = await this.userRepository.save(user);

  //       return result;
  //     }

  //     if (updateUserDto.email && updateUserDto.email !== user.email) {
  //       const isEmailTaken = await this.userRepository.findOne({
  //         where: { _id: Not(id), email: updateUserDto.email },
  //       });
  //       if (isEmailTaken) {
  //         throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_EXISTS);
  //       }
  //     }

  //     if (IDENTIFY_TENANT_FROM_PRIMARY_DB) {
  //       const { email } = user;
  //       const tenantUser = await this.tenantUserRepository.findOne({
  //         where: { email },
  //       });
  //       if (tenantUser) {
  //         const isEmailTaken = await this.tenantUserRepository.findOne({
  //           where: { _id: Not(tenantUser._id), email: updateUserDto.email },
  //         });
  //         if (isEmailTaken) {
  //           throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_EXISTS);
  //         }
  //       }
  //     }
  //     Object.assign(user, updateUserDto);
  //     try {
  //       await delCache(id);
  //     } catch (err) {}
  //     const result = await this.userRepository.save(user);
  //     return result;
  //   } catch (error) {
  //     if (error instanceof HttpException) {
  //       throw error;
  //     } else {
  //       throw new InternalServerErrorException(error.message);
  //     }
  //   }
  // }

  // async delete(id: string) {
  //   if (!isObjectIdOrUUID(id)) {
  //     throw new BadRequestException(ErrorMessages.INVALID_UUID_FORMAT);
  //   }
  //   const user = await this.userRepository.findOneBy({ _id: id });
  //   if (!user) {
  //     throw new BadRequestException(ErrorMessages.USER_NOT_FOUND);
  //   }
  //   await this.userRepository.remove(user);
  //   return SuccessMessages.DELETION_SUCCESS;
  // }

  // async paginate(options: IPaginationOptions): Promise<Pagination<UserDto>> {
  //   const { items, ...paginationInfo } = await paginate<User>(
  //     this.userRepository,
  //     options,
  //   );
  //   const users = items.map((user) => new UserDto(user));
  //   return { items: users, ...paginationInfo };
  // }

  // async paginate(
  //   options: IPaginationOptions,
  //   sortBy?: string,
  //   orderBy?: 'asc' | 'desc',
  // ): Promise<Pagination<UserDto>> {
  //   const page = Number(options.page);
  //   const limit = Number(options.limit);

  //   if (this.userRepository instanceof MongoRepository) {
  //     const sortOptions: { [key: string]: 1 | -1 } = {};

  //     if (sortBy) {
  //       sortOptions[sortBy] = orderBy === 'asc' ? 1 : -1;
  //     }

  //     const [items, totalItems] = await this.userRepository.findAndCount({
  //       skip: (page - 1) * limit,
  //       take: limit,
  //       // sort: sortOptions,
  //     });

  //     const users = items.map((user) => new UserDto(user));

  //     return {
  //       items: users,
  //       meta: {
  //         totalItems,
  //         itemCount: items.length,
  //         itemsPerPage: limit,
  //         totalPages: Math.ceil(totalItems / limit),
  //         currentPage: page,
  //       },
  //     };
  //   } else {
  //     const userRepository = this.userRepository as Repository<User>;
  //     const queryBuilder = userRepository
  //       .createQueryBuilder('User')
  //       .skip((page - 1) * limit)
  //       .take(limit);

  //     if (sortBy) {
  //       const order = orderBy ? orderBy.toUpperCase() : 'ASC';
  //       if (order === 'ASC' || order === 'DESC') {
  //         queryBuilder.orderBy(`User.${sortBy}`, order);
  //       }
  //     }

  //     const [items, totalItems] = await queryBuilder.getManyAndCount();
  //     const users = items.map((user) => new UserDto(user));

  //     return {
  //       items: users,
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
    search?: string,
    sortBy?: string,
    orderBy?: 'asc' | 'desc',
  ): Promise<Pagination<UserDto>> {
    const page = Number(options.page);
    const limit = Number(options.limit);
    const profileFields = await this.profileFieldsService.findActiveFields();

    if (isMongoDB) {
      return this.usersMongoService.searchUser(this.connection, profileFields, search, sortBy, orderBy, page, limit)
    } else {
      return this.usersPostgresService.searchUser(this.connection, profileFields, search, sortBy, orderBy, page, limit)
    }
  }

  async forgotpassword(forgotPassword: ForgotPasswordDTO) {
    try {
      const user = await this.findOneByEmail(forgotPassword.email);
      if (!user) {
        throw new NotFoundException(ErrorMessages.USER_NOT_FOUND);
      } else {
        const token = await uuidv4();
        const passwordReset = new PasswordTokens();
        passwordReset.expiresIn = new Date();
        passwordReset.userId = user._id;
        passwordReset.token = token;
        await passwordReset.save();

        const resetPasswordURL = `${process.env.CLIENT_SIDE_URL}/reset-password/${token}`;
        const receiverName = user.firstName + ' ' + user.lastName;
        const ResetPasswordTemplate = templateCode.RESETPASSWORDLINK;
        const data = {
          Template: ResetPasswordTemplate,
          recipientEmail: user.email,
          TemplateData: {
            receiverName: receiverName,
            url: resetPasswordURL,
          },
        };
        const response = await this.emailService.sendEmail(data);
        console.log(response);
        if (response) {
          return SuccessMessages.EMAIL_SENT_SUCCESSFULLY;
        } else {
          throw new BadRequestException(ErrorMessages.EMAIL_SENDING_ERROR);
        }
      }
    } catch (e) {
      throw e;
    }
  }

  async validateResetPasswordToken(
    token: string,
  ): Promise<{ userId: string; isValid: boolean }> {
    const passwordToken = await this.passwordTokensRepository.findOne({
      where: { token },
    });

    console.log(passwordToken, 'passwordToken');

    if (!passwordToken) {
      throw new BadRequestException(ErrorMessages.INVALID_TOKEN);
    }

    // Check whether the token is expired
    const isExpired =
      getDurationBetweenDates(
        passwordToken.expiresIn.getTime(),
        new Date().getTime(),
      ) >= this.tokenLife;

    if (isExpired) {
      throw new BadRequestException(ErrorMessages.TOKEN_EXPIRED);
    }

    if (passwordToken.isConsumed) {
      throw new BadRequestException(ErrorMessages.TOKEN_ALREADY_USED);
    }

    return { userId: passwordToken.userId, isValid: true };
  }

  async resetPassword(
    resetPassword: ResetPasswordDTO,
    token?: string,
    req?: any,
  ) {
    let userId: string;
    let isValid: boolean;

    if (token) {
      const tokenData = await this.validateResetPasswordToken(token);
      userId = tokenData.userId;
      isValid = tokenData.isValid;
      if (!isValid) {
        throw new BadRequestException(ErrorMessages.INVALID_TOKEN);
      }
    } else {
      if (req) {
        userId = req;
        console.log(userId, 'userdiddddd');
      } else {
        throw new BadRequestException('User not authenticated');
      }
      isValid = true;
    }

    const user = await this.userRepository.findOne({ where: { _id: userId } });
    console.log(user, 'userrrrr');

    if (user) {
      const hashedPassword = await bcrypt.hash(resetPassword.password, 10);
      user.password = hashedPassword;
      user.enforcePasswordReset = 0;
      const response = await this.userRepository.save(user);

      if (response) {
        await this.passwordTokensRepository.update(
          { userId },
          { isConsumed: true },
        );
      }

      return SuccessMessages.PASSWORD_RESET_SUCCESS;
    } else {
      throw new BadRequestException(
        ErrorMessages.USER_DETAILS_NOT_FOUND_RECHECK_TOKEN,
      );
    }
  }

  // async bulkDelete(ids: string[]) {
  //   return this.userRepository.delete(ids);
  // }

}
