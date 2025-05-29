import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { Tenant } from 'src/tenant/entities/tenant.entity';
import { DataSource, MongoRepository, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import superAdminDataSource from './superAdminDatasource';
import { TenantUser } from 'src/tenant/modules/tenant-users/entities/tenant-user.entity';

@Injectable()
export class OnboardingService {
  constructor(private readonly mainDataSource: DataSource) { }


  async create(data: any) {
    const tenantRepository = this.mainDataSource.getRepository(Tenant);

    const tenant = new Tenant();
    tenant.host = process.env.TENANT_HOST;;
    tenant.name = data.payloads[0]?.dbname;
    tenant.dbHost = process.env.TENANT_DB_HOST;
    tenant.dbPort = '5432';
    tenant.dbUserName = data.payloads[0]?.username;
    tenant.dbPassword = data.payloads[0]?.password;
    tenant.identifier = await this.getUniqueTenantIdentifier();
    tenant.featuresRestrictions = await this.getFeatures();
    tenant.tenantName = data.payloads[0]?.tenantName;
    tenant.email = data.payloads[0]?.email;
    tenant.phone = data.payloads[0]?.phone;

    // List of required fields
    const requiredFields = {
      host: tenant.host,
      name: tenant.name,
      dbHost: tenant.dbHost,
      dbPort: tenant.dbPort,
      dbUserName: tenant.dbUserName,
      dbPassword: tenant.dbPassword,
      featuresRestrictions: tenant.featuresRestrictions,
      tenantName: tenant.tenantName,
      email: tenant.email,
      phone: tenant.phone
    };

    // Check for any missing fields
    const missingFields = Object.entries(requiredFields)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      throw new BadRequestException(`Missing required fields: ${missingFields.join(', ')}`);
    }

    try {
      // Insert the tenant into the database
      const result = await tenantRepository.save(tenant);
      return result;
    } catch (error) {
      throw new BadRequestException(`Error saving tenant: ${error.message}`);
    }
  }

  async getUniqueTenantIdentifier() {
    const tenantRepository = await this.mainDataSource.getRepository(Tenant);

    function generateCode(length: number = 7): string {
      return Math.random().toString(36).substring(2, 2 + length).toUpperCase()
    }

    let identifier: string;
    let exists = true;

    while (exists) {
      identifier = generateCode(7);

      const existingTenant = await tenantRepository.findOne({
        where: { identifier: identifier },
      });

      exists = !!existingTenant;
    }

    return identifier;
  }


  async getFeatures() {
    return [
      {
        label: "User Management",
        featureKey: "user_management",
        featureLimits: {
          permission: true,
        },
      },
      {
        label: "Report Viewing",
        featureKey: "report_viewing",
        featureLimits: {
          permission: false,
        },
      },
      {
        label: "Group Management",
        featureKey: "group_management",
        featureLimits: {
          permission: true,
        },
      },
    ]
  }

  async findTenantUser(email: string) {
    const tenantUserRepository = this.mainDataSource.getRepository(TenantUser);

    try {
      const tenantUser = await tenantUserRepository.findOne({ where: { email: email.toLowerCase() } });
      return tenantUser;
    } catch (e) {

    }
  }

  async tenantUpdate(id: string, data: any) {
    const tenantRepository = this.mainDataSource.getRepository(Tenant);

    const tenant = await tenantRepository.findOne({ where: { _id: id } });;
    tenant.emailSubscription = data;
    try {
      const result = await tenantRepository.save(tenant);
      return result;
    } catch (error) {
      console.error("Error inserting tenant:", error);
      throw error;
    }
  }

  async generateName() {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    const dbName = (`db_${(await this.getUuid(10)).replace(/-/g, '')}_${timestamp}_${(await this.getUuid(4)).replace(/-/g, '')}`).toLowerCase();

    let username = `pro${(await this.getUuid(10))}${timestamp}${(await this.getUuid(4))}`;

    username = (username.replace(/[^a-zA-Z0-9]/g, '')).toLowerCase();


    const password = this.generatePassword(12);

    return { dbName, username, password };
  }

  async getUuid(count: number) {
    return uuidv4().replace(/-/g, '').slice(0, count);
  }

  generatePassword(length: number) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      password += chars[randomIndex];
    }
    return password;
  }
}
