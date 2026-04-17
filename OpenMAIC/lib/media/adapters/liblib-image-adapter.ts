/**
 * LibLib Image Generation Adapter
 *
 * Uses an OpenAI-compatible image generation interface.
 * Typical endpoint: {baseUrl}/v1/images/generations
 *
 * Notes:
 * - Keep `baseUrl` configurable because different LibLib deployments may use
 *   different hostnames or proxy paths.
 * - `model: "default"` is treated as "omit model field" so the upstream can
 *   select its default model.
 */

import type {
  ImageGenerationConfig,
  ImageGenerationOptions,
  ImageGenerationResult,
} from '../types';

const DEFAULT_BASE_URL = 'https://openapi.liblib.ai';
const DEFAULT_IMAGE_MODEL_SENTINEL = 'default';

function resolveEndpoint(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (trimmed.endsWith('/images/generations')) return trimmed;
  if (trimmed.endsWith('/v1')) return `${trimmed}/images/generations`;
  return `${trimmed}/v1/images/generations`;
}

function buildPayload(config: ImageGenerationConfig, options: ImageGenerationOptions): string {
  const maybeModel =
    config.model && config.model !== DEFAULT_IMAGE_MODEL_SENTINEL ? config.model : undefined;

  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    n: 1,
    response_format: 'url',
  };

  if (maybeModel) {
    payload.model = maybeModel;
  }
  if (options.negativePrompt) {
    payload.negative_prompt = options.negativePrompt;
  }

  return JSON.stringify(payload);
}

/**
 * Lightweight connectivity test — validates API key by making a minimal
 * request. 401/403 means key invalid; other responses indicate auth passed.
 */
export async function testLibLibImageConnectivity(
  config: ImageGenerationConfig,
): Promise<{ success: boolean; message: string }> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;
  try {
    const response = await fetch(resolveEndpoint(baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: buildPayload(config, { prompt: '' }),
    });

    if (response.status === 401 || response.status === 403) {
      const text = await response.text();
      return {
        success: false,
        message: `LibLib Image auth failed (${response.status}): ${text}`,
      };
    }

    return { success: true, message: 'Connected to LibLib Image' };
  } catch (err) {
    return { success: false, message: `LibLib Image connectivity error: ${err}` };
  }
}

export async function generateWithLibLibImage(
  config: ImageGenerationConfig,
  options: ImageGenerationOptions,
): Promise<ImageGenerationResult> {
  const baseUrl = config.baseUrl || DEFAULT_BASE_URL;

  const response = await fetch(resolveEndpoint(baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: buildPayload(config, options),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LibLib image generation failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  const imageData = data.data?.[0] ?? data.output?.[0] ?? data.images?.[0];
  if (!imageData) {
    throw new Error('LibLib returned empty image response');
  }

  const imageUrl =
    imageData.url ||
    imageData.image_url ||
    imageData.imageUrl ||
    (typeof imageData === 'string' ? imageData : undefined);
  const imageBase64 = imageData.b64_json || imageData.base64;

  if (!imageUrl && !imageBase64) {
    throw new Error('LibLib response missing image content');
  }

  return {
    url: imageUrl,
    base64: imageBase64,
    width: options.width || 1024,
    height: options.height || 1024,
  };
}
