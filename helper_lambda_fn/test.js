import 'dotenv/config';

import { handler } from "./index.js";

// handler({
//   action: 'lang_upload_s3',
//   dbConfig: {
//     type: 'postgres',
//     host: 'localhost',
//     port: 5432,
//     username: 'postgres',
//     password: 'enfin123',
//     database: 'onion_superadmin',
//     entities: [],
//     migrations: [],
//     autoLoadEntities: true,
//     synchronize: false,
//   },
//   langParams: {
//     language: 'en', module: 'default', accountId: "0"
//   }
// });

handler({
  action: 'lang_upload_s3',
  dbConfig: {
    type: 'mongodb',
    url: 'mongodb://localhost',
    database: 'onion_superadmin',
    entities: [],
    migrations: [],
    logging: true,
    autoLoadEntities: true,
    synchronize: true,
  },
  langParams: {
    language: 'en', module: 'default', accountId: "0"
  }
});