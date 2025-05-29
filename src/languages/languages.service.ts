import { Injectable } from '@nestjs/common';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Language } from './entities/language.entity';
import { DataSource, In, MongoRepository, Repository } from 'typeorm';
import { putObject } from 'src/utils/s3Helper';
import { invokeFunction } from 'src/utils/lambdaHelper';
import { FindLanguageDto } from './dto/find-language.dto';
import { determineDatabase } from 'src/utils/helper';
import { getCache } from 'onioncache';
import { GlobalService } from 'src/utils/global.service';

const AWS_HELPER_FN = process.env.AWS_HELPER_FN;
const NODE_ENV = process.env.NODE_ENV;

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language) private langRepository: Repository<Language>,
    @InjectRepository(Language) private mongoLangRepository: MongoRepository<Language>,
    private dataSource: DataSource, private readonly globalService: GlobalService,

  ) { }

  async uploadToS3(language: string, module: string) {
    if (NODE_ENV === 'production') {
      const invokeRes = await invokeFunction({
        action: 'lang_upload_s3',
        dbConfig: determineDatabase(),
        langParams: { language, module, accountId: "0" }
      }, AWS_HELPER_FN);
    } else {
      const langData = await this.langRepository.find({ where: { LLanguage: language, LModule: module, LAccountId: "0" } });
      const dataToUpload = {};
      for (const lang of langData) {
        dataToUpload[lang.LKey] = lang.LDefinition;
      }
      return putObject(`locales/${module}/${language}.json`, JSON.stringify(dataToUpload), 'application/json');
    }
    return true;
  }

  async create(createLanguageDto: CreateLanguageDto) {
    const { data, language, module } = createLanguageDto;
    let langData = [];
    const keys = Object.keys(data);
    for (const key of keys) {
      langData.push({
        LKey: key,
        LDefinition: data[key],
        LLanguage: language,
        LModule: module,
        LAccountId: "0",
        LCreatedAt: new Date()
      })
    }
    let existingData = [];
    if (this.langRepository instanceof MongoRepository) {
      existingData = await this.langRepository.find({
        where: { LKey: { $in: keys }, LLanguage: language, LAccountId: "0" },
      });
    } else {
      existingData = await this.langRepository.find({
        where: { LKey: In(keys), LLanguage: language, LAccountId: "0" },
      });
    }
    let existingKeys = [];
    let createdCount = langData.length;
    if (existingData.length > 0) {
      existingKeys = existingData.map(d => d.LKey);
      createdCount = langData.length - existingKeys.length;
      langData = langData.filter(lang => existingKeys.indexOf(lang.LKey) === -1);
    }
    if (langData.length > 0) {
      const queryResult = await this.langRepository.insert(langData);
      await this.uploadToS3(language, module);
    }
    return ({ insertCount: createdCount, existingKeys: existingKeys });
  }

  async findByKeys(findLanguageDto: FindLanguageDto) {
    const { keys, language } = findLanguageDto;
    if (this.langRepository instanceof MongoRepository) {
      return this.langRepository.find({ where: { LKey: { $in: keys }, LLanguage: language, LAccountId: "0" } })
    } else {
      return this.langRepository.find({ where: { LKey: In(keys), LLanguage: language, LAccountId: "0" } })
    }
  }

  findByLanguage(lang: string) {
    const getLangCb = () =>
      this.langRepository
        .find({
          where: { LLanguage: lang, LAccountId: this.globalService.accountId },
        })
        .then((res) => {
          const keyVal = {};
          for (const d of res) {
            keyVal[d.LKey] = d.LDefinition;
          }
          return keyVal;
        });
    return getCache(`lang_${lang}`, getLangCb);
  }

  async findAll(lang: string, page: number, limit: number, search: string | undefined) {
    if (this.langRepository instanceof MongoRepository) {
      const query: any = {
        LLanguage: lang,
        LAccountId: "0"
      };
      if (search) {
        query.LDefinition = { $regex: search, $options: 'i' };
      }
      const totalItems = await this.langRepository.countDocuments(query);
      const items = await this.langRepository.find({
        skip: (page - 1) * limit,
        limit: limit,
        where: query,
        order: {
          LCreatedAt: "DESC",
        }
      });

      return {
        items,
        meta: {
          totalItems,
          itemCount: items.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
        },
      };
    } else {
      const queryBuilder = this.langRepository.createQueryBuilder('Lang');
      queryBuilder.where('Lang.LLanguage = :language', { language: lang })
      queryBuilder.andWhere('Lang.LAccountId = :accountId', { accountId: "0" })
      if (search) {
        queryBuilder.andWhere(
          'Lang.LDefinition ILIKE :searchTerm',
          { searchTerm: `%${search}%` },
        )
      }
      queryBuilder.orderBy("Lang.LCreatedAt", "DESC")
      queryBuilder.skip((page - 1) * limit)
        .limit(limit);

      const [items, totalItems] = await queryBuilder.getManyAndCount();

      return {
        items,
        meta: {
          totalItems,
          itemCount: items.length,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalItems / limit),
          currentPage: page,
        },
      };
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} language`;
  }

  async update(updateLanguageDto: UpdateLanguageDto) {
    const { data, language } = updateLanguageDto;
    const keys = Object.keys(data);
    let modules = [];
    let updateCount = 0;
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      for (const key of keys) {
        const langData = await queryRunner.manager.getRepository(Language).findOne({ where: { LKey: key, LLanguage: language, LAccountId: "0" } });
        if (langData) {
          modules.push(langData.LModule);
          langData.LDefinition = data[key];
          await queryRunner.manager.getRepository(Language).save(langData);
          updateCount++;
        }
      }

      await queryRunner.commitTransaction();
    } catch (e) {
      await queryRunner.rollbackTransaction();
      throw e;
    } finally {
      await queryRunner.release();
    }

    modules = [...new Set(modules)]

    for (const module of modules) {
      await this.uploadToS3(language, module);
    }

    return ({ updateCount });
  }

  remove(id: number) {
    return `This action removes a #${id} language`;
  }
}
