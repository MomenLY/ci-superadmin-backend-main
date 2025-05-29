import { ObjectIdColumn, PrimaryGeneratedColumn } from 'typeorm';
import { PostgresModule } from 'src/databases/postgres.module';
import { MongoModule } from 'src/databases/mongo.module';
import { ValidationArguments, ValidationOptions, isUUID, registerDecorator } from 'class-validator';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';


const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);

export const determineDB = () => {
  return process.env.DB_TYPE || 'mongo';
};

export const isMongoDB = (() => determineDB() === 'mongo')();

export const getIdColumnDecorator = () => {
  if (process.env.DB_TYPE === 'postgres') {
    return PrimaryGeneratedColumn('uuid');
  } else {
    return ObjectIdColumn();
  }
};

export const determineDatabaseModule = () => {
  return process.env.DB_TYPE === 'postgres' ? PostgresModule : MongoModule;
};

export function validateMasterDataCollectionObject(o) {
  return Object.values(o).every(item => {
    if (item instanceof Object) {
      return validateMasterDataCollectionObject(item);
    }
    if (typeof item === 'string') {
      return item && item.trim()
    }
    if (typeof item === 'number') {
      return !Number.isNaN(item)
    }
    return true;
  })
}

export function getDurationBetweenDates(startMilliseconds, endMilliseconds) {
  const durationMilliseconds = endMilliseconds - startMilliseconds;
  const durationHours = durationMilliseconds / (1000 * 60 * 60);
  return Math.round(durationHours * 100) / 100;
}

export function ValidateObject(validationOptions?: ValidationOptions) {
  return function (object: any, propertyName: string) {
    registerDecorator({
      name: 'validateObject',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const oKeys = Object.keys(value).filter(o => o && o.trim());
          const oValues = Object.values(value).filter((o: any) => o && o.trim());
          if (oKeys.length !== oValues.length) {
            return false;
          }
          return true;
        },
      },
    });
  };
}

export function splitArray(arr, size) {
  let chunks = [];
  for (let i = 0; i < Math.ceil(arr.length / size); i++) {
    chunks.push(arr.slice(i * size, i * size + size));
  }
  return chunks;
}

export function IsObjectIdOrUUID(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: "isObjectIdOrUUID",
      target: object.constructor,
      propertyName: propertyName,
      constraints: [],
      options: { ...validationOptions, message: isMongoDB ? `${propertyName} must be an ObjectId` : `${propertyName} must be a UUID` },
      validator: {
        validate(value: any, args: ValidationArguments) {
          return isMongoDB ? ObjectId.isValid(value) : isUUID(value);
        }
      }
    });
  };
}

export function isObjectIdOrUUID(value: any) {
  return isMongoDB ? ObjectId.isValid(value) : isUUID(value);
}

export const validateLanguageData = (langData: any) => {
  const dataValues = Object.values(langData).filter((data: string) => data && data.trim());
  const dataKeys = Object.keys(langData).filter((data: string) => data && data.trim());
  if (dataKeys.length !== dataValues.length) {
    throw new BadRequestException('Language definitions cannot be empty.')
  }
}

export const determineDatabase = () => {
  const { host, name, dbHost, dbPort, dbUserName, dbPassword } = TENANT_INFO;
  if (process.env.DB_TYPE === 'postgres') {
    return ({
      type: 'postgres',
      host: dbHost,
      port: dbPort,
      username: dbUserName,
      password: dbPassword,
      database: name,
      entities: [
        __dirname + "/../**/*.entity{.ts,.js}"
      ],
      migrations: [],
      autoLoadEntities: true
    })
  } else {
    return ({
      type: 'mongodb',
      url: process.env.MONGODB_CONNECTION_STRING,
      database: name,
      entities: [
        __dirname + "/../**/*.entity{.ts,.js}"
      ],
      migrations: [],
      logging: true,
      autoLoadEntities: true,
      synchronize: true,
    })
  }
}

interface ExcelData {
  headers: string[];
  data: any[][];
}
export async function generateExcel(excelData: ExcelData): Promise<Buffer> {
  const { headers, data = [] } = excelData;
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);

  const headerStyle = {
    font: {
      bold: true,
      color: { rgb: "FFFFFF" },
      sz: 14// White text color
    },
    fill: {
      patternType: "solid",
      fgColor: { rgb: "0000FF" } // Blue background color
    },
    alignment: {
      horizontal: "center",
      vertical: "center"
    },
    border: {
      top: { style: "medium", color: { rgb: "000000" } },
      right: { style: "medium", color: { rgb: "000000" } },
      bottom: { style: "medium", color: { rgb: "000000" } },
      left: { style: "medium", color: { rgb: "000000" } }
    }
  };

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + "1";
    if (!worksheet[address]) continue;
    worksheet[address].s = headerStyle;
  }

  const columnWidths = calculateColumnWidths([headers, ...data]);
  worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));

  worksheet['!rows'] = [{ hpt: 25, }];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

  const excelBuffer = XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
  });

  return excelBuffer;
}

function calculateColumnWidths(data: any[][]): number[] {
  const columnWidths: number[] = [];

  for (let colIndex = 0; colIndex < data[0].length; colIndex++) {
    let maxWidth = 10;

    for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
      const cellValue = data[rowIndex][colIndex];
      const cellWidth = cellValue ? cellValue.toString().length : 0;
      maxWidth = Math.max(maxWidth, cellWidth);
    }

    columnWidths.push(Math.min(maxWidth + 2, 50));
  }

  return columnWidths;
}