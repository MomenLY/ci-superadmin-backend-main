import { Module } from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { LanguagesController } from './languages.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from './entities/language.entity';
import { GlobalService } from 'src/utils/global.service';

@Module({
  imports: [TypeOrmModule.forFeature([Language])],
  controllers: [LanguagesController],
  providers: [LanguagesService, GlobalService],
  exports: [LanguagesService],
})
export class LanguagesModule {}
