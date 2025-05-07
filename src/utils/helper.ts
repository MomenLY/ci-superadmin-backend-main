import { ObjectIdColumn, PrimaryGeneratedColumn } from 'typeorm';
import { PostgresModule } from 'src/databases/postgres.module';
import { MongoModule } from 'src/databases/mongo.module';
import { ValidationArguments, ValidationOptions, isUUID, registerDecorator } from 'class-validator';
import { ObjectId } from 'mongodb';
import { BadRequestException } from '@nestjs/common';

const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);

export const determineDB = () => {
  return process.env.DB_TYPE || 'mongo';
};

export const isMongoDB = (() => determineDB() === 'mongo')();

console.log(`isMongoDB: ${isMongoDB}`)

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
  return function(object: any, propertyName: string) {
    registerDecorator({
      name: 'validateObject',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const oKeys = Object.keys(value).filter(o => o && o.trim());
          const oValues = Object.values(value).filter((o: any) => o && o.trim());
          if(oKeys.length !== oValues.length) {
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
      options: {...validationOptions, message: isMongoDB ? `${propertyName} must be an ObjectId` : `${propertyName} must be a UUID`},
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
  if(dataKeys.length !== dataValues.length) {
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
        __dirname+"/../**/*.entity{.ts,.js}"
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
        __dirname+"/../**/*.entity{.ts,.js}"
      ],
      migrations: [],
      logging: true,
      autoLoadEntities: true,
      synchronize: true,
    })
  }
}