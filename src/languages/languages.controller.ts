import { Controller, Get, Post, Body, Patch, Param, Delete, BadRequestException, Query, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { BypassAuth, Public } from 'src/auth/auth.decorator';
import { validateLanguageData } from 'src/utils/helper';
import { FindLanguageDto } from './dto/find-language.dto';

@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) { }

  @Post()
  async create(@Body() createLanguageDto: CreateLanguageDto) {
    validateLanguageData(createLanguageDto.data);
    try {
      return await this.languagesService.create(createLanguageDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @BypassAuth()
  @Get('json/:lang')
  findOne(@Param('lang') lang: string) {
    return this.languagesService.findByLanguage(lang);
  }

  @Public()
  @Get(':lang')
  findAll(
    @Param('lang') lang: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.languagesService.findAll(lang, page, limit, search);
  }

  @Public()
  @Post('find-by-keys')
  findByKeys(
    @Body() findLanguageDto: FindLanguageDto
  ) {
    return this.languagesService.findByKeys(findLanguageDto);
  }

  @Patch()
  update(@Body() updateLanguageDto: UpdateLanguageDto) {
    validateLanguageData(updateLanguageDto.data);
    return this.languagesService.update(updateLanguageDto);
  }

}
