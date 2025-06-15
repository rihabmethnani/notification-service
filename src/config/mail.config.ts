import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';
import { mailConfigValidation } from './mail.config.schema';

const validateEnv = (env: NodeJS.ProcessEnv) => {
  const schema = Joi.object(mailConfigValidation);
  
  const mailEnv = {
    MAIL_HOST: env.MAIL_HOST,
    MAIL_PORT: env.MAIL_PORT,
    MAIL_SECURE: env.MAIL_SECURE,
    MAIL_USER: env.MAIL_USER,
    MAIL_PASSWORD: env.MAIL_PASSWORD,
    MAIL_FROM: env.MAIL_FROM,
  };

  const { error, value } = schema.validate(mailEnv, {
    abortEarly: false,
    allowUnknown: true,
  });

  if (error) {
    throw new Error(`Mail configuration validation error: ${error.message}`);
  }

  return value;
};

export default registerAs('mail', () => {
  const env = validateEnv(process.env);

  return {
    host: env.MAIL_HOST,
    port: parseInt(env.MAIL_PORT, 10),
    secure: env.MAIL_SECURE === 'true',
    user: env.MAIL_USER,
    password: env.MAIL_PASSWORD,
    from: env.MAIL_FROM,
  };
});