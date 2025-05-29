import { Injectable, Scope } from '@nestjs/common';

@Injectable({ scope: Scope.REQUEST })
export class GlobalService {
  accountId: string = '';
  identifier: string = '';
  emailSubscription: any = '';
  featuresRestrictions: any = '';
}