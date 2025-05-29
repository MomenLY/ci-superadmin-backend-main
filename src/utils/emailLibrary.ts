import { BadRequestException, Injectable } from '@nestjs/common';
import axios from 'axios';
import { GlobalService } from './global.service';
import { ErrorMessages, SuccessMessages } from './messages';

type EmailPayload = {
  templateCode: string,
  data?: object,
  multiThread?: boolean,
  to: any,
  cc?: string[],
  bcc?: string[]
}
@Injectable()
export class EmailLibrary {
  constructor() { }

  async sendEmail(payload: EmailPayload): Promise<any> {
    const TENANT_INFO = JSON.parse(process.env.TENANT_INFO);
    const emailSubscription = TENANT_INFO?.emailSubscription;

    const response = {
      error: false,
      message: SuccessMessages.EMAIL_SENT_SUCCESSFULLY,
    };
    const emailEndPoint = `${process.env.EMAIL_SERVICE_URL}/email/bulk`;
    try {
      if (!emailSubscription) {
        throw new BadRequestException(
          ErrorMessages.EMAIL_SUBSCRIPTION_NOT_FOUND,
        );
      } else {
        payload.multiThread = payload?.multiThread === true;
        const authCode = emailSubscription.SAuthCode;
        try {
          await axios.post(emailEndPoint, payload, {
            headers: {
              'Auth-Code': authCode,
            },
          });
        } catch (e) {
          throw new Error(e)
        }
      }
    } catch (e) {
      response['error'] = true;
      response['message'] = e.message;
    }
    return response;
  }
}
