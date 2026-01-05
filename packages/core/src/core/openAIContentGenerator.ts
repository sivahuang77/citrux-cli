/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
  GenerateContentParameters,
} from '@google/genai';
import { GenerateContentResponse } from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import type { Config } from '../config/config.js';
import { fetch } from 'undici';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';
import { toContents } from '../code_assist/converter.js';

interface OpenAIMessage {
  role: string;
  content?: string;
  tool_calls?: Array<{
    id: string;
    type: string;
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

interface OpenAIRequest {
  model: string;
  messages: OpenAIMessage[];
  stream?: boolean;
  stream_options?: { include_usage: boolean };
  tools?: OpenAITool[];
}

interface OpenAITool {
  type: string;
  function: {
    name: string;
    description: string | undefined;
    parameters: object | undefined;
  };
}

interface OpenAIResponse {
  choices: Array<{
    message: OpenAIMessage;
    delta?: OpenAIMessage;
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * A ContentGenerator implementation that uses OpenAI-compatible APIs.
 */
export class OpenAIContentGenerator implements ContentGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly chatCompletionPath: string;
  private readonly modelName: string;

  constructor(config: Config) {
    const provider = config.getLlmProvider() || 'openai';
    const providerConfig = config.getLlmProviderConfig(provider) || {};

    this.apiKey =
      (providerConfig['apiKey'] as string) ||
      process.env['OPENAI_API_KEY'] ||
      '';
    let baseUrl =
      (providerConfig['baseUrl'] as string) ||
      process.env['OPENAI_API_BASE'] ||
      'https://api.openai.com/v1';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    this.baseUrl = baseUrl;
    this.chatCompletionPath =
      (providerConfig['chatCompletionPath'] as string) || '/chat/completions';
    this.modelName = config.getModel();
  }

  private mapRole(role: string): string {
    switch (role) {
      case 'user':
        return 'user';
      case 'model':
        return 'assistant';
      case 'system':
        return 'system';
      default:
        return 'user';
    }
  }

  private convertContentsToMessages(
    contents: Content[],
    systemInstruction?: Content,
  ): OpenAIMessage[] {
    const messages: OpenAIMessage[] = [];

    if (systemInstruction?.parts?.[0]?.text) {
      messages.push({
        role: 'system',
        content: systemInstruction.parts[0].text,
      });
    }

    for (const content of contents) {
      const role = this.mapRole(content.role || 'user');
      const parts = content.parts || [];

      for (const part of parts) {
        if (part.text) {
          messages.push({ role, content: part.text });
        } else if (part.functionCall) {
          messages.push({
            role: 'assistant',
            tool_calls: [
              {
                id:
                  (part.functionCall.name || 'unknown') +
                  '_' +
                  Math.random().toString(36).substring(7),
                type: 'function',
                function: {
                  name: part.functionCall.name || 'unknown',
                  arguments: JSON.stringify(part.functionCall.args),
                },
              },
            ],
          });
        } else if (part.functionResponse) {
          // Note: OpenAI requires tool_call_id to match the assistant's request.
          // This is a simplified mapping that might need state tracking for strict compliance.
          messages.push({
            role: 'tool',
            tool_call_id: 'unknown', // Placeholder
            content: JSON.stringify(part.functionResponse.response),
          });
        }
      }
    }

    return messages;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const contents = toContents(request.contents);
    const systemInstruction = request.config?.systemInstruction
      ? ((Array.isArray(request.config.systemInstruction)
          ? {
              parts: request.config.systemInstruction.map((p) =>
                typeof p === 'string' ? { text: p } : p,
              ),
            }
          : typeof request.config.systemInstruction === 'string'
            ? { parts: [{ text: request.config.systemInstruction }] }
            : request.config.systemInstruction) as Content)
      : undefined;

    const messages = this.convertContentsToMessages(
      contents,
      systemInstruction,
    );

    const body: OpenAIRequest = {
      model: this.modelName,
      messages,
      tools:
        request.config?.tools
          ?.flatMap((t: unknown) => {
            const tool = t as {
              functionDeclarations?: Array<{
                name: string;
                description?: string;
                parameters?: object;
              }>;
            };
            return tool.functionDeclarations?.map((f) => ({
              type: 'function',
              function: {
                name: f.name,
                description: f.description,
                parameters: f.parameters,
              },
            }));
          })
          .filter((t): t is OpenAITool => !!t) || undefined,
    };

    const response = await fetch(`${this.baseUrl}${this.chatCompletionPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as OpenAIResponse;
    const choice = data.choices[0];
    const message = choice.message;

    const parts: Part[] = [];
    if (message.content) {
      parts.push({ text: message.content });
    }
    if (message.tool_calls) {
      for (const tc of message.tool_calls) {
        parts.push({
          functionCall: {
            name: tc.function.name,
            args: JSON.parse(tc.function.arguments),
          },
        });
      }
    }

    const result = new GenerateContentResponse();
    result.candidates = [
      {
        content: {
          role: 'model',
          parts,
        },
        finishReason: 'STOP' as unknown as NonNullable<
          GenerateContentResponse['candidates']
        >[0]['finishReason'],
      },
    ];
    result.usageMetadata = {
      promptTokenCount: data.usage?.prompt_tokens,
      candidatesTokenCount: data.usage?.completion_tokens,
      totalTokenCount: data.usage?.total_tokens,
    };
    return result;
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const contents = toContents(request.contents);
    const systemInstruction = request.config?.systemInstruction
      ? ((Array.isArray(request.config.systemInstruction)
          ? {
              parts: request.config.systemInstruction.map((p) =>
                typeof p === 'string' ? { text: p } : p,
              ),
            }
          : typeof request.config.systemInstruction === 'string'
            ? { parts: [{ text: request.config.systemInstruction }] }
            : request.config.systemInstruction) as Content)
      : undefined;

    const messages = this.convertContentsToMessages(
      contents,
      systemInstruction,
    );

    const body: OpenAIRequest = {
      model: this.modelName,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      tools:
        request.config?.tools
          ?.flatMap((t: unknown) => {
            const tool = t as {
              functionDeclarations?: Array<{
                name: string;
                description?: string;
                parameters?: object;
              }>;
            };
            return tool.functionDeclarations?.map((f) => ({
              type: 'function',
              function: {
                name: f.name,
                description: f.description,
                parameters: f.parameters,
              },
            }));
          })
          .filter((t): t is OpenAITool => !!t) || undefined,
    };

    const response = await fetch(`${this.baseUrl}${this.chatCompletionPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    if (!response.body) {
      throw new Error('OpenAI API response body is empty');
    }

    return (async function* () {
      const rl = readline.createInterface({
        input: Readable.fromWeb(
          response.body as unknown as import('stream/web').ReadableStream,
        ),
        crlfDelay: Infinity,
      });

      const accumulatedToolCalls: Map<
        number,
        { name?: string; arguments: string }
      > = new Map();

      for await (const line of rl) {
        if (!line.startsWith('data: ')) continue;

        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') break;

        try {
          const chunk = JSON.parse(dataStr) as OpenAIResponse;

          // Final usage chunk
          if (chunk.usage) {
            const result = new GenerateContentResponse();
            result.usageMetadata = {
              promptTokenCount: chunk.usage.prompt_tokens,
              candidatesTokenCount: chunk.usage.completion_tokens,
              totalTokenCount: chunk.usage.total_tokens,
            };
            yield result;
            continue;
          }

          const choice = chunk.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;
          const parts: Part[] = [];

          if (delta?.content) {
            parts.push({ text: delta.content });
          }

          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              const toolCall = tc as unknown as {
                index?: number;
                function?: { name?: string; arguments?: string };
              };
              const index = toolCall.index ?? 0;
              let accumulated = accumulatedToolCalls.get(index);
              if (!accumulated) {
                accumulated = { arguments: '' };
                accumulatedToolCalls.set(index, accumulated);
              }
              if (toolCall.function?.name) {
                accumulated.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                accumulated.arguments += toolCall.function.arguments;
              }
            }
          }

          if (
            choice.finish_reason === 'tool_calls' ||
            choice.finish_reason === 'stop'
          ) {
            for (const [_, tc] of accumulatedToolCalls) {
              if (tc.name) {
                try {
                  parts.push({
                    functionCall: {
                      name: tc.name,
                      args: tc.arguments ? JSON.parse(tc.arguments) : {},
                    },
                  });
                } catch (_e) {
                  // Skip invalid partial JSON
                }
              }
            }
            accumulatedToolCalls.clear();
          }

          if (parts.length > 0) {
            const result = new GenerateContentResponse();
            result.candidates = [
              {
                content: {
                  role: 'model',
                  parts,
                },
                finishReason: (choice.finish_reason?.toUpperCase() ||
                  undefined) as unknown as NonNullable<
                  GenerateContentResponse['candidates']
                >[0]['finishReason'],
              },
            ];
            yield result;
          }
        } catch (_e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    })();
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    const contents = toContents(request.contents);
    let totalChars = 0;
    for (const content of contents) {
      for (const part of content.parts || []) {
        if (part.text) {
          totalChars += part.text.length;
        }
      }
    }
    // Very rough estimation for OpenAI-compatible providers: ~4 chars per token
    const estimatedTokens = Math.ceil(totalChars / 4);
    return { totalTokens: estimatedTokens };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    throw new Error('OpenAI embedContent not supported');
  }
}
