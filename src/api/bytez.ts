import Bytez from "bytez.js";

interface ImageModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  permission: any[];
  root: string;
  parent: null;
}

export async function generateImage(
  prompt: string,
  modelId: string,
  apiKey: string,
  responseFormat: string
): Promise<any> {
  const sdk = new Bytez(apiKey);
  const model = sdk.model(modelId);

  const { error, output } = await model.run(prompt);
  console.log({ error });

  if (error) {
    throw new Error(`Bytez API Error: ${error}`);
  }

  if (!output) {
    throw new Error("No output URL returned from Bytez");
  }
  if (responseFormat === "url") {
    return {
      created: Math.floor(Date.now() / 1000),
      data: [
        {
          url: output,
          revised_prompt: prompt,
        },
      ],
    };
  }

  const base64Image = await urlToBase64(output);
  return {
    created: Math.floor(Date.now() / 1000),
    data: [
      {
        b64_json: base64Image,
        revised_prompt: prompt,
      },
    ],
  };
}

export async function listBytezModels(): Promise<ImageModel[]> {
  const url = "https://api.bytez.com/models/v2/list/models?task=text-to-image";
  const options = {
    method: "GET",
    headers: {
      Authorization: process.env.BYTEZ_API_KEY ? process.env.BYTEZ_API_KEY : "",
    },
  };

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    const output = data.output || [];

    if (data.error) {
      console.error("Failed to list models:", data.error);
      throw new Error("Failed to fetch models from Bytez");
    }

    return output.map((model: any) => ({
      id: model.modelId,
      object: "model",
      created: Math.floor(Date.now() / 1000),
      owned_by: "bytez",
      permission: [],
      root: model.modelId,
      parent: null,
    }));
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
}

async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  const arrayBuffer = await blob.arrayBuffer();
  // Convert ArrayBuffer to base64 string using built-in functions
  let binary = "";
  const bytes = new Uint8Array(arrayBuffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
