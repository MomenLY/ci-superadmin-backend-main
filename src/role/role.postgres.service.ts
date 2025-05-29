import { Inject, Injectable } from "@nestjs/common";
import { RoleDto } from "./dto/create-role.dto";
import { TENANT_CONNECTION } from "src/tenant/tenant.module";
import { In } from "typeorm";

@Injectable()
export class RolePostgresService {
  constructor(
    @Inject(TENANT_CONNECTION) private connection,
  ) { }
  async searchRoles(roleRepository, keyword, type, sortBy, orderBy, limit, page) {
    const queryBuilder = roleRepository
      .createQueryBuilder('Role')
      .where('1 = 1') // Start with a tautology
      .skip((page - 1) * limit)
      .take(limit);

    if (keyword && keyword.trim()) {
      queryBuilder.andWhere('Role.name ILIKE :keyword', {
        keyword: `%${keyword}%`,
      })
    }
    if (type && type.trim()) {
      queryBuilder.andWhere('CAST(Role.roleType AS TEXT) ILIKE :type', {
        type: `%${type}%`,
      })
    }

    if (sortBy) {
      const order = orderBy ? orderBy.toUpperCase() : 'ASC';
      if (order === 'ASC' || order === 'DESC') {
        queryBuilder.orderBy(`Role.${sortBy}`, order);
      }
    }

    const [items, totalItems] = await queryBuilder.getManyAndCount();

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


  async usersByRolePostgres(roleRepository, keyword: any, type: any, sortBy: any, orderBy: any, limit: any, page: any) {
    try {
      let query = `
      SELECT
          r."_id" AS "roleId",
          r."roleType"::text AS "roleType",
          r."name" AS "roleName",
          COUNT(u."_id") AS "totalUsers",
          array_agg(json_build_object(
              '_id', u."_id",
              'firstName', u."firstName"
          )) AS "users"
      FROM
          "public"."role" r
      LEFT JOIN
          "public"."user" u
      ON
          r."_id" = u."roleIds"::uuid
    `;

      const conditions = [];

      if (keyword && keyword.trim()) {
        conditions.push(`
        (
          r."name" ILIKE '%${keyword}%' OR
          u."firstName" ILIKE '%${keyword}%' OR
          r."roleType"::text ILIKE '%${keyword}%'
        )
      `);
      }

      if (type && type.trim()) {
        conditions.push(`
        r."roleType"::text ILIKE '%${type}%'
      `);
      }

      conditions.push(`
      r."name" != 'SuperAdmin'
    `);

      if (conditions.length > 0) {
        query += `
        WHERE ${conditions.join(' AND ')}
      `;
      } else {
        query += `
        WHERE 1=1
      `;
      }

      query += `
      GROUP BY
          r."_id", r."roleType", r."name"
    `;

      // Subquery to get the total count with search conditions
      const countQuery = `
      SELECT COUNT(*) AS "totalItems"
      FROM (
        ${query.replace(/\s+ORDER\s+BY\s+[^;]+;?/i, '')}
      ) AS "subquery"
    `;

      if (sortBy) {
        const order = orderBy ? orderBy.toUpperCase() : 'ASC';
        if (order === 'ASC' || order === 'DESC') {
          query += `
          ORDER BY
              r."${sortBy}" ${order}
        `;
        }
      }

      if (limit && page) {
        const offset = (page - 1) * limit;
        query += `
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      }

      const [items, totalItems] = await Promise.all([
        this.connection.query(query),
        this.connection.query(countQuery),
      ]);


      return {
        items,
        meta: {
          itemCount: items.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalItems[0].totalItems / limit),
          currentPage: page,
          totalItems: totalItems[0].totalItems,
        },
      };
    } catch (error) {
      console.error('Error executing query', error);
      throw error;
    }
  }

  findByIds(roleRepository, ids) {
    return roleRepository.find({
      where: { _id: In(ids) },
    });
  }

  findOneById(roleRepository, _id) {
    return roleRepository.findOne({
      where: { _id },
    });
  }

  deleteMany(roleRepository, roleIds) {
    return roleRepository.delete({
      _id: In(roleIds),
    }).then(result => result.affected)
  }
}