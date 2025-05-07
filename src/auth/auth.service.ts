import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from '@node-rs/bcrypt';
import { DataSource } from 'typeorm';
import { TenantUsersService } from 'src/tenant/modules/tenant-users/tenant-users.service';
import { ConfigService } from '@nestjs/config';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { UserSubscriber } from 'src/entity-subscribers/user.subscriber';
import { User } from 'src/users/entities/user.entity';
import { CreateDatabaseConnection, findTenant } from 'src/utils/db-utls';
import { ErrorMessages } from 'src/utils/messages';
import { SettingsService } from 'src/settings/settings.service';
import { AccountSettings } from 'src/settings/entities/setting.entity';

const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);

@Injectable()
export class AuthService {
  constructor(
    private tenantUserService: TenantUsersService,
    private jwtService: JwtService,
    private connection: DataSource,
    private configService: ConfigService,
    private readonly settingsService: SettingsService,
  ) {}

  async signIn(
    email: string,
    password: string,
    xTenantId: string = '',
  ): Promise<any> {
    const IDENTIFY_TENANT_FROM_PRIMARY_DB =
      this.configService.get('IDENTIFY_TENANT_FROM_PRIMARY_DB') === 'true';

    if (IDENTIFY_TENANT_FROM_PRIMARY_DB) {
      const tenantUser = await this.tenantUserService.findOneByEmail(email);
      if (tenantUser) {
        xTenantId = tenantUser.tenantIdentifier;
      } else {
        throw new BadRequestException(ErrorMessages.WRONG_CREDENTIALS);
      }
    }

    // const tenant: Tenant = await findTenant(this.connection, xTenantId);
    const tenant = TENANT_INFO;
    if (!tenant) {
      throw new BadRequestException(ErrorMessages.DATABASE_CONNECTION_ERROR);
    }
    const { dbHost, dbPort, dbUserName, dbPassword } = tenant;

    const options = {
      name: tenant.name,
      database: tenant.name,
      logging: true,
      host: dbHost,
      port: +dbPort,
      username: dbUserName,
      password: dbPassword,
      subscribers: [UserSubscriber],
    };

    const dataSource: DataSource = await CreateDatabaseConnection(options);
    const _userRepository = dataSource.getRepository(User);
    const _passwordRepository = dataSource.getRepository(AccountSettings);
    const result = await _passwordRepository.findOne({
      where: { AsKey: 'password' },
    });

    const user = await _userRepository.findOne({ where: { email } });
    await dataSource.destroy();

    if (!user) {
      throw new BadRequestException(ErrorMessages.WRONG_CREDENTIALS);
    }
    if (!(await bcrypt.compare(password, user?.password))) {
      throw new BadRequestException(ErrorMessages.WRONG_CREDENTIALS);
    }

    const payload = {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
    };

    if (
      (result.AsSetting.settings.resetPasswordAfterFirstLogin === true ||
        result.AsSetting.settings
          .enforcePasswordResetAfterPasswordResetedByAdmin === true) &&
      user.enforcePasswordReset === 1
    ) {
      return {
        resetPassword: true,
        message:
          'You must reset your password before accessing the application.',
        access_token: await this.jwtService.signAsync(payload),
        user: {
          uuid: user._id,
          role: 'user',
          data: {
            displayName: user.firstName + ' ' + user.lastName,
            email: user.email,
          },
        },
      };
    }

    return {
      resetPassword: false,
      access_token: await this.jwtService.signAsync(payload),
      tenant: xTenantId,
      user: {
        uuid: user._id,
        role: 'user',
        data: {
          displayName: user.firstName + ' ' + user.lastName,
          email: user.email,
        },
      },
    };
  }
}
