import pg from 'pg';
import { putObject } from './s3Helper.js';
import { MongoClient } from 'mongodb';

export const pgProcessData = async (dbConfig, langParams) => {
  let pool = null;
  try {
    const DBCONFIG = dbConfig;

    pool = new pg.Pool({
      user: DBCONFIG.username,
      host: DBCONFIG.host,
      database: DBCONFIG.database,
      password: DBCONFIG.password,
      port: DBCONFIG.port,
    });

    const { language, module, accountId } = langParams;

    const cronRes = await pool.query('SELECT * FROM language WHERE "LLanguage" = $1 AND "LModule" = $2 AND "LAccountId" = $3', [language, module, accountId]);

    const dataToUpload = {};
    for (const row of cronRes.rows) {
      dataToUpload[row.LKey] = row.LDefinition;
    }
    const resp = await putObject(`locales/${module}/${language}.json`, JSON.stringify(dataToUpload), 'application/json');
  } catch (e) {
    console.log(e);
  }

  try {
    if (pool) {
      await pool.end();
    }
  } catch (error) {
    console.log(error);
  }

  return true;
}

export const mongoProcessData = async (dbConfig, langParams) => {
  const client = new MongoClient(dbConfig.url);
  try {
    const database = client.db(dbConfig.database);
    const languageCol = database.collection('language');
    const { language, module, accountId } = langParams;

    const cursor = languageCol.find({ LLanguage: language, LModule: module, LAccountId: accountId });

    const dataToUpload = {};
    for await (const doc of cursor) {
      dataToUpload[doc.LKey] = doc.LDefinition;
    }

    const resp = await putObject(`locales/${module}/${language}.json`, JSON.stringify(dataToUpload), 'application/json');

  } catch (e) {
    console.log(e);
  }

  try {
    await client.close();
  } catch (error) {
    console.log(error);
  }

  return true;
}