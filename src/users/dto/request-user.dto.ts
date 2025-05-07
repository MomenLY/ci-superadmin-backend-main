import { IsEnum, IsNotEmpty, IsNotEmptyObject, IsObject, IsString } from "class-validator";
import { RoleType } from "src/role/entities/role.entity";
import { IsObjectIdOrUUID } from "src/utils/helper";

export class RequestUser {
  constructor(obj){
    Object.assign(this, obj)
  }
  
  @IsObjectIdOrUUID()
  _id: string;

  @IsObject()
  acl: object;

  @IsNotEmpty()
  @IsString()
  @IsEnum(RoleType)
  role: string;
}

export class UserId {
  constructor(id){
    this.id = id;
  }
  
  @IsNotEmpty()
  @IsObjectIdOrUUID()
  id: string;
}