import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { BypassAuth, Public } from './auth.decorator';
import { SignInDto } from './dto/signIn.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) { }

  @Public()
  @BypassAuth()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  signIn(@Req() request: Request, @Body() signInDto: SignInDto) {
    const xTenantId = request.headers['x-tenant-id'] || '';
    return this.authService.signIn(
      signInDto.email,
      signInDto.password,
      xTenantId,
    );
  }
}
