import Koa from "koa";
import Router from "@koa/router";
import { listSpeechModels, generateSpeechBase64 } from "./api";
import type { Context } from "koa";
// @ts-ignore
import koaBody from "koa-body";

const app = new Koa();
const router = new Router();

app.use(koaBody());

// Endpoint liệt kê models
router.get("/v1/models", async (ctx: Context) => {
  try {
    const models = await listSpeechModels();
    ctx.body = {
      object: "list",
      data: models,
    };
    ctx.status = 200;
    ctx.type = "application/json";
  } catch (error) {
    console.error("Models endpoint error:", error);
    ctx.body = { error: "Internal server error" };
    ctx.status = 500;
    ctx.type = "application/json";
  }
});

// Endpoint tạo speech (OpenAI Compatible)
router.post("/v1/audio/speech", async (ctx: Context) => {
  const authorization = ctx.headers.authorization;
  if (!authorization) {
    ctx.body = {
      error: {
        message: "Missing Authorization header",
        type: "invalid_request_error",
      },
    };
    ctx.status = 401;
    return;
  }

  const apiKey = authorization.replace("Bearer ", "");

  try {
    const body = ctx.request.body as {
      input?: string; // OpenAI chuẩn dùng 'input'
      text?: string; // Hỗ trợ fallback
      model?: string;
      voice?: string;
      response_format?: string;
    };

    // 1. Lấy input (OpenAI dùng 'input', code cũ dùng 'text')
    const textToSpeech = body.input || body.text;

    // 2. Lấy các tham số khác
    // voice bị bỏ qua vì Bytez không hỗ trợ, nhưng vẫn nhận để không lỗi request
    const { model = "tts-1", response_format = "mp3" } = body;

    if (!textToSpeech) {
      ctx.body = {
        error: {
          message: "Missing required parameter: 'input'",
          type: "invalid_request_error",
        },
      };
      ctx.status = 400;
      return;
    }

    // 3. Gọi API Bytez
    const { data } = await generateSpeechBase64(textToSpeech, model, apiKey);

    // 4. Trả về kết quả chuẩn OpenAI
    // Convert ArrayBuffer sang Node.js Buffer để Koa xử lý đúng
    ctx.body = Buffer.from(data);

    ctx.status = 200;
    ctx.type = getContentType(response_format);

    // Các headers bổ sung cho client biết đây là file tải về
    ctx.set(
      "Content-Disposition",
      `attachment; filename="speech.${response_format}"`
    );
    ctx.set("Content-Transfer-Encoding", "binary");
  } catch (error: any) {
    console.error("TTS endpoint error:", error);
    // Trả về lỗi format JSON giống OpenAI để client dễ debug
    ctx.body = {
      error: {
        message: error.message || "Internal server error",
        type: "api_error",
      },
    };
    ctx.status = 500;
    ctx.type = "application/json";
  }
});

function getContentType(format: string): string {
  const types: Record<string, string> = {
    mp3: "audio/mpeg",
    opus: "audio/opus",
    aac: "audio/aac",
    flac: "audio/flac",
    wav: "audio/wav",
    pcm: "audio/pcm",
  };
  return types[format] || "audio/mpeg";
}

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
