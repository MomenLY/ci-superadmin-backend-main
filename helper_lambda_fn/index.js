import { mongoProcessData, pgProcessData } from "./utils/helper.js";

export const handler = async function (event, context) {
  const dbConfig = event.dbConfig;
  const langParams = event.langParams;

  try {
    if(event.action === "lang_upload_s3") {
      if(dbConfig.type === 'postgres') {
        await pgProcessData(dbConfig, langParams);
      } else if(dbConfig.type === 'mongodb') {
        await mongoProcessData(dbConfig, langParams);
      }
    }
  } catch (error) {
    console.log(error);
  }

	return {
		statusCode: 200,
		body: JSON.stringify('Hello from Lambda!'),
	};
};