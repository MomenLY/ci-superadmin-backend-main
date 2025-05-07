import { InvokeCommand, InvokeCommandInput, LambdaClient } from "@aws-sdk/client-lambda";
const AWS_S3_KEY = process.env.AWS_S3_KEY;
const AWS_S3_REGION = process.env.AWS_S3_REGION;
const AWS_S3_SECRET = process.env.AWS_S3_SECRET;

const client = new LambdaClient({
  region: AWS_S3_REGION,
  credentials: {
    accessKeyId: AWS_S3_KEY,
    secretAccessKey: AWS_S3_SECRET,
  },
});

export const invokeFunction = (params, fName) => {
  const pms = {
    FunctionName: fName, 
    InvocationType: 'Event',
    Payload: JSON.stringify(params)
  };
  const command = new InvokeCommand(pms as InvokeCommandInput);
  return client.send(command);
}