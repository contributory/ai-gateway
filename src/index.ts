import Koa from 'koa';
import Router from '@koa/router';
import { listSpeechModels, generateSpeechBase64 } from './api';
import type { Context } from 'koa';
// @ts-ignore
import koaBody from 'koa-body';

const app = new Koa();
const router = new Router();

// Add body parser middleware
app.use(koaBody());

router.get('/v1/models', async (ctx: Context) => {
  try {
    const models = await listSpeechModels();
    ctx.body = {
      object: 'list',
      data: models,
    };
    ctx.status = 200;
    ctx.type = 'application/json';
  } catch (error) {
    console.error('Models endpoint error:', error);
    ctx.body = { error: 'Internal server error' };
    ctx.status = 500;
    ctx.type = 'application/json';
  }
});

router.post('/v1/audio/speech', async (ctx: Context) => {
  const authorization = ctx.headers.authorization;
  if (!authorization) {
    ctx.body = { error: 'Unauthorized' };
    ctx.status = 401;
    ctx.type = 'application/json';
    return;
  }

  const apiKey = authorization.replace('Bearer ', '');
  try {
    const body = ctx.request.body as {
      text: string;
      model?: string;
      voice?: string;
      response_format?: string;
    };
    const { text, model = 'tts-1', voice = 'alloy', response_format = 'mp3' } = body;

    if (!text) {
      ctx.body = { error: 'Missing required parameter: text' };
      ctx.status = 400;
      ctx.type = 'application/json';
      return;
    }

    const { data } = await generateSpeechBase64(text, model, apiKey);
    ctx.body = data;
    ctx.status = 200;
    ctx.type = getContentType(response_format);
    ctx.set('Content-Disposition', `attachment; filename="speech.${response_format}"`);
  } catch (error) {
    console.error('TTS endpoint error:', error);
    ctx.body = { error: 'Internal server error' };
    ctx.status = 500;
    ctx.type = 'application/json';
  }
});

function getContentType(format: string): string {
  const types: Record<string, string> = {
    mp3: 'audio/mpeg',
    opus: 'audio/opus',
    aac: 'audio/aac',
    flac: 'audio/flac',
  };
  return types[format] || 'audio/mpeg';
}

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});