interface SpeechModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: {
    id: string;
    object: string;
    created: number;
    allow_create_engine: boolean;
    allow_sampling: boolean;
    allow_logprobs: boolean;
    allow_search_indices: boolean;
    allow_view: boolean;
    allow_fine_tuning: boolean;
    organization: string;
    group: null;
    is_blocking: boolean;
  }[];
  root: string;
  parent: null;
}

interface SpeechResponse {
  modelId: string;
  data: ArrayBuffer;
}

export async function generateSpeechBase64(
  text: string,
  modelId: string,
  apiKey: string
): Promise<SpeechResponse> {
  const url = `https://api.bytez.com/models/v2/suno/${modelId}`;
  const options = {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  };

  const response = await fetch(url, options);
  const data = await response.json();
  const output = await fetch(data.output);

  console.log(data);
  return { modelId, data: await output.arrayBuffer() };
}

export async function listSpeechModels(): Promise<SpeechModel[]> {
  const url = "https://api.bytez.com/models/v2/list/models?task=text-to-speech";
  const options = {
    method: "GET",
    headers: { Authorization: process.env.BYTEZ_API_KEY || "" },
    body: undefined,
  };

  try {
    const response = await fetch(url, options);
    const { error, output } = await response.json();

    if (error) {
      console.error("Failed to list models:", error);
      throw new Error("Failed to fetch models");
    }

    return output.map((model: any) => ({
      id: model.modelId,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "bytez",
      permission: [
        {
          id: `modelperm-${model.modelId.replace(/\W/g, "")}`,
          object: "model_permission",
          created: Math.floor(Date.now() / 1000),
          allow_create_engine: false,
          allow_sampling: true,
          allow_logprobs: true,
          allow_search_indices: false,
          allow_view: true,
          allow_fine_tuning: false,
          organization: "*",
          group: null,
          is_blocking: false,
        },
      ],
      root: model.modelId,
      parent: null,
    }));
  } catch (error) {
    console.error("Failed to fetch models:", error);
    throw new Error("Failed to fetch models");
  }
}
