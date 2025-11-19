const BASE_URL = "https://stablehorde.net/api/v2";
const CLIENT_AGENT = "Koa_Proxy_Server:1.0:admin";
const PUBLIC_API_KEY = "0000000000";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface HordePayload {
  prompt: string;
  params?: any;
  nsfw?: boolean;
  censor_nsfw?: boolean;
  models?: string[];
}

export async function generateImageHorde(
  payload: any,
  responseFormat: any,
  userApiKey?: string
): Promise<any> {
  const rawKey = userApiKey
    ? userApiKey.replace("Bearer ", "")
    : PUBLIC_API_KEY;

  const apiKey = rawKey.trim() === "" ? PUBLIC_API_KEY : rawKey;

  console.log(
    `[Horde] Generating with key: ${
      apiKey === PUBLIC_API_KEY ? "PUBLIC (Slow)" : "PRIVATE (Fast)"
    }`
  );

  const hordePayload: HordePayload = {
    prompt: payload.prompt,
    params: {
      sampler_name: "k_euler_a",
      cfg_scale: 7.5,
      steps: 30,
      n: payload.n || 1,
    },
    nsfw: false,
    censor_nsfw: true,
    models: ["stable_diffusion"],
  };

  if (payload.size) {
    const [width, height] = payload.size.split("x").map(Number);
    if (width && height) {
      hordePayload.params.width = width;
      hordePayload.params.height = height;
    }
  } else {
    hordePayload.params.width = 512;
    hordePayload.params.height = 512;
  }

  if (payload.params) {
    hordePayload.params = { ...hordePayload.params, ...payload.params };
  }
  if (payload.models) hordePayload.models = payload.models;

  const response = await fetch(`${BASE_URL}/generate/async`, {
    method: "POST",
    headers: {
      apikey: apiKey,
      "Client-Agent": CLIENT_AGENT,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(hordePayload),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.message || "Failed to submit task to AI Horde");
  }

  const data = await response.json();
  const id = data.id;

  let isDone = false;
  let result = null;
  let attempts = 0;
  const maxAttempts = 60;

  while (!isDone && attempts < maxAttempts) {
    attempts++;
    await sleep(3000);

    const checkResponse = await fetch(`${BASE_URL}/generate/status/${id}`, {
      method: "GET",
      headers: { "Client-Agent": CLIENT_AGENT },
    });

    const checkData = await checkResponse.json();

    if (checkData.done) {
      isDone = true;
      result = checkData.generations;
    } else if (!checkData.is_possible) {
      throw new Error(
        "AI Horde cannot fulfill this request (No matching workers)"
      );
    }
  }

  if (!result) throw new Error("Request timed out or failed processing");
  if (responseFormat === "url") {
    return {
      created: Math.floor(Date.now() / 1000),
      data: result.map((img: any) => ({
        url: img.img,
        revised_prompt: payload.prompt,
      })),
    };
  }
  const images: Array<string> = result.map(async (img: any) => {
    const response = await fetch(img.img);
    const blob = await response.blob();
    const b64Json = await blobToBase64(blob);
    return b64Json;
  });
  return {
    created: Math.floor(Date.now() / 1000),
    data: [
      {
        images,
      },
    ],
  };
}

export async function getHordeModels() {
  /** 
  try {
    const response = await fetch(`${BASE_URL}/status/models?type=image`, {
      method: "GET",
      headers: {
        "Client-Agent": CLIENT_AGENT,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch models from AI Horde");
    }

    const data = await response.json();

    const sortedModels = data.sort((a: any, b: any) => b.count - a.count);
    */

  return [
    {
      id: "stablehorde",
      object: "model",
      created: Date.now(),
      owned_by: "AI Horde Workers",
      permission: [],
    },
  ];
}

async function blobToBase64(blob: Blob): Promise<string> {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString("base64");
}
