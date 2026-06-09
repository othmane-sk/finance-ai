<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotLlmService
{
    public function complete(string $systemPrompt, string $message): ?string
    {
        $provider = strtolower((string) config('services.chatbot.provider'));
        $apiKey = config('services.chatbot.key');

        if (!$apiKey) {
            return null;
        }

        if (!$provider) {
            $provider = config('services.chatbot.gemini_key') ? 'gemini' : 'openai';
        }

        try {
            return match ($provider) {
                'gemini' => $this->completeGemini($apiKey, $systemPrompt, $message),
                'groq' => $this->completeOpenAiCompatible(
                    'https://api.groq.com/openai/v1/chat/completions',
                    config('services.chatbot.groq_model', 'llama-3.1-8b-instant'),
                    $apiKey,
                    $systemPrompt,
                    $message,
                ),
                default => $this->completeOpenAiCompatible(
                    'https://api.openai.com/v1/chat/completions',
                    config('services.chatbot.openai_model', 'gpt-4o-mini'),
                    $apiKey,
                    $systemPrompt,
                    $message,
                ),
            };
        } catch (\Throwable $e) {
            Log::warning('Chatbot LLM request failed', [
                'provider' => $provider,
                'message' => $e->getMessage(),
            ]);

            return null;
        }
    }

    private function completeOpenAiCompatible(
        string $url,
        string $model,
        string $apiKey,
        string $systemPrompt,
        string $message
    ): ?string {
        $response = Http::timeout(30)
            ->retry(2, 250)
            ->withToken($apiKey)
            ->acceptJson()
            ->post($url, [
                'model' => $model,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $message],
                ],
                'temperature' => 0.35,
                'max_tokens' => 450,
            ]);

        if (!$response->successful()) {
            Log::warning('OpenAI-compatible chatbot response was not successful', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json('choices.0.message.content');
    }

    private function completeGemini(string $apiKey, string $systemPrompt, string $message): ?string
    {
        $model = config('services.chatbot.gemini_model', 'gemini-1.5-flash');
        $url = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $response = Http::timeout(30)
            ->retry(2, 250)
            ->acceptJson()
            ->post($url . '?key=' . urlencode($apiKey), [
                'systemInstruction' => [
                    'parts' => [
                        ['text' => $systemPrompt],
                    ],
                ],
                'contents' => [
                    [
                        'role' => 'user',
                        'parts' => [
                            ['text' => $message],
                        ],
                    ],
                ],
                'generationConfig' => [
                    'temperature' => 0.35,
                    'maxOutputTokens' => 450,
                ],
            ]);

        if (!$response->successful()) {
            Log::warning('Gemini chatbot response was not successful', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            return null;
        }

        return $response->json('candidates.0.content.parts.0.text');
    }
}
