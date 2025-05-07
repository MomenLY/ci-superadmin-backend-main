import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { User } from '../entities/user.entity';
import { IsObjectIdOrUUID } from 'src/utils/helper';
import { Transform } from 'class-transformer';
export class CreateUserDto {
  constructor(obj) {
    Object.assign(this, obj);
  }

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsArray()
  @IsNotEmpty({ each: true })
  roleIds: string[];

  @IsOptional()
  @IsDate()
  @Transform(({ value }) => (value ? new Date(value) : null))
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  countryCode?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UserDto {
  _id: string;
  @IsString()
  @IsNotEmpty()
  firstName: string;
  @IsString()
  @IsNotEmpty()
  lastName: string;
  @IsString()
  @IsNotEmpty()
  email: string;
  @IsArray()
  @IsNotEmpty()
  roleIds: string[];

  constructor(user?: Partial<User>) {
    if (user) {
      this._id = user._id;
      this.firstName = user.firstName;
      this.lastName = user.lastName;
      this.email = user.email;
      this.roleIds = user.roleIds;
    }
  }
}

export class CreateBulkDto {
  @IsArray()
  @IsNotEmpty()
  @ArrayMaxSize(50)
  users: CreateUserDto[];
}

export interface BulkUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  roleIds: [];
}

export class SearchUserDTO {
  @IsString()
  firstName?: string;
  @IsString()
  lastName?: string;
  @IsString()
  email?: string;
}

export class ForgotPasswordDTO {
  @IsString()
  email: string;
}

export class ResetPasswordDTO {
  @IsString()
  password: string;
}

export class AdminResetPasswordDTO {
  @IsOptional()
  @IsBoolean()
  resetPassword?: boolean;
}

export class DeleteUsersDTO {
  @IsArray()
  @IsNotEmpty({ each: true })
  @ArrayMaxSize(50)
  @IsObjectIdOrUUID({ each: true })
  ids: string[];
}
