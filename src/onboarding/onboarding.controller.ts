import { Controller, Post, Body, Req, BadRequestException } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { v4 as uuidv4 } from 'uuid';
import { TenantUser } from 'src/tenant/modules/tenant-users/entities/tenant-user.entity';
import { TenantUsersService } from 'src/tenant/modules/tenant-users/tenant-users.service';
import { User } from 'src/users/entities/user.entity';
import { Public } from 'src/auth/auth.decorator';
import { ConfigService } from '@nestjs/config';
import { RoleService } from 'src/role/role.service';
import { UsersHelper } from 'src/usersHelper/users.helper';
import { EmailLibrary } from 'src/utils/emailLibrary';
import { templateCode } from 'src/utils/config';
import { SettingsService } from 'src/settings/settings.service';
import { ErrorMessages, SuccessMessages } from 'src/utils/messages';
import { delCache, getCache } from 'onioncache';
import { TenantService } from 'src/tenant/tenant.service';
import { subject } from '@casl/ability';
import { englishToItalianConversion } from 'src/utils/languages';

const tenantInfo = JSON.parse(process.env.TENANT_INFO);

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService, private readonly jwtService: JwtService, private readonly httpService: HttpService, private tenantUserService: TenantUsersService, private configService: ConfigService, private roleService: RoleService, private readonly usersHelper: UsersHelper, private emailService: EmailLibrary, private readonly settingsService: SettingsService, private tenantService: TenantService) { }

  @Post('add')
  async create(@Req() req, @Body() tenant: any) {
    const createResponse = (status: string, message: string, tenatDb = null, user = null, emailResponse = null) => {
      return {
        status,
        message,
        tenatDb,
        user,
        emailResponse,
      };
    };
    try {
      if (!tenant.firstName) {
        throw new BadRequestException(ErrorMessages.FIRST_NAME_REQUIRED);
      } else if (!tenant.lastName) {
        throw new BadRequestException(ErrorMessages.LAST_NAME_REQUIRED);
      } else if (!tenant.email) {
        throw new BadRequestException(ErrorMessages.EMAIL_REQUIRED);
      } else {
        const tenantUserExists = await this.onboardingService.findTenantUser(tenant.email)
        if (tenantUserExists) {
          throw new BadRequestException(ErrorMessages.EMAIL_ALREADY_TAKEN.replace(
            '{emailIds}',
            tenant.email,
          ),)
        } else {
          const names = await this.onboardingService.generateName();

          const payloadData = {
            "payloads": [
              {
                "username": names.username,
                "password": names.password,
                "dbname": names.dbName,
                "tenantName": tenant.tenantName,
                "email": tenant.email.toLowerCase(),
                "phone": tenant.phone
              }
            ]
          };

          const role = await this.roleService.findOne(process.env.ADMIN_ROLEID);

          if (role.roleType === 'admin') {

            const tenantResponse = await this.onboardingService.create(payloadData);
            const tenantId = tenantResponse._id;
            if (tenantResponse !== null || undefined) {

              const serviceToken = await this.jwtService.signAsync(payloadData, {
                secret: process.env.TENANT_CREATE_JWT_SECRET
              });;

              const serviceHeaders = {
                'Authorization': `Bearer ${serviceToken}`,
                'Content-Type': 'application/json'
              };

              const response = await axios.post(
                process.env.TENANT_DB_EDIT_CLONE_URL, payloadData,
                { headers: serviceHeaders }
              );

              if (response.data[0].status === 'success') {

                const accountId = tenantResponse._id;
                const emailPayload = {
                  "SAccountId": accountId,
                  "SFromEmailId": tenant?.email.toLowerCase(),
                  "SProviderId": tenantInfo._id
                }
                const emailResponse = await axios.post(`${process.env.EMAIL_SERVICE_URL}/subscriber`, emailPayload);
                if (emailResponse !== null || !emailResponse) {
                  const emailData = emailResponse.data.data;
                  if (emailData) {
                    const tenant_emailService_authCode = emailData.SAuthCode;
                    const tenant_verifyEmail_headers = {
                      'Auth-Code': tenant_emailService_authCode
                    }
                    const verifyEmail = await axios.post(`${process.env.EMAIL_SERVICE_URL}/subscriber/verifyEmail`, {}, { headers: tenant_verifyEmail_headers });
                  }

                  const emailSubscription = {
                    SAccountId: emailData.SAccountId,
                    SProviderId: emailData.SProviderId,
                    SAuthCode: emailData.SAuthCode,
                  }

                  const tenantUpdateResponse = await this.onboardingService.tenantUpdate(tenantResponse._id, emailSubscription);
                  const user_payload = {
                    firstName: tenant.firstName,
                    lastName: tenant.lastName,
                    email: tenant.email.toLowerCase(),
                    password: process.env.TENANT_DEFAULT_PASSWORD,
                    tenantIdentifier: tenantResponse.name,
                    phoneNumber: tenant.phone,
                    roleIds: [process.env.TENANT_ADMIN_ROLE_ID],
                    favoriteUsers: [],
                    userImage: 'default.webp'
                  }

                  const crossTokenData = {
                    createdAt: uuidv4().slice(0, 5)
                  };

                  const crossToken = await this.jwtService.sign(crossTokenData, {
                    secret: this.configService.get('JWT_SECRET'),
                    expiresIn: '1h',
                  });

                  const user_headers = {
                    'x-tenant-id': tenantResponse.identifier,
                    'cross-token': crossToken,
                    'role': role.roleType,
                  };
                  const userResponse = await axios.post(
                    `${process.env.BACKEND_URL}/users/tenant/add`, user_payload,
                    { headers: user_headers }
                  );
                  if (userResponse?.data?.data.created.length === 0 || !userResponse || userResponse === null || userResponse === undefined) {
                    await this.tenantService.deleteTenant(tenantId, req);
                    throw new Error(ErrorMessages.ERROR_ADDING_USER_TENANT_DB)
                  } else {
                    const createdUser = userResponse?.data?.data?.created[0];
                    const tenant_cache = await getCache('tenant_list');
                    if (tenant_cache) {
                      delCache('tenant_list');
                    }
                    //  Email subscription
                    let tenantEmailResponse;
                    if (tenantUpdateResponse) {
                      const tenantSettings = await this.settingsService.findOneSettings('basic');
                      const tenantLogo = tenantSettings?.settings?.logo;
                      const companyName = tenantSettings.settings.companyName;
                      const tenantEmailPayload = {
                        templateCode: templateCode.TENANT_REG_TEMPLATE,
                        to: [{ email: tenant.email, name: tenant.firstName + " " + tenant.lastName }],
                        data: {
                          userName: tenant.firstName + " " + tenant.lastName,
                          email: tenant.email.toLowerCase(),
                          password: process.env.TENANT_DEFAULT_PASSWORD,
                          subject: `${englishToItalianConversion('welcomeTenantMessage', companyName)}`,
                          logo: process.env.DEFAULT_DB_LOGO_PATH,
                          success_gif: process.env.SUCCESS_IMAGE,
                          ciLink: process.env.CLIENT_SIDE_URL
                        },
                        multiThread: false,
                      }
                      tenantEmailResponse = await this.emailService.sendEmail(tenantEmailPayload);
                      if (!tenantEmailResponse) {
                        throw new Error(ErrorMessages.ERROR_SENDING_REG_EMAIL);
                      } else {
                        return {
                          status: "Success",
                          message: SuccessMessages.EMAIL_SENT_SUCCESSFULLY,
                          tenatDb: tenantUpdateResponse,
                          user: createdUser,
                          emailResponse: tenantEmailResponse
                        }
                      }
                    } else {
                      throw new Error(ErrorMessages.ERROR_ADDING_EMAIL_SUBSCRIPTION_DETAILS);
                    }
                  }
                } else {
                  await this.tenantService.deleteTenant(tenantId, req);
                  throw new Error(ErrorMessages.ERROR_CREATING_EMAIL_SUBSCRIPTION);
                }

              } else {
                await this.tenantService.deleteTenant(tenantId, req);
                throw new BadRequestException(ErrorMessages.ERROR_CREATING_DB);
              }
            } else {
              throw new BadRequestException(ErrorMessages.ERROR_CREATING_TENANT_ACCOUNT);
            }
          } else {
            throw new BadRequestException(ErrorMessages.NOT_AUTHORIZED_CREATE_TENANT);
          }
        }
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException({
        status: "Error",
        message: error.message,
      });
    }
  }

}

