import { Controller, Post, Body, Query, Res, Request } from '@nestjs/common';
import { ExcelService } from './excel.service';
import { Response } from 'express';
import { ExcelData } from './excel-data.interface';
import { SearchTenantDto } from 'src/tenant/dto/search-tenant.dto';
import axios from 'axios';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { TenantService } from 'src/tenant/tenant.service';
import { SingleTenantDto } from 'src/tenant/dto/single-tenant.dto';


@Controller('excel')
export class ExcelController {
  constructor(
    private readonly excelService: ExcelService,
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  @Post('tenant')
  async generateExcel(
    @Query() searchTenantDto: SearchTenantDto,
    @Body() { keyword }: { keyword: string[] },
    @Request() req,
    @Res() res: Response,
  ) {
    let expoLists;

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
    const tenants = await this.tenantService.findAll(searchTenantDto, req, expoLists);
    let formatTenantData = [];
    if (!tenants?.allTenant) {
      throw new Error("No tenants found!");
    }
    else {
      formatTenantData = await this.formatTenantData(tenants?.allTenant)
    }

    const tableHeaders = ["Tenant ID", "Tenant Name", "Tenant Email", "Total Expo", "Completed Expo", "Ongoing Expo", "Upcoming Expo"];
    const excelData: ExcelData = {
      headers: tableHeaders,
      data: formatTenantData,
    };

    // Generate Excel file
    const excelBuffer = await this.excelService.createExcelFile(excelData);

    // Send Excel file as response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=expo_participants.xlsx');
    res.send(excelBuffer);
  }

  private formatTenantData(tenantList) {
    const tableHeaders = ["Tenant ID", "Tenant Name", "Tenant Email", "Total Expo", "Completed Expo", "Ongoing Expo"];

    return tenantList.map(tenant => [
      tenant.identifier || '',
      tenant.tenantName || '',
      tenant.email || '',
      tenant.expoCounts?.past + tenant.expoCounts?.ongoing + tenant.expoCounts?.future || '0',
      tenant.expoCounts?.past || '0',
      tenant.expoCounts?.ongoing || '0',
      tenant.expoCounts?.future || '0'
    ]);
  };

  //for single tenant report
  @Post('single-tenant')
  async singleTenantGenerateExcel(
    @Query() singleTenantDto: SingleTenantDto,
    @Request() req,
    @Res() res: Response,
  ) {
    let expoLists;
    try {
      const crossTokenData = {
        createdAt: uuidv4().slice(0, 5)
      };

      const crossToken = await this.jwtService.sign(crossTokenData, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '1h',
      });
      const user_headers = {
        'x-tenant-id': singleTenantDto.identifier,//process.env.DEFAULT_TENANT_ID,
        'cross-token': crossToken
      };

      expoLists = await axios.post(
        `${process.env.BACKEND_URL}/expo/get-expos`,
        { isReport: "true", keyword: singleTenantDto.keyword, identifier: singleTenantDto.identifier },
        { headers: user_headers }
      );
    } catch (error) {
      console.log("Axios error", error);
    }
    let formatTenantData = [];
    if (!expoLists?.data.data.combinedList) {
      throw new Error("No expo found!");
    }
    else {
      formatTenantData = await this.sinleTenantFormatTenantData(expoLists?.data?.data?.combinedList)
    }

    const tableHeaders = ["Expo Code", "Expo Name", "Start Date", "End Date", "Price", "Expo Type", "Registrations", "Expo Mode", "Created By"];
    const excelData: ExcelData = {
      headers: tableHeaders,
      data: formatTenantData,
    };

    // Generate Excel file
    const excelBuffer = await this.excelService.createExcelFile(excelData);

    // Send Excel file as response
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=expo_participants.xlsx');
    res.send(excelBuffer);
  }

  private sinleTenantFormatTenantData(expoList) {
    const tableHeaders = ["Expo Code", "Expo Name", "Start Date", "End Date", "Price", "Expo Type", "Registrations", "Expo Mode", "Created By"];

    return expoList.map(expo => [
      expo.expCode,
      expo.expName,
      expo.expStartDate,
      expo.expEndDate,
      expo.expPrice,
      expo.expType,
      expo.userCount,
      expo.expExpoMode,
      expo.expCreator,
    ]);
  };

}
