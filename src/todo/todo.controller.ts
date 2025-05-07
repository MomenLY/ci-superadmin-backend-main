import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { TodosService } from './todo.service';
import { Public } from 'src/auth/auth.decorator';
import { CreateTodoDto } from './dto/create-todo.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';


@Controller('todos')
export class TodosController {
  constructor(private todosService: TodosService) { }

  @Public()
  @Post()
  create(@Body() createTodoDto: CreateTodoDto) {
    return this.todosService.createTodo(createTodoDto);
  }

  @Get(':id')
  findOne(@Param('id') _id: string) {
    return this.todosService.findOneTodo(_id);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, callback) => {
        console.log(req.body.fileName);
        return callback(null, `${req.body.fileName}`);

      }
    })
  }))
  async uploadFile(@UploadedFile() file) {
    return { filename: file.filename };
  }
}
