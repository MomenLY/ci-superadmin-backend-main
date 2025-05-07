import { Injectable } from "@nestjs/common";
import { RoleDto } from "./dto/create-role.dto";
import { ObjectId } from "mongodb";

@Injectable()
export class RoleMongoService {
  async searchRoles(roleRepository, keyword, type, sortBy, orderBy, limit, page) {
    const query: any = {};
    if (keyword && keyword.trim()) {
      query.name = { $regex: new RegExp(keyword, 'i') }
    }
    if (type && type.trim()) {
      query.roleType = { $regex: new RegExp(type, 'i') }
    }
    const totalItems = await roleRepository.countDocuments(query);
    const sortOptions = {};

    if (sortBy) {
      sortOptions[sortBy] = orderBy.toUpperCase();
    }
    const items = await roleRepository.find({
      skip: (page - 1) * limit,
      take: limit,
      where: query,
      order: sortOptions,
    });

    const roles = items.map((role) => new RoleDto(role));

    return {
      items: roles,
      meta: {
        totalItems,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(totalItems / limit),
        currentPage: page,
      },
    };
  }

  async usersByRoleMongo(roleRepository: any, keyword: any, type: any, sortBy:any, orderBy: any, limit:any, page:any) {
    try {
      const pipeline = [
        {
          $match: {
            $or: [
              { roleIds: { $exists: true, $not: { $size: 0 } } },
              { roleIds: { $exists: true, $size: 0 } },
            ],
          },
        },
        {
          $lookup: {
            from: "role",
            localField: "roleIds",
            foreignField: "_id",
            as: "roles",
          },
        },
        {
          $lookup: {
            from: "role",
            localField: "roleIds",
            foreignField: "_id",
            as: "roles"
          }
        },
        {
          $unwind: "$roles"
        },
        {
          $group: {
            _id: {
              roleId: "$roleIds",
              roleType: "$roles.roleType",
              roleName: "$roles.name"
            },
            totalUsers: { $sum: 1 },
            userIds: { $push: "$_id" }
          }
        },
        {
          $lookup: {
            from: "user",
            localField: "userIds",
            foreignField: "_id",
            as: "userDetails"
          }
        },
        {
          $project: {
            _id: 0,
            roleIds: "$_id.roleId",
            totalUsers: 1,
            userIds: 1,
            roleType: "$_id.roleType",
            roleName: "$_id.roleName",
            userNames: "$userDetails.firstName"
          }
        }
      ];
      
      const mongoResult = await roleRepository.aggregate(pipeline).toArray();
      console.log('Result from users for role management (Mongo)', mongoResult);
      
      return mongoResult;
      
    } catch (error) {
      console.error('Error executing query', error);
      throw error;
    }
  }
  
  

  findByIds(roleRepository:any, ids:string[]) {
    return roleRepository.find({
      where: { _id: { $in: ids.map((i) => new ObjectId(i)) } },
    });
  }

  findOneById(roleRepository, _id) {
    return roleRepository.findOne({
      where: { _id: new ObjectId(_id) },
    });
  }

  deleteMany(roleRepository:any, roleIds:string[]) {
    return roleRepository.deleteMany({
      _id: { $in: roleIds.map(id => new ObjectId(id)) },
    }).then(result => result.deletedCount)
  }
}