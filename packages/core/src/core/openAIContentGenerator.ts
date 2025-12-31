/**
 * @license
 * Copyright 2025 Citrux
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

/**
 * A ContentGenerator implementation that uses OpenAI-compatible APIs.
 */
export class OpenAIContentGenerator implements ContentGenerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly modelName: string;

  constructor(config: Config) {
    const provider = (config as any).getLlmProvider?.() || 'openai';
    const providerConfig = (config as any).getLlmProviderConfig?.(provider) || {};
    
    this.apiKey = providerConfig.apiKey || process.env['OPENAI_API_KEY'] || '';
    this.baseUrl = providerConfig.baseUrl || process.env['OPENAI_API_BASE'] || 'https://api.openai.com/v1';
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

  private convertContentsToMessages(contents: Content[], systemInstruction?: Content): any[] {
    const messages: any[] = [];

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
                id: part.functionCall.name + '_' + Math.random().toString(36).substring(7),
                type: 'function',
                function: {
                  name: part.functionCall.name,
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
    const systemInstruction = request.config?.systemInstruction ? 
      (Array.isArray(request.config.systemInstruction) ? { parts: request.config.systemInstruction.map(p => typeof p === 'string' ? { text: p } : p) } : 
       typeof request.config.systemInstruction === 'string' ? { parts: [{ text: request.config.systemInstruction }] } : request.config.systemInstruction) as Content : undefined;

    const messages = this.convertContentsToMessages(contents, systemInstruction);
    
    const body = {
      model: this.modelName,
      messages,
      tools: request.config?.tools?.flatMap((t: any) => t.functionDeclarations?.map((f: any) => ({
        type: 'function',
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        }
      }))) || undefined,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = (await response.json()) as any;
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
        finishReason: 'STOP' as any,
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
    const systemInstruction = request.config?.systemInstruction ? 
      (Array.isArray(request.config.systemInstruction) ? { parts: request.config.systemInstruction.map(p => typeof p === 'string' ? { text: p } : p) } : 
       typeof request.config.systemInstruction === 'string' ? { parts: [{ text: request.config.systemInstruction }] } : request.config.systemInstruction) as Content : undefined;

    const messages = this.convertContentsToMessages(contents, systemInstruction);
    
    const body = {
      model: this.modelName,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      tools: request.config?.tools?.flatMap((t: any) => t.functionDeclarations?.map((f: any) => ({
        type: 'function',
        function: {
          name: f.name,
          description: f.description,
          parameters: f.parameters,
        }
      }))) || undefined,
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
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
        input: Readable.fromWeb(response.body as any),
        crlfDelay: Infinity,
      });

      const accumulatedToolCalls: Map<number, { name?: string; arguments: string }> = new Map();

      for await (const line of rl) {
        if (!line.startsWith('data: ')) continue;
        
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') break;

        try {
          const chunk = JSON.parse(dataStr);
          
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
              const index = tc.index ?? 0;
              let accumulated = accumulatedToolCalls.get(index);
              if (!accumulated) {
                accumulated = { arguments: '' };
                accumulatedToolCalls.set(index, accumulated);
              }
              if (tc.function?.name) {
                accumulated.name = tc.function.name;
              }
              if (tc.function?.arguments) {
                accumulated.arguments += tc.function.arguments;
              }
            }
          }

          if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
            for (const [_, tc] of accumulatedToolCalls) {
              if (tc.name) {
                try {
                  parts.push({
                    functionCall: {
                      name: tc.name,
                      args: tc.arguments ? JSON.parse(tc.arguments) : {},
                    },
                  });
                } catch (e) {
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
                finishReason: (choice.finish_reason?.toUpperCase() || undefined) as any,
              },
            ];
            yield result;
          }
        } catch (e) {
          // Ignore parse errors for incomplete chunks
        }
      }
    })();
  }

  async countTokens(request: CountTokensParameters): Promise<CountTokensResponse> {
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

  async embedContent(_request: EmbedContentParameters): Promise<EmbedContentResponse> {
    throw new Error('OpenAI embedContent not supported');
  }
}