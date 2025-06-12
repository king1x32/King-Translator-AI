// ==UserScript==
// @name          King Translator AI
// @namespace     https://kingsmanvn.pages.dev
// @version       5.0
// @author        King1x32
// @icon          https://raw.githubusercontent.com/king1x32/King-Translator-AI/refs/heads/main/icon/kings.jpg
// @license       GPL3
// @description   Dịch văn bản (bôi đen văn bản, khi nhập văn bản), hình ảnh, audio, video bằng Google Gemini API. Hỗ trợ popup phân tích từ vựng, popup dịch và dịch nhanh.
// @match         *://*/*
// @match         file:///*
// @exclude-match *://puter.com/*
// @inject-into   auto
// @grant         GM_xmlhttpRequest
// @grant         GM_addStyle
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_registerMenuCommand
// @grant         unsafeWindow
// @grant         GM_addElement
// @grant         GM_notification
// @grant         GM_setClipboard
// @grant         window.close
// @grant         window.focus
// @grant         window.onurlchange
// @connect       *.*
// @require       https://js.puter.com/v2/
// @require       https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js
// @require       https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js
// @require       https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js
// @require       https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js
// @homepageURL   https://github.com/king1x32/King-Translator-AI
// @downloadURL   https://raw.githubusercontent.com/king1x32/King-Translator-AI/refs/heads/main/King_Translator_AI.user.js
// @updateURL     https://raw.githubusercontent.com/king1x32/King-Translator-AI/refs/heads/main/King_Translator_AI.user.js
// ==/UserScript==
(function() {
  "use strict";
  const CONFIG = {
    API: {
      providers: {
        gemini: {
          baseUrl: "https://generativelanguage.googleapis.com/v1beta/models",
          uploadUrl: "https://generativelanguage.googleapis.com/upload/v1beta/files",
          models: {
            fast: [
              "gemini-2.5-flash-preview-05-20",
              "gemini-2.5-flash-preview-04-17",
              "gemini-2.0-flash-lite",
              "gemini-2.0-flash-exp",
              "gemini-2.0-flash",
              "gemini-1.5-flash",
              "gemini-1.5-flash-8b"
            ],
            pro: ["gemini-2.5-pro-preview-06-05", "gemini-2.5-pro-preview-05-06", "gemini-2.5-pro-exp-03-25", "gemini-2.0-pro-exp-02-05", "gemini-2.0-pro-exp", "gemini-1.5-pro"],
            think: [
              "gemini-2.0-flash-thinking-exp-1219",
              "gemini-2.0-flash-thinking-exp-01-21",
              "gemini-2.0-flash-thinking-exp"
            ]
          },
          limits: {
            maxDirectSize: 15 * 1024 * 1024, // 15MB cho base64
            maxUploadSize: {
              document: 2 * 1024 * 1024 * 1024,  // 2GB cho document
              image: 2 * 1024 * 1024 * 1024,   // 2GB cho image
              video: 2 * 1024 * 1024 * 1024,  // 2GB cho videos
              audio: 2 * 1024 * 1024 * 1024   // 2GB cho audio
            }
          },
          headers: { "Content-Type": "application/json" },
          createRequestBody: (content, generation = {}) => ({
            contents: [{
              parts: Array.isArray(content) ? content : [{
                text: content
              }]
            }],
            generationConfig: generation
          }),
          createBinaryParts: (prompt, mimeType, base64Data) => [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ],
          responseParser: (response) => {
            if (typeof response === "string") {
              return response;
            }
            if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
              return response.candidates[0].content.parts[0].text;
            }
            throw new Error((this._("notifications.failed_read_api")));
          }
        },
        perplexity: {
          baseUrl: "https://api.perplexity.ai/chat/completions",
          models: {
            fast: ["sonar", "sonar-reasoning"],
            balance: ["sonar-deep-research", "r1-1776"],
            pro: ["sonar-reasoning-pro", "sonar-pro"]
          },
          headers: (apiKey) => ({
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }),
          createRequestBody: (content, model = "sonar", tem = 0.6, topp = 0.8, topk = 30) => ({
            model: model,
            // max_tokens: 4096,
            messages: [{
              role: "user",
              content: content
            }],
            temperature: tem,
            top_p: topp,
            top_k: topk
          }),
          createBinaryParts: (prompt, mimeType, base64Data) => [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`
              }
            }
          ],
          responseParser: (response) => {
            if (typeof response === "string") {
              return response;
            }
            if (response?.choices?.[0]?.message?.content) {
              return response.choices[0].message.content;
            }
            throw new Error((this._("notifications.failed_read_api")));
          }
        },
        claude: {
          baseUrl: "https://api.anthropic.com/v1/messages",
          models: {
            fast: [
              "claude-3-5-haiku-latest",
              "claude-3-5-haiku-20241022",
              "claude-3-haiku-20240307"
            ],
            balance: [
              "claude-3-7-sonnet-latest",
              "claude-3-7-sonnet-20250219",
              "claude-3-5-sonnet-latest",
              "claude-3-5-sonnet-20241022",
              "claude-3-5-sonnet-20240620",
              "claude-3-sonnet-20240229"
            ],
            pro: [
              "claude-3-opus-latest",
              "claude-3-opus-20240229"
            ]
          },
          headers: (apiKey) => ({
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json"
          }),
          createRequestBody: (content, model = "claude-3-7-sonnet-latest", tem = 0.6, topp = 0.8, topk = 30) => ({
            model: model,
            // max_tokens: 4096,
            messages: [{
              role: "user",
              content: content
            }],
            temperature: tem,
            top_p: topp,
            top_k: topk
          }),
          createBinaryParts: (prompt, mimeType, base64Data) => [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: base64Data
              }
            }
          ],
          responseParser: (response) => {
            if (typeof response === "string") {
              return response;
            }
            if (response?.content?.[0]?.text) {
              return response.content[0].text;
            }
            throw new Error("Invalid response format from Claude API");
          }
        },
        openai: {
          baseUrl: "https://api.openai.com/v1/responses",
          models: {
            fast: ["gpt-4.1-nano", "gpt-4.1-mini", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"],
            balance: ["gpt-4.1", "gpt-4o"],
            pro: ["o1-pro"]
          },
          headers: (apiKey) => ({
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
          }),
          createRequestBody: (content, model = "gpt-4.1-nano", tem = 0.6, topp = 0.8) => ({
            model: model,
            input: [{
              role: "user",
              content: content
            }],
            temperature: tem,
            top_p: topp
          }),
          createBinaryParts: (prompt, mimeType, base64Data) => [
            {
              type: "input_text",
              text: prompt
            },
            {
              type: "input_image",
              image_url: `data:${mimeType};base64,${base64Data}`
            }
          ],
          responseParser: (response) => {
            if (typeof response === "string") {
              return response;
            }
            if (response?.output?.[0]?.content?.[0]?.text) {
              return response.output[0].content[0].text;
            }
            throw new Error("Invalid response format from OpenAI API");
          }
        },
        mistral: {
          baseUrl: "https://api.mistral.ai/v1/chat/completions",
          models: {
            free: [
              "mistral-small-latest",
              "pixtral-12b-2409"
            ],
            research: [
              "open-mistral-nemo",
              "open-codestral-mamba"
            ],
            premier: [
              "codestral-latest",
              "mistral-large-latest",
              "pixtral-large-latest",
              "mistral-saba-latest",
              "ministral-3b-latest",
              "ministral-8b-latest",
              "mistral-moderation-latest",
              "mistral-ocr-latest"
            ]
          },
          headers: (apiKey) => ({
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }),
          createRequestBody: (content, model = "mistral-small-latest", tem = 0.6, topp = 0.8) => ({
            model: model,
            // max_tokens: 4096,
            messages: [{
              role: "user",
              content: Array.isArray(content) ? content : content
            }],
            temperature: tem,
            top_p: topp
          }),
          createBinaryParts: (prompt, mimeType, base64Data) => [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: `data:${mimeType};base64,${base64Data}`
            }
          ],
          responseParser: (response) => {
            if (typeof response === "string") {
              return response;
            }
            if (response?.choices?.[0]?.message?.content) {
              return response.choices[0].message.content;
            }
            throw new Error((this._("notifications.failed_read_api")));
          }
        },
        puter: {
          models: {
            fast: [
              "claude-3-7-sonnet",
              "claude-3-5-sonnet",
              "gemini-2.0-flash",
              "gemini-1.5-flash",
              "o4-mini",
              "o3-mini",
              "o1-mini",
              "gpt-4.1-mini",
              "gpt-4.1-nano",
              "gpt-4o-mini",
              "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
              "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
              "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
            ],
            balance: [
              "o3",
              "o1",
              "gpt-4.5-preview",
              "gpt-4.1",
              "gpt-4o",
              "grok-beta"
            ],
            pro: [
              "deepseek-chat",
              "deepseek-reasoner",
              "mistral-large-latest",
              "pixtral-large-latest",
              "codestral-latest",
              "google/gemma-2-27b-it",
              "openrouter:01-ai/yi-large",
              "x-ai/grok-3-beta",
              "gpt-4o", "gpt-4o-mini", "o1", "o1-mini", "o1-pro", "o3", "o3-mini", "o4-mini", "gpt-4.1", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-4.5-preview", "claude-3-7-sonnet-20250219", "claude-3-7-sonnet-latest", "claude-3-5-sonnet-20241022", "claude-3-5-sonnet-latest", "claude-3-5-sonnet-20240620", "claude-3-haiku-20240307", "WhereIsAI/UAE-Large-V1", "Qwen/QwQ-32B", "meta-llama/Llama-4-Scout-17B-16E-Instruct", "meta-llama/Llama-Guard-4-12B", "togethercomputer/m2-bert-80M-32k-retrieval", "deepseek-ai/DeepSeek-V3", "google/gemma-2-9b-it", "cartesia/sonic", "BAAI/bge-large-en-v1.5", "black-forest-labs/FLUX.1-schnell-Free", "black-forest-labs/FLUX.1.1-pro", "Qwen/Qwen2.5-7B-Instruct-Turbo", "deepseek-ai/DeepSeek-R1-Distill-Llama-70B-free", "meta-llama-llama-2-70b-hf", "BAAI/bge-base-en-v1.5", "Gryphe/MythoMax-L2-13b", "google/gemma-2-27b-it", "Qwen/Qwen2-VL-72B-Instruct", "meta-llama/LlamaGuard-2-8b", "cartesia/sonic-2", "togethercomputer/m2-bert-80M-8k-retrieval", "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", "Qwen/Qwen3-235B-A22B-fp8-tput", "scb10x/scb10x-llama3-1-typhoon2-70b-instruct", "togethercomputer/MoA-1", "meta-llama/Meta-Llama-3-70B-Instruct-Turbo", "togethercomputer/m2-bert-80M-2k-retrieval", "google/gemma-2b-it", "black-forest-labs/FLUX.1-pro", "meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo", "Gryphe/MythoMax-L2-13b-Lite", "black-forest-labs/FLUX.1-redux", "scb10x/scb10x-llama3-1-typhoon2-8b-instruct", "meta-llama/Meta-Llama-Guard-3-8B", "black-forest-labs/FLUX.1-depth", "black-forest-labs/FLUX.1-canny", "arcee-ai/arcee-blitz", "arcee_ai/arcee-spotlight", "arcee-ai/caller", "arcee-ai/coder-large", "arcee-ai/maestro-reasoning", "arcee-ai/virtuoso-large", "arcee-ai/virtuoso-medium-v2", "mistralai/Mistral-Small-24B-Instruct-2501", "meta-llama/Llama-3-8b-chat-hf", "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8", "togethercomputer/MoA-1-Turbo", "meta-llama/Llama-3.3-70B-Instruct-Turbo", "Qwen/Qwen3-235B-A22B-fp8", "mistralai/Mistral-7B-Instruct-v0.1", "NousResearch/Nous-Hermes-2-Mixtral-8x7B-DPO", "deepseek-ai/DeepSeek-R1-Distill-Llama-70B", "deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B", "meta-llama/Meta-Llama-3-8B-Instruct-Lite", "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo", "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", "mistralai/Mixtral-8x7B-v0.1", "black-forest-labs/FLUX.1-dev-lora", "deepseek-ai/DeepSeek-R1", "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "mistralai/Mistral-7B-Instruct-v0.2", "deepseek-ai/DeepSeek-V3-p-dp", "deepseek-ai/DeepSeek-R1-Distill-Qwen-14B", "Qwen/Qwen2.5-Coder-32B-Instruct", "Qwen/Qwen2-72B-Instruct", "black-forest-labs/FLUX.1-schnell", "mistralai/Mixtral-8x7B-Instruct-v0.1", "meta-llama/Llama-3-70b-chat-hf", "mistralai/Mistral-7B-Instruct-v0.3", "Salesforce/Llama-Rank-V1", "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF", "meta-llama/Llama-Vision-Free", "meta-llama/Llama-Guard-3-11B-Vision-Turbo", "meta-llama/Llama-3.2-3B-Instruct-Turbo", "black-forest-labs/FLUX.1-dev", "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo", "Qwen/Qwen2.5-72B-Instruct-Turbo", "perplexity-ai/r1-1776", "meta-llama/Llama-2-70b-hf", "Qwen/Qwen2.5-VL-72B-Instruct", "model-fallback-test-1", "ministral-3b-2410", "ministral-3b-latest", "ministral-8b-2410", "ministral-8b-latest", "open-mistral-7b", "mistral-tiny", "mistral-tiny-2312", "open-mixtral-8x7b", "mistral-small", "mistral-small-2312", "open-mixtral-8x22b", "open-mixtral-8x22b-2404", "mistral-large-2411", "mistral-large-latest", "pixtral-large-2411", "pixtral-large-latest", "mistral-large-pixtral-2411", "codestral-2501", "codestral-latest", "codestral-2412", "codestral-2411-rc5", "pixtral-12b-2409", "pixtral-12b", "pixtral-12b-latest", "mistral-small-2503", "mistral-small-latest", "grok-beta", "grok-vision-beta", "deepseek-chat", "deepseek-reasoner", "gemini-1.5-flash", "gemini-2.0-flash", "openrouter:nousresearch/deephermes-3-mistral-24b-preview:free", "openrouter:mistralai/mistral-medium-3", "openrouter:google/gemini-2.5-pro-preview", "openrouter:arcee-ai/caller-large", "openrouter:arcee-ai/spotlight", "openrouter:arcee-ai/maestro-reasoning", "openrouter:arcee-ai/virtuoso-large", "openrouter:arcee-ai/coder-large", "openrouter:arcee-ai/virtuoso-medium-v2", "openrouter:arcee-ai/arcee-blitz", "openrouter:microsoft/phi-4-reasoning-plus:free", "openrouter:microsoft/phi-4-reasoning-plus", "openrouter:microsoft/phi-4-reasoning:free", "openrouter:qwen/qwen3-0.6b-04-28:free", "openrouter:inception/mercury-coder-small-beta", "openrouter:qwen/qwen3-1.7b:free", "openrouter:qwen/qwen3-4b:free", "openrouter:opengvlab/internvl3-14b:free", "openrouter:opengvlab/internvl3-2b:free", "openrouter:deepseek/deepseek-prover-v2:free", "openrouter:deepseek/deepseek-prover-v2", "openrouter:meta-llama/llama-guard-4-12b", "openrouter:qwen/qwen3-30b-a3b:free", "openrouter:qwen/qwen3-30b-a3b", "openrouter:qwen/qwen3-8b:free", "openrouter:qwen/qwen3-8b", "openrouter:qwen/qwen3-14b:free", "openrouter:qwen/qwen3-14b", "openrouter:qwen/qwen3-32b:free", "openrouter:qwen/qwen3-32b", "openrouter:qwen/qwen3-235b-a22b:free", "openrouter:qwen/qwen3-235b-a22b", "openrouter:tngtech/deepseek-r1t-chimera:free", "openrouter:thudm/glm-z1-rumination-32b", "openrouter:thudm/glm-z1-9b:free", "openrouter:thudm/glm-4-9b:free", "openrouter:microsoft/mai-ds-r1:free", "openrouter:thudm/glm-z1-32b:free", "openrouter:thudm/glm-z1-32b", "openrouter:thudm/glm-4-32b:free", "openrouter:thudm/glm-4-32b", "openrouter:google/gemini-2.5-flash-preview", "openrouter:google/gemini-2.5-flash-preview:thinking", "openrouter:openai/o4-mini-high", "openrouter:openai/o3", "openrouter:openai/o4-mini", "openrouter:shisa-ai/shisa-v2-llama3.3-70b:free", "openrouter:qwen/qwen2.5-coder-7b-instruct", "openrouter:openai/gpt-4.1", "openrouter:openai/gpt-4.1-mini", "openrouter:openai/gpt-4.1-nano", "openrouter:eleutherai/llemma_7b", "openrouter:alfredpros/codellama-7b-instruct-solidity", "openrouter:arliai/qwq-32b-arliai-rpr-v1:free", "openrouter:agentica-org/deepcoder-14b-preview:free", "openrouter:moonshotai/kimi-vl-a3b-thinking:free", "openrouter:x-ai/grok-3-mini-beta", "openrouter:x-ai/grok-3-beta", "openrouter:nvidia/llama-3.3-nemotron-super-49b-v1:free", "openrouter:nvidia/llama-3.3-nemotron-super-49b-v1", "openrouter:nvidia/llama-3.1-nemotron-ultra-253b-v1:free", "openrouter:meta-llama/llama-4-maverick:free", "openrouter:meta-llama/llama-4-maverick", "openrouter:meta-llama/llama-4-scout:free", "openrouter:meta-llama/llama-4-scout", "openrouter:all-hands/openhands-lm-32b-v0.1", "openrouter:mistral/ministral-8b", "openrouter:deepseek/deepseek-v3-base:free", "openrouter:scb10x/llama3.1-typhoon2-8b-instruct", "openrouter:scb10x/llama3.1-typhoon2-70b-instruct", "openrouter:allenai/molmo-7b-d:free", "openrouter:bytedance-research/ui-tars-72b:free", "openrouter:qwen/qwen2.5-vl-3b-instruct:free", "openrouter:google/gemini-2.5-pro-exp-03-25", "openrouter:qwen/qwen2.5-vl-32b-instruct:free", "openrouter:qwen/qwen2.5-vl-32b-instruct", "openrouter:deepseek/deepseek-chat-v3-0324:free", "openrouter:deepseek/deepseek-chat-v3-0324", "openrouter:featherless/qwerky-72b:free", "openrouter:openai/o1-pro", "openrouter:mistralai/mistral-small-3.1-24b-instruct:free", "openrouter:mistralai/mistral-small-3.1-24b-instruct", "openrouter:open-r1/olympiccoder-32b:free", "openrouter:google/gemma-3-1b-it:free", "openrouter:google/gemma-3-4b-it:free", "openrouter:google/gemma-3-4b-it", "openrouter:ai21/jamba-1.6-large", "openrouter:ai21/jamba-1.6-mini", "openrouter:google/gemma-3-12b-it:free", "openrouter:google/gemma-3-12b-it", "openrouter:cohere/command-a", "openrouter:openai/gpt-4o-mini-search-preview", "openrouter:openai/gpt-4o-search-preview", "openrouter:rekaai/reka-flash-3:free", "openrouter:google/gemma-3-27b-it:free", "openrouter:google/gemma-3-27b-it", "openrouter:thedrummer/anubis-pro-105b-v1", "openrouter:thedrummer/skyfall-36b-v2", "openrouter:microsoft/phi-4-multimodal-instruct", "openrouter:perplexity/sonar-reasoning-pro", "openrouter:perplexity/sonar-pro", "openrouter:perplexity/sonar-deep-research", "openrouter:deepseek/deepseek-r1-zero:free", "openrouter:qwen/qwq-32b:free", "openrouter:qwen/qwq-32b", "openrouter:moonshotai/moonlight-16b-a3b-instruct:free", "openrouter:nousresearch/deephermes-3-llama-3-8b-preview:free", "openrouter:openai/gpt-4.5-preview", "openrouter:google/gemini-2.0-flash-lite-001", "openrouter:anthropic/claude-3.7-sonnet", "openrouter:anthropic/claude-3.7-sonnet:thinking", "openrouter:anthropic/claude-3.7-sonnet:beta", "openrouter:perplexity/r1-1776", "openrouter:mistralai/mistral-saba", "openrouter:cognitivecomputations/dolphin3.0-r1-mistral-24b:free", "openrouter:cognitivecomputations/dolphin3.0-mistral-24b:free", "openrouter:meta-llama/llama-guard-3-8b", "openrouter:openai/o3-mini-high", "openrouter:deepseek/deepseek-r1-distill-llama-8b", "openrouter:google/gemini-2.0-flash-001", "openrouter:qwen/qwen-vl-plus", "openrouter:aion-labs/aion-1.0", "openrouter:aion-labs/aion-1.0-mini", "openrouter:aion-labs/aion-rp-llama-3.1-8b", "openrouter:qwen/qwen-vl-max", "openrouter:qwen/qwen-turbo", "openrouter:qwen/qwen2.5-vl-72b-instruct:free", "openrouter:qwen/qwen2.5-vl-72b-instruct", "openrouter:qwen/qwen-plus", "openrouter:qwen/qwen-max", "openrouter:openai/o3-mini", "openrouter:deepseek/deepseek-r1-distill-qwen-1.5b", "openrouter:mistralai/mistral-small-24b-instruct-2501:free", "openrouter:mistralai/mistral-small-24b-instruct-2501", "openrouter:deepseek/deepseek-r1-distill-qwen-32b:free", "openrouter:deepseek/deepseek-r1-distill-qwen-32b", "openrouter:deepseek/deepseek-r1-distill-qwen-14b:free", "openrouter:deepseek/deepseek-r1-distill-qwen-14b", "openrouter:perplexity/sonar-reasoning", "openrouter:perplexity/sonar", "openrouter:liquid/lfm-7b", "openrouter:liquid/lfm-3b", "openrouter:deepseek/deepseek-r1-distill-llama-70b:free", "openrouter:deepseek/deepseek-r1-distill-llama-70b", "openrouter:deepseek/deepseek-r1:free", "openrouter:deepseek/deepseek-r1", "openrouter:minimax/minimax-01", "openrouter:mistralai/codestral-2501", "openrouter:microsoft/phi-4", "openrouter:deepseek/deepseek-chat:free", "openrouter:deepseek/deepseek-chat", "openrouter:sao10k/l3.3-euryale-70b", "openrouter:openai/o1", "openrouter:eva-unit-01/eva-llama-3.33-70b", "openrouter:x-ai/grok-2-vision-1212", "openrouter:x-ai/grok-2-1212", "openrouter:cohere/command-r7b-12-2024", "openrouter:google/gemini-2.0-flash-exp:free", "openrouter:meta-llama/llama-3.3-70b-instruct:free", "openrouter:meta-llama/llama-3.3-70b-instruct", "openrouter:amazon/nova-lite-v1", "openrouter:amazon/nova-micro-v1", "openrouter:amazon/nova-pro-v1", "openrouter:qwen/qwq-32b-preview:free", "openrouter:qwen/qwq-32b-preview", "openrouter:google/learnlm-1.5-pro-experimental:free", "openrouter:eva-unit-01/eva-qwen-2.5-72b", "openrouter:openai/gpt-4o-2024-11-20", "openrouter:mistralai/mistral-large-2411", "openrouter:mistralai/mistral-large-2407", "openrouter:mistralai/pixtral-large-2411", "openrouter:x-ai/grok-vision-beta", "openrouter:infermatic/mn-inferor-12b", "openrouter:qwen/qwen-2.5-coder-32b-instruct:free", "openrouter:qwen/qwen-2.5-coder-32b-instruct", "openrouter:raifle/sorcererlm-8x22b", "openrouter:eva-unit-01/eva-qwen-2.5-32b", "openrouter:thedrummer/unslopnemo-12b", "openrouter:anthropic/claude-3.5-haiku:beta", "openrouter:anthropic/claude-3.5-haiku", "openrouter:anthropic/claude-3.5-haiku-20241022:beta", "openrouter:anthropic/claude-3.5-haiku-20241022", "openrouter:anthracite-org/magnum-v4-72b", "openrouter:anthropic/claude-3.5-sonnet:beta", "openrouter:anthropic/claude-3.5-sonnet", "openrouter:neversleep/llama-3.1-lumimaid-70b", "openrouter:x-ai/grok-beta", "openrouter:mistralai/ministral-8b", "openrouter:mistralai/ministral-3b", "openrouter:qwen/qwen-2.5-7b-instruct:free", "openrouter:qwen/qwen-2.5-7b-instruct", "openrouter:nvidia/llama-3.1-nemotron-70b-instruct", "openrouter:inflection/inflection-3-productivity", "openrouter:inflection/inflection-3-pi", "openrouter:google/gemini-flash-1.5-8b", "openrouter:thedrummer/rocinante-12b", "openrouter:anthracite-org/magnum-v2-72b", "openrouter:liquid/lfm-40b", "openrouter:meta-llama/llama-3.2-90b-vision-instruct", "openrouter:meta-llama/llama-3.2-1b-instruct:free", "openrouter:meta-llama/llama-3.2-1b-instruct", "openrouter:meta-llama/llama-3.2-3b-instruct:free", "openrouter:meta-llama/llama-3.2-3b-instruct", "openrouter:meta-llama/llama-3.2-11b-vision-instruct:free", "openrouter:meta-llama/llama-3.2-11b-vision-instruct", "openrouter:qwen/qwen-2.5-72b-instruct:free", "openrouter:qwen/qwen-2.5-72b-instruct", "openrouter:neversleep/llama-3.1-lumimaid-8b", "openrouter:openai/o1-preview-2024-09-12", "openrouter:openai/o1-mini", "openrouter:openai/o1-mini-2024-09-12", "openrouter:openai/o1-preview", "openrouter:mistralai/pixtral-12b", "openrouter:cohere/command-r-08-2024", "openrouter:cohere/command-r-plus-08-2024", "openrouter:sao10k/l3.1-euryale-70b", "openrouter:google/gemini-flash-1.5-8b-exp", "openrouter:qwen/qwen-2.5-vl-7b-instruct:free", "openrouter:qwen/qwen-2.5-vl-7b-instruct", "openrouter:microsoft/phi-3.5-mini-128k-instruct", "openrouter:nousresearch/hermes-3-llama-3.1-70b", "openrouter:nousresearch/hermes-3-llama-3.1-405b", "openrouter:openai/chatgpt-4o-latest", "openrouter:aetherwiing/mn-starcannon-12b", "openrouter:sao10k/l3-lunaris-8b", "openrouter:openai/gpt-4o-2024-08-06", "openrouter:meta-llama/llama-3.1-405b:free", "openrouter:meta-llama/llama-3.1-405b", "openrouter:nothingiisreal/mn-celeste-12b", "openrouter:perplexity/llama-3.1-sonar-small-128k-online", "openrouter:perplexity/llama-3.1-sonar-large-128k-online", "openrouter:meta-llama/llama-3.1-8b-instruct:free", "openrouter:meta-llama/llama-3.1-8b-instruct", "openrouter:meta-llama/llama-3.1-70b-instruct", "openrouter:meta-llama/llama-3.1-405b-instruct", "openrouter:mistralai/mistral-nemo:free", "openrouter:mistralai/mistral-nemo", "openrouter:mistralai/codestral-mamba", "openrouter:openai/gpt-4o-mini-2024-07-18", "openrouter:openai/gpt-4o-mini", "openrouter:google/gemma-2-27b-it", "openrouter:alpindale/magnum-72b", "openrouter:google/gemma-2-9b-it:free", "openrouter:google/gemma-2-9b-it", "openrouter:01-ai/yi-large", "openrouter:ai21/jamba-instruct", "openrouter:anthropic/claude-3.5-sonnet-20240620:beta", "openrouter:anthropic/claude-3.5-sonnet-20240620", "openrouter:sao10k/l3-euryale-70b", "openrouter:cognitivecomputations/dolphin-mixtral-8x22b", "openrouter:qwen/qwen-2-72b-instruct", "openrouter:mistralai/mistral-7b-instruct-v0.3", "openrouter:nousresearch/hermes-2-pro-llama-3-8b", "openrouter:mistralai/mistral-7b-instruct:free", "openrouter:mistralai/mistral-7b-instruct", "openrouter:microsoft/phi-3-mini-128k-instruct", "openrouter:microsoft/phi-3-medium-128k-instruct", "openrouter:neversleep/llama-3-lumimaid-70b", "openrouter:google/gemini-flash-1.5", "openrouter:deepseek/deepseek-coder", "openrouter:openai/gpt-4o-2024-05-13", "openrouter:meta-llama/llama-guard-2-8b", "openrouter:openai/gpt-4o", "openrouter:openai/gpt-4o:extended", "openrouter:allenai/olmo-7b-instruct", "openrouter:neversleep/llama-3-lumimaid-8b:extended", "openrouter:neversleep/llama-3-lumimaid-8b", "openrouter:sao10k/fimbulvetr-11b-v2", "openrouter:meta-llama/llama-3-70b-instruct", "openrouter:meta-llama/llama-3-8b-instruct", "openrouter:mistralai/mixtral-8x22b-instruct", "openrouter:microsoft/wizardlm-2-8x22b", "openrouter:openai/gpt-4-turbo", "openrouter:google/gemini-pro-1.5", "openrouter:cohere/command-r-plus", "openrouter:cohere/command-r-plus-04-2024", "openrouter:sophosympatheia/midnight-rose-70b", "openrouter:cohere/command-r", "openrouter:cohere/command", "openrouter:anthropic/claude-3-haiku:beta", "openrouter:anthropic/claude-3-haiku", "openrouter:anthropic/claude-3-sonnet:beta", "openrouter:anthropic/claude-3-sonnet", "openrouter:anthropic/claude-3-opus:beta", "openrouter:anthropic/claude-3-opus", "openrouter:cohere/command-r-03-2024", "openrouter:mistralai/mistral-large", "openrouter:openai/gpt-4-turbo-preview", "openrouter:openai/gpt-3.5-turbo-0613", "openrouter:nousresearch/nous-hermes-2-mixtral-8x7b-dpo", "openrouter:mistralai/mistral-tiny", "openrouter:mistralai/mistral-small", "openrouter:mistralai/mistral-medium", "openrouter:mistralai/mistral-7b-instruct-v0.2", "openrouter:mistralai/mixtral-8x7b-instruct", "openrouter:neversleep/noromaid-20b", "openrouter:anthropic/claude-2.1:beta", "openrouter:anthropic/claude-2.1", "openrouter:anthropic/claude-2:beta", "openrouter:anthropic/claude-2", "openrouter:undi95/toppy-m-7b", "openrouter:alpindale/goliath-120b", "openrouter:openrouter/auto", "openrouter:openai/gpt-4-1106-preview", "openrouter:openai/gpt-3.5-turbo-1106", "openrouter:jondurbin/airoboros-l2-70b", "openrouter:mistralai/mistral-7b-instruct-v0.1", "openrouter:openai/gpt-3.5-turbo-instruct", "openrouter:pygmalionai/mythalion-13b", "openrouter:openai/gpt-3.5-turbo-16k", "openrouter:openai/gpt-4-32k-0314", "openrouter:openai/gpt-4-32k", "openrouter:mancer/weaver", "openrouter:anthropic/claude-2.0:beta", "openrouter:anthropic/claude-2.0", "openrouter:undi95/remm-slerp-l2-13b", "openrouter:gryphe/mythomax-l2-13b", "openrouter:meta-llama/llama-2-70b-chat", "openrouter:openai/gpt-4", "openrouter:openai/gpt-3.5-turbo-0125", "openrouter:openai/gpt-3.5-turbo", "openrouter:openai/gpt-4-0314", "fake", "costly", "abuse"
            ]
          },
          chat: async (content, options = {}) => {
            try {
              return await puter.ai.chat(content, {
                model: options.model || "gpt-4o-mini",
                ...options
              });
            } catch (error) {
              console.error("Puter Chat API error:", error);
              throw error;
            }
          },
          vision: async (prompt, base64Image, test = false, options = {}) => {
            try {
              return await puter.ai.chat(prompt, base64Image, test, {
                model: options.model || "gpt-4o-mini",
                ...options
              });
            } catch (error) {
              console.error("Puter Vision API error:", error);
              throw error;
            }
          },
          responseParser: (response) => {
            if (typeof response === "string") {
              return response;
            } else if (typeof response.text === "string") {
              return response.text;
            } else if (typeof response.message.content === "string") {
              return response.message.content;
            } else if (response?.message?.content?.[0]?.text) {
              return response.message.content[0].text;
            }
            throw new Error((this._("notifications.failed_read_api")));
          }
        }
      },
      currentProvider: "gemini",
      apiKey: {
        gemini: [""],
        perplexity: [""],
        claude: [""],
        openai: [""],
        mistral: [""]
      },
      currentKeyIndex: {
        gemini: 0,
        perplexity: 0,
        claude: 0,
        openai: 0,
        mistral: 0
      },
      maxRetries: 3,
      retryDelay: 1000
    },
    LANG_DATA: {
      vi: {
        script_name: "King Translator AI",
        auto_detect: "Tự động phát hiện",
        settings: {
          title: "Cài đặt King Translator AI",
          interface_section: "GIAO DIỆN",
          theme_mode: "Chế độ giao diện:",
          light: "Sáng",
          dark: "Tối",
          ui_language: "Ngôn ngữ giao diện:",
          api_provider_section: "API PROVIDER",
          api_model_section: "API MODEL",
          api_keys_section: "API KEYS",
          model_type: "Sử dụng loại model:",
          fast: "Nhanh",
          balance: "Cân bằng",
          pro: "Pro",
          think: "Suy luận",
          custom: "Tùy chỉnh",
          model_label: "Model",
          custom_model_placeholder: "Nhập tên model",
          add_key: "+ Thêm {provider} Key",
          account_puter: "ACCOUNT PUTER",
          sign_in: "Sign in",
          sign_out: "Sign out",
          input_translation_section: "DỊCH KHI VIẾT",
          enable_feature: "Bật tính năng:",
          save_position: "Lưu vị trí khi di chuyển:",
          tools_section: "TOOLS DỊCH ⚙️",
          enable_tools: "Bật tính năng:",
          enable_tools_current_web: "Chỉ bật/tắt ở web này:",
          page_translation_section: "DỊCH TOÀN TRANG",
          enable_page_translation: "Bật tính năng dịch trang:",
          show_initial_button: "Hiện nút dịch 10s đầu:",
          auto_translate_page: "Tự động dịch trang:",
          custom_selectors: "Tùy chỉnh Selectors loại trừ:",
          exclude_selectors: "Selectors loại trừ:",
          one_selector_per_line: "Hãy nhập mỗi selector một dòng!",
          default_selectors: "Selectors mặc định:",
          default_selectors_info: "Đây là danh sách selectors mặc định sẽ được sử dụng khi tắt tùy chỉnh.",
          combine_with_default: "Kết hợp với mặc định:",
          combine_with_default_info: "Nếu bật, selectors tùy chỉnh sẽ được thêm vào danh sách mặc định thay vì thay thế hoàn toàn.",
          temperature: "Temperature:",
          top_p: "Top P:",
          top_k: "Top K:",
          prompt_settings_section: "TÙY CHỈNH PROMPT",
          use_custom_prompt: "Sử dụng prompt tùy chỉnh:",
          prompt_normal: "Prompt dịch thường (nhanh + popup):",
          prompt_normal_chinese: "Prompt dịch thường (nhanh + popup)(Phiên âm):",
          prompt_advanced: "Prompt dịch nâng cao:",
          prompt_advanced_chinese: "Prompt dịch nâng cao (Phiên âm):",
          prompt_ocr: "Prompt OCR:",
          prompt_ocr_chinese: "Prompt OCR (Phiên âm):",
          prompt_media: "Prompt Media:",
          prompt_media_chinese: "Prompt Media (Phiên âm):",
          prompt_page: "Prompt dịch trang:",
          prompt_page_chinese: "Prompt dịch trang (Phiên âm):",
          prompt_file_content: "Prompt dịch File (multimodal):",
          prompt_file_content_chinese: "Prompt dịch File (multimodal) (Phiên âm):",
          enable_google_translate_page: "Bật dịch trang với Google Translate:",
          google_translate_layout: "Kiểu hiển thị của Google Translate:",
          google_translate_minimal: "Tối giản (chỉ thanh ngữ cảnh)",
          google_translate_inline: "Nội tuyến (tự động)",
          google_translate_selected: "Phân tích và dịch",
          prompt_vars_info: "Các biến có thể sử dụng trong prompt:",
          prompt_var_text: "{text} - Văn bản cần dịch",
          prompt_var_doc_title: "{docTitle} - Tiêu đề trang web",
          prompt_var_target_lang: "{targetLang} - Ngôn ngữ đích",
          prompt_var_source_lang: "{sourceLang} - Ngôn ngữ nguồn (nếu có)",
          prompt_notes: "Lưu ý:",
          prompt_notes_required: "Tham số bắt buộc phải sử dụng: {text} để có thể thay văn bản cần dịch vào prompt gửi cho AI.",
          prompt_note_en: "Khi nhập tuỳ chỉnh cho phiên âm hãy yêu cầu nó trả về theo định dạng sau: Bản gốc <|> Phiên âm IPA <|> Bản dịch. Ví dụ: Hello <|> heˈloʊ <|> Xin chào.",
          prompt_note_zh: "Nếu có từ là tiếng Trung, hãy trả về giá trị phiên âm của từ đó chính là pinyin + số tone (1-4) của từ đó. Ví dụ: 你好 <|> Nǐ3 hǎo3 <|> Xin chào.",
          ocr_section: "DỊCH VĂN BẢN TRONG ẢNH",
          enable_ocr: "Bật OCR dịch:",
          media_section: "DỊCH MEDIA",
          enable_media: "Bật dịch Media:",
          video_streaming_section: "DỊCH PHỤ ĐỀ VIDEO TRỰC TUYẾN",
          enable_video_streaming: "Bật tính năng:",
          font_size: "Cỡ chữ:",
          background_color: "Màu nền:",
          text_color: "Màu chữ:",
          display_section: "HIỂN THỊ",
          display_mode: "Chế độ hiển thị:",
          translation_only: "Chỉ hiện bản dịch",
          parallel: "Song song văn bản gốc và bản dịch",
          language_learning: "Chế độ học ngôn ngữ",
          show_source: "Hiện bản gốc:",
          source_language: "Ngôn ngữ nguồn:",
          target_language: "Ngôn ngữ đích:",
          web_image_font_size: "Cỡ chữ dịch manga web:",
          popup_font_size: "Cỡ chữ dịch popup:",
          min_popup_width: "Độ rộng tối thiểu (popup):",
          max_popup_width: "Độ rộng tối đa (popup):",
          tts_section: "TEXT TO SPEECH",
          enable_tts: "Bật TTS:",
          tts_source: "Nguồn TTS:",
          default_voice: "Giọng đọc mặc định:",
          voice: "Giọng đọc:",
          speed: "Tốc độ mặc định:",
          pitch: "Cao độ mặc định:",
          volume: "Âm lượng mặc định:",
          context_menu_section: "CONTEXT MENU",
          enable_context_menu: "Bật Context Menu:",
          shortcuts_section: "PHÍM TẮT",
          enable_settings_shortcut: "Bật phím tắt mở cài đặt:",
          enable_translation_shortcuts: "Bật phím tắt dịch:",
          page_translate_shortcut: "Dịch trang:",
          input_translate_shortcut: "Dịch text trong hộp nhập:",
          quick_translate_shortcut: "Dịch nhanh",
          popup_translate_shortcut: "Dịch popup",
          advanced_translate_shortcut: "Dịch nâng cao",
          button_options_section: "NÚT DỊCH",
          enable_translation_button: "Bật nút dịch:",
          single_click: "Nhấp đơn:",
          double_click: "Nhấp đúp:",
          hold_button: "Giữ nút:",
          touch_options_section: "CẢM ỨNG ĐA ĐIỂM",
          enable_touch: "Bật cảm ứng:",
          two_fingers: "Hai ngón tay:",
          three_fingers: "Ba ngón tay:",
          sensitivity: "Độ nhạy (ms):",
          rate_limit_section: "RATE LIMIT",
          max_requests: "Số yêu cầu tối đa:",
          per_milliseconds: "Thời gian chờ (ms):",
          cache_section: "CACHE",
          text_cache: "Text Cache",
          enable_text_cache: "Bật cache text:",
          text_cache_max_size: "Kích thước cache text:",
          text_cache_expiration: "Thời gian cache text (ms):",
          image_cache: "Image Cache",
          enable_image_cache: "Bật cache ảnh:",
          image_cache_max_size: "Kích thước cache ảnh:",
          image_cache_expiration: "Thời gian cache ảnh (ms):",
          media_cache: "Media Cache",
          enable_media_cache: "Bật cache media:",
          media_cache_max_size: "Media cache entries:",
          media_cache_expiration: "Thời gian expire (giây):",
          backup_settings_section: "SAO LƯU CÀI ĐẶT",
          export_settings: "Xuất cài đặt",
          import_settings: "Nhập cài đặt",
          cancel: "Hủy",
          save: "Lưu",
        },
        notifications: {
          export_success: "Export settings thành công",
          export_error: "Lỗi export settings",
          invalid_settings_file: "File settings không hợp lệ",
          invalid_settings_format: "Format settings không hợp lệ",
          invalid_settings: "Settings không hợp lệ",
          decompression_error: "Không thể giải nén settings",
          import_success: "Import settings thành công",
          import_error: "Lỗi import:",
          no_api_key_configured: "Không có API key nào được cấu hình",
          no_api_key_available: "Không có API key khả dụng. Vui lòng kiểm tra lại API key trong cài đặt.",
          all_keys_failed: "Tất cả API key đều thất bại:\n",
          invalid_api_key: "API key {key_prefix}... không hợp lệ",
          rate_limited_api_key: "API key {key_prefix}... đã vượt quá giới hạn",
          other_api_error: "Lỗi với API key {key_prefix}...: {error_message}",
          rate_limited_info: "API key {key_prefix}... đang bị giới hạn. Thử lại sau {time_left}s",
          too_many_requests: "API key {key_prefix}... đang xử lý quá nhiều yêu cầu",
          network_error: "Lỗi kết nối mạng",
          api_response_parse_error: "Không thể xử lý phản hồi từ API",
          unknown_api_error: "Lỗi API không xác định",
          unsupported_provider: "Provider không hợp lệ:",
          key_error: "Key {key_prefix}... lỗi: {error_message}",
          translation_error: "Lỗi dịch:",
          screen_capture_error: "Lỗi chụp màn hình:",
          no_content_in_selection: "Vùng được chọn không có nội dung",
          invalid_image_file: "Không thể tạo ảnh hợp lệ",
          cannot_identify_region: "Không thể xác định vùng chọn",
          image_load_error: "Không thể load ảnh",
          canvas_security_error: "Canvas chứa nội dung từ domain khác không thể được truy cập",
          cannot_capture_element: "Không thể capture nội dung từ element",
          cannot_capture_screen: "Không thể chụp màn hình",
          cannot_generate_valid: "Không thể tạo ảnh hợp lệ",
          invalid_screenshot: "Ảnh chụp không hợp lệ",
          screenshot_cancel: "Đã hủy chọn vùng",
          processing_image: "Đang xử lý ảnh...",
          checking_cache: "Đang kiểm tra cache...",
          found_in_cache: "Đã tìm thấy trong cache",
          detecting_text: "Đang nhận diện text...",
          completed: "Hoàn thành",
          unsupported_file_format: "Định dạng file không được hỗ trợ",
          file_too_large: "File quá lớn.",
          processing_media: "Đang xử lý media...",
          processing_audio_video: "Đang xử lý audio/video...",
          translating: "Đang dịch...",
          finalizing: "Đang hoàn thiện...",
          cannot_process_media: "Không thể xử lý media",
          media_file_error: "Không thể xử lý file:",
          caption_enable_error: "Lỗi khi bật caption:",
          cc_button_not_found: "Không tìm thấy nút CC",
          cc_enabled: "Đã bật CC",
          cc_error: "Lỗi khi bật CC",
          caption_menu_opened: "Đã mở menu phụ đề",
          failed_player_response: "Failed to get playerResponse",
          no_caption_tracks: "No caption tracks found",
          no_caption_track_url: "Could not find caption track URL",
          selected_track: "Selected track:",
          auto_generated: "(auto-generated)",
          no_valid_text_extracted: "Transcript events found, but no valid text content could be extracted.",
          no_video_found: "No video found",
          no_transcript_found: "No transcript found",
          process_frame_error: "Lỗi processVideoFrame:",
          caption_translation_error: "Lỗi dịch caption",
          chunk_translation_error: "Lỗi dịch chunk:",
          translating_part: "Đang dịch phần ",
          upcoming_captions_error: "Lỗi translateUpcomingCaptions:",
          tried_n_times_original_text: "Đã thử {n} lần, trả về text gốc",
          live_caption_off: "Tắt dịch phụ đề video",
          live_caption_on: "Bật dịch phụ đề video",
          live_caption_off2: "Đã tắt dịch phụ đề video",
          live_caption_on2: "Đã bật dịch phụ đề video",
          video_container_not_found: "Không tìm thấy container video phù hợp",
          page_translation_disabled: "Tính năng dịch trang đang bị tắt",
          auto_translate_disabled: "Tự động dịch đang tắt",
          page_already_target_lang: "Trang web đã ở ngôn ngữ",
          language_detected: "Đã phát hiện ngôn ngữ: {language} (độ tin cậy: {confidence}%)",
          page_translated_partial: "Đã dịch trang ({failed_count} phần bị lỗi)",
          page_translated_success: "Đã dịch xong trang",
          page_reverted_to_original: "Đã chuyển về văn bản gốc",
          no_content_to_translate: "Không tìm thấy nội dung cần dịch",
          html_translation_error: "Lỗi dịch HTML:",
          pdf_translation_error: "Lỗi dịch PDF:",
          node_update_error: "Node update error:",
          invalid_selector: "Invalid selector:",
          dom_update_error: "DOM update error:",
          response_parse_error: "Lỗi parse response:",
          request_failed: "Request failed:",
          no_content_for_lang_detect: "Không tìm thấy nội dung để phát hiện ngôn ngữ",
          backup_lang_detect_failed: "Backup language detection failed:",
          file_processing_error: "Lỗi xử lý tệp",
          json_processing_error: "Lỗi xử lý JSON",
          subtitle_processing_error: "Lỗi xử lý phụ đề",
          file_translation_error: "Lỗi dịch file:",
          copied: "Đã sao chép!",
          no_text_selected: "Chưa có văn bản nào được chọn",
          no_target_element: "Không tìm thấy phần tử đích",
          translator_instance_not_found: "Không tìm thấy đối tượng Translator",
          browser_tts_not_supported: "Trình duyệt không hỗ trợ TTS",
          tts_playback_error: "Lỗi phát âm",
          audio_playback_error: "Lỗi phát âm thanh:",
          gtranslate_tts_error: "Lỗi Google Translate TTS:",
          google_tts_api_error: "Lỗi Google TTS API:",
          openai_tts_error: "Lỗi OpenAI TTS:",
          invalid_response_format: "Invalid response format",
          no_response_from_api: "No response from API",
          text_detection_error: "Text detection error:",
          no_blob_created: "Không thể tạo blob",
          page_translate_loading: "Đang dịch trang...",
          processing_pdf: "Đang xử lý PDF...",
          html_file_translated_success: "Dịch file HTML thành công",
          pdf_translated_success: "Dịch PDF thành công",
          file_translated_success: "Dịch file thành công",
          file_input_title: "Chọn loại file hoặc url để dịch",
          processing: "Đang xử lý...",
          unknown_error: "Lỗi không xác định",
          rate_limit_wait: "Vui lòng chờ giữa các lần dịch",
          auth_error: "Lỗi xác thực API",
          generic_translation_error: "Lỗi dịch thuật:",
          ocr_click_guide: "Click vào ảnh để OCR",
          manga_click_guide: "Click vào ảnh để dịch manga",
          manga_font_size_small: "nhỏ",
          manga_font_size_medium: "trung bình",
          manga_font_size_large: "lớn",
          tts_settings: "Cài đặt TTS",
          tts_lang_no_voice: "Không có giọng đọc cho ngôn ngữ",
          ui_language: "Ngôn ngữ giao diện:",
          ui_language_info: "Thay đổi ngôn ngữ của giao diện người dùng userscript.",
          translation_tool_on: "Đã bật công cụ dịch",
          translation_tool_off: "Đã tắt công cụ dịch",
          page_translate_menu_label: "Dịch Trang",
          ocr_region_menu_label: "Dịch Vùng OCR",
          web_image_ocr_menu_label: "Dịch Ảnh Web",
          manga_web_menu_label: "Dịch Manga Web",
          image_file_menu_label: "Dịch File Ảnh",
          media_file_menu_label: "Dịch File Media",
          html_file_menu_label: "Dịch File HTML",
          pdf_file_menu_label: "Dịch File PDF",
          generic_file_menu_label: "Dịch File",
          original_label: "Bản gốc",
          ipa_label: "Phiên âm",
          translation_label: "Bản dịch",
          original: "[GỐC]",
          ipa: "[IPA]",
          translation: "[DỊCH]",
          translate: "Dịch",
          settings: "Cài đặt King AI",
          source_trans: "Dịch sang ngôn ngữ nguồn",
          target_trans: "Dịch sang ngôn ngữ đích",
          cap_gui: "Chạm và kéo để chọn vùng cần dịch",
          failed_read_file: "Không thể đọc file",
          failed_read_api: "Không thể đọc kết quả từ API",
          found_new_ele: "Tìm thấy video element mới:",
          stop_cap: "Đã dừng dịch phụ đề",
          found_video: "Tìm thấy container video:",
          lang_detect: "Phát hiện ngôn ngữ",
          reliability: "Độ tin cậy",
          upl_url: "Không tạo được URL từ tệp đã tải lên",
          upl_uri: "Không nhận được file URI",
          upl_fail: "Tải lên thất bại",
          uns_format: "Định dạng không được hỗ trợ",
          switch_layout: "Chuyển đổi layout ngang dọc",
          switch_layout_ver: "Chuyển đổi layout sang dọc",
          switch_layout_hor: "Chuyển đổi layout sang ngang",
          device_tts: "TTS của Thiết bị",
          un_pr_screen: "Không thể xử lý ảnh chụp màn hình",
          un_cr_screen: "Không thể tạo ảnh chụp màn hình",
          play_tts: "Đọc văn bản",
          stop_tts: "Dừng đọc",
          unsupport_file: "Định dạng file không được hỗ trợ. Chỉ hỗ trợ:",
          close_popup: "Đóng popup",
          generic_file_gemini_menu_label: "Dịch VIP",
          only_gemini: "Tính năng này chỉ hỗ trợ API Gemini. Vui lòng chọn Gemini làm API Provider trong cài đặt.",
          file_input_url_title: "Nhập URL file để dịch",
          file_input_url_placeholder: "Dán URL file vào đây",
          invalid_url_format: "Định dạng URL không hợp lệ. Vui lòng nhập URL hợp lệ (bắt đầu bằng http:// hoặc https://).", // Thêm dòng này
          processing_url: "Đang xử lý URL...",
          unsupport_file_url_provider: "API Provider này không hỗ trợ trực tiếp URL file. Vui lòng chọn Gemini hoặc Puter.",
          google_translate_page_menu_label: "Google Dịch (Page)",
          google_translate_enabled: "Đã bật dịch trang với Google Translate.",
          google_translate_already_active: "Google Translate đang hoạt động. Vui lòng làm mới trang để tắt.",
          revert_google_translate_label: "Tắt dịch Google",
          google_translate_unsupported: "Google Translate không hỗ trợ trên trang này.",
          reload_page_label: "Tải lại trang",
          not_find_video: "Không tìm thấy video nào đang phát sau 5 phút",
          get_transcript_error: "Lỗi khi lấy bản chép lời YouTube:",
          get_transcript_error_generic: "Không thể lấy được bản chép lời từ YouTube sau nhiều lần thử.",
          get_transcript_error_suggestion1: "Gợi ý 1: Vui lòng thử tải lại (F5) trang này.",
          get_transcript_error_suggestion2: "Gợi ý 2: Nếu vẫn lỗi, hãy thử xóa cookie và dữ liệu trang web cho YouTube.",
        },
      },
      en: {
        script_name: "King Translator AI",
        auto_detect: "Auto-detect",
        settings: {
          title: "King Translator AI Settings",
          interface_section: "INTERFACE",
          theme_mode: "Theme Mode:",
          light: "Light",
          dark: "Dark",
          ui_language: "Interface Language:",
          api_provider_section: "API PROVIDER",
          api_model_section: "API MODEL",
          api_keys_section: "API KEYS",
          model_type: "Select Model Type:",
          fast: "Fast",
          balance: "Balance",
          pro: "Pro",
          think: "Think",
          custom: "Custom",
          model_label: "Model",
          custom_model_placeholder: "Enter custom model name",
          add_key: "+ Add {provider} Key",
          account_puter: "PUTER ACCOUNT",
          sign_in: "Sign In",
          sign_out: "Sign Out",
          input_translation_section: "INPUT TRANSLATION",
          enable_feature: "Enable Feature:",
          save_position: "Save position when moved:",
          tools_section: "TRANSLATOR TOOLS ⚙️",
          enable_tools: "Enable Tools:",
          enable_tools_current_web: "Enable/Disable on this website only:",
          page_translation_section: "PAGE TRANSLATION",
          enable_page_translation: "Enable Page Translation:",
          show_initial_button: "Show translate button for 10s:",
          auto_translate_page: "Auto-translate page:",
          custom_selectors: "Custom Exclusion Selectors:",
          exclude_selectors: "Exclusion Selectors:",
          one_selector_per_line: "Enter each selector on a new line!",
          default_selectors: "Default Selectors:",
          default_selectors_info: "These are the default selectors used when custom selectors are disabled.",
          combine_with_default: "Combine with Default:",
          combine_with_default_info: "If enabled, custom selectors will be added to the default list instead of replacing them completely.",
          temperature: "Temperature:",
          top_p: "Top P:",
          top_k: "Top K:",
          prompt_settings_section: "CUSTOM PROMPTS",
          use_custom_prompt: "Use Custom Prompts:",
          prompt_normal: "Normal Translation Prompt (quick + popup):",
          prompt_normal_chinese: "Normal Translation Prompt (quick + popup)(IPA):",
          prompt_advanced: "Advanced Translation Prompt:",
          prompt_advanced_chinese: "Advanced Translation Prompt (IPA):",
          prompt_ocr: "OCR Prompt:",
          prompt_ocr_chinese: "OCR Prompt (IPA):",
          prompt_media: "Media Prompt:",
          prompt_media_chinese: "Media Prompt (IPA):",
          prompt_page: "Page Translation Prompt:",
          prompt_page_chinese: "Page Translation Prompt (IPA):",
          prompt_file_content: "File Translation Prompt (multimodal):",
          prompt_file_content_chinese: "File Translation Prompt (multimodal) (IPA):",
          enable_google_translate_page: "Enable Page Translate with Google Translate:",
          google_translate_layout: "Google Translate Display Layout:",
          google_translate_minimal: "Minimal (Context Bar Only)",
          google_translate_inline: "Inline (Automatic)",
          google_translate_selected: "Analyze and Translate",
          prompt_vars_info: "Available variables in prompts:",
          prompt_var_text: "{text} - Text to be translated",
          prompt_var_doc_title: "{docTitle} - Document Title",
          prompt_var_target_lang: "{targetLang} - Target Language",
          prompt_var_source_lang: "{sourceLang} - Source Language (if available)",
          prompt_notes: "Note:",
          prompt_notes_required: "The required parameter must use: {text} to allow the text to be translated to be substituted into the AI prompt.",
          prompt_note_en: "When providing custom phonetic input, request output in the following format: Original <|> IPA Transcription <|> Translation. For example: Hello <|> heˈloʊ <|> Xin chào.",
          prompt_note_zh: "For Chinese words, return its phonetic transcription as Pinyin + its tone number (1-4). For example: 你好 <|> Nǐ3 hǎo3 <|> Xin chào.",
          ocr_section: "IMAGE TEXT TRANSLATION (OCR)",
          enable_ocr: "Enable OCR Translation:",
          media_section: "MEDIA TRANSLATION",
          enable_media: "Enable Media Translation:",
          video_streaming_section: "LIVE VIDEO SUBTITLE TRANSLATION",
          enable_video_streaming: "Enable Feature:",
          font_size: "Font Size:",
          background_color: "Background Color:",
          text_color: "Text Color:",
          display_section: "DISPLAY",
          display_mode: "Display Mode:",
          translation_only: "Translation Only",
          parallel: "Parallel Original and Translated Text",
          language_learning: "Language Learning Mode",
          show_source: "Show Original:",
          source_language: "Source Language:",
          target_language: "Target Language:",
          web_image_font_size: "Web Manga Translation Font Size:",
          popup_font_size: "Popup Font Size:",
          min_popup_width: "Minimum Popup Width:",
          max_popup_width: "Maximum Popup Width:",
          tts_section: "TEXT TO SPEECH",
          enable_tts: "Enable TTS:",
          tts_source: "TTS Source:",
          default_voice: "Default Voice:",
          voice: "Voice:",
          speed: "Default Speed:",
          pitch: "Default Pitch:",
          volume: "Default Volume:",
          context_menu_section: "CONTEXT MENU",
          enable_context_menu: "Enable Context Menu:",
          shortcuts_section: "SHORTCUTS",
          enable_settings_shortcut: "Enable Settings Shortcut:",
          enable_translation_shortcuts: "Enable Translation Shortcuts:",
          page_translate_shortcut: "Page Translate:",
          input_translate_shortcut: "Input Text Translate:",
          quick_translate_shortcut: "Quick Translate",
          popup_translate_shortcut: "Popup Translate",
          advanced_translate_shortcut: "Advanced Translate",
          button_options_section: "TRANSLATION BUTTON",
          enable_translation_button: "Enable Translation Button:",
          single_click: "Single Click:",
          double_click: "Double Click:",
          hold_button: "Hold Button:",
          touch_options_section: "MULTI-TOUCH",
          enable_touch: "Enable Touch:",
          two_fingers: "Two Fingers:",
          three_fingers: "Three Fingers:",
          sensitivity: "Sensitivity (ms):",
          rate_limit_section: "RATE LIMIT",
          max_requests: "Max Requests:",
          per_milliseconds: "Time Period (ms):",
          cache_section: "CACHE",
          text_cache: "Text Cache",
          enable_text_cache: "Enable Text Cache:",
          text_cache_max_size: "Text Cache Size:",
          text_cache_expiration: "Text Cache Expiration (ms):",
          image_cache: "Image Cache",
          enable_image_cache: "Enable Image Cache:",
          image_cache_max_size: "Image Cache Size:",
          image_cache_expiration: "Image Cache Expiration (ms):",
          media_cache: "Media Cache",
          enable_media_cache: "Enable Media Cache:",
          media_cache_max_size: "Media Cache Entries:",
          media_cache_expiration: "Expiration Time (seconds):",
          backup_settings_section: "SETTINGS BACKUP",
          export_settings: "Export Settings",
          import_settings: "Import Settings",
          cancel: "Cancel",
          save: "Save",
        },
        notifications: {
          export_success: "Settings exported successfully",
          export_error: "Error exporting settings",
          invalid_settings_file: "Invalid settings file",
          invalid_settings_format: "Invalid settings format",
          invalid_settings: "Invalid settings",
          decompression_error: "Could not decompress settings",
          import_success: "Settings imported successfully",
          import_error: "Import error:",
          no_api_key_configured: "No API key configured",
          no_api_key_available: "No available API keys. Please check API keys in settings.",
          all_keys_failed: "All API keys failed:\n",
          invalid_api_key: "API key {key_prefix}... is invalid",
          rate_limited_api_key: "API key {key_prefix}... exceeded rate limit",
          other_api_error: "Error with API key {key_prefix}...: {error_message}",
          rate_limited_info: "API key {key_prefix}... is rate-limited. Retrying in {time_left}s",
          too_many_requests: "is handling too many requests",
          network_error: "Network connection error",
          api_response_parse_error: "Could not process API response",
          unknown_api_error: "Unknown API error",
          unsupported_provider: "Invalid provider:",
          key_error: "Key {key_prefix}... error: {error_message}",
          translation_error: "Translation error:",
          screen_capture_error: "Screen capture error:",
          no_content_in_selection: "Selected area has no content",
          invalid_image_file: "Could not create valid image",
          cannot_identify_region: "Could not identify selection region",
          image_load_error: "Could not load image",
          canvas_security_error: "Canvas contains cross-origin content that cannot be accessed",
          cannot_capture_element: "Could not capture content from element",
          cannot_capture_screen: "Không thể chụp màn hình: ",
          cannot_generate_valid: "Failed to generate valid image",
          invalid_screenshot: "Invalid screenshot",
          screenshot_cancel: "Selection cancelled",
          processing_image: "Processing image...",
          checking_cache: "Checking cache...",
          found_in_cache: "Found in cache",
          detecting_text: "Detecting text...",
          completed: "Completed",
          unsupported_file_format: "Unsupported file format",
          file_too_large: "File is too large.",
          processing_media: "Processing media...",
          processing_audio_video: "Processing audio/video...",
          translating: "Translating...",
          finalizing: "Finalizing...",
          cannot_process_media: "Could not process media",
          media_file_error: "Could not process file: {error_message}",
          caption_enable_error: "Error enabling captions:",
          cc_button_not_found: "CC button not found",
          cc_enabled: "CC enabled",
          cc_error: "Error enabling CC",
          caption_menu_opened: "Subtitle menu opened",
          failed_player_response: "Failed to get playerResponse",
          no_caption_tracks: "No caption tracks found",
          no_caption_track_url: "Could not find caption track URL",
          selected_track: "Selected track:",
          auto_generated: "(auto-generated)",
          no_valid_text_extracted: "Transcript events found, but no valid text content could be extracted.",
          no_video_found: "No video found",
          no_transcript_found: "No transcript found",
          process_frame_error: "Error processing video frame:",
          caption_translation_error: "Error translating caption",
          chunk_translation_error: "Error translating chunk:",
          translating_part: "Translating part ",
          upcoming_captions_error: "Error translating upcoming captions:",
          tried_n_times_original_text: "Tried {n} times, returning original text",
          live_caption_off: "Turn off translated subtitles",
          live_caption_on: "Turn on translated subtitles",
          live_caption_off2: "Video subtitle translation disabled",
          live_caption_on2: "Video subtitle translation enabled",
          video_container_not_found: "No suitable video container found",
          page_translation_disabled: "Page translation feature is disabled",
          auto_translate_disabled: "Auto-translate is off",
          page_already_target_lang: "Page is already in",
          language_detected: "Language detected: {language} (confidence: {confidence}%)",
          page_translated_partial: "Page translated ({failed_count} parts failed)",
          page_translated_success: "Page translated successfully",
          page_reverted_to_original: "Reverted to original text",
          no_content_to_translate: "No content found to translate",
          html_translation_error: "HTML file translation error:",
          pdf_translation_error: "PDF translation error:",
          node_update_error: "Node update error:",
          invalid_selector: "Invalid selector:",
          dom_update_error: "DOM update error:",
          response_parse_error: "Response parse error:",
          request_failed: "Request failed:",
          no_content_for_lang_detect: "No content found for language detection",
          backup_lang_detect_failed: "Backup language detection failed:",
          file_processing_error: "File processing error",
          json_processing_error: "JSON processing error",
          subtitle_processing_error: "Subtitle processing error",
          file_translation_error: "File translation error:",
          copied: "Copied!",
          no_text_selected: "No text selected",
          no_target_element: "No target element found",
          translator_instance_not_found: "Translator instance not found",
          browser_tts_not_supported: "Browser TTS not supported",
          tts_playback_error: "Playback error",
          audio_playback_error: "Audio playback error:",
          gtranslate_tts_error: "Google Translate TTS error:",
          google_tts_api_error: "Google TTS API error:",
          openai_tts_error: "OpenAI TTS error:",
          invalid_response_format: "Invalid response format",
          no_response_from_api: "No response from API",
          text_detection_error: "Text detection error:",
          no_blob_created: "Could not create blob",
          page_translate_loading: "Translating page...",
          processing_pdf: "Processing PDF...",
          html_file_translated_success: "HTML file translated successfully",
          pdf_translated_success: "PDF translated successfully",
          file_translated_success: "File translated successfully",
          file_input_title: "Select file or url to translate",
          processing: "Processing...",
          unknown_error: "Unknown error",
          rate_limit_wait: "Please wait between translations",
          auth_error: "API authentication error",
          generic_translation_error: "Translation error:",
          ocr_click_guide: "Click image to OCR",
          manga_click_guide: "Click image to translate manga",
          manga_font_size_small: "small",
          manga_font_size_medium: "medium",
          manga_font_size_large: "large",
          tts_settings: "TTS Settings",
          tts_lang_no_voice: "No voice available for",
          ui_language: "UI Language:",
          ui_language_info: "Change the userscript's user interface language.",
          translation_tool_on: "Translation tool has been turned on",
          translation_tool_off: "Translation tool has been turned off",
          page_translate_menu_label: "Webpage Trans",
          ocr_region_menu_label: "OCR Region Trans",
          web_image_ocr_menu_label: "Web Image Trans",
          manga_web_menu_label: "Manga Web Trans",
          image_file_menu_label: "Image File Trans",
          media_file_menu_label: "Media File Trans",
          html_file_menu_label: "HTML File Trans",
          pdf_file_menu_label: "PDF File Trans",
          generic_file_menu_label: "File Translate",
          original_label: "Original",
          ipa_label: "IPA",
          translation_label: "Translate",
          original: "[ORIGIN]",
          ipa: "[IPA]",
          translation: "[TRANS]",
          translate: "Translate",
          settings: "King AI Settings",
          source_trans: "Trans to source language",
          target_trans: "Trans to target language",
          cap_gui: "Tap and drag to select translation area",
          failed_read_file: "Failed to read file",
          failed_read_api: "Failed to read API response",
          found_new_ele: "Find a new video element:",
          stop_cap: "Stopped translating subtitles",
          found_video: "Found video container:",
          lang_detect: "Language detection",
          reliability: "confidence",
          upl_url: "Could not create URL from the uploaded file",
          upl_uri: "Could not get file URI.",
          upl_fail: "Upload failed",
          uns_format: "Unsupported format",
          switch_layout: "Switch layout orientation",
          switch_layout_ver: "Switch to vertical layout",
          switch_layout_hor: "Switch to horizontal layout",
          device_tts: "Device TTS",
          un_pr_screen: "Could not process screenshot",
          un_cr_screen: "Could not create screenshot",
          play_tts: "Đọc văn bản",
          stop_tts: "Dừng đọc",
          unsupport_file: "Unsupported file format. Only supports:",
          close_popup: "Close popup",
          generic_file_gemini_menu_label: "Translate VIP",
          only_gemini: "This feature only supports the Gemini API. Please select Gemini as the API Provider in the settings.",
          file_input_url_title: "Enter file URL to translate",
          file_input_url_placeholder: "Paste file URL here",
          invalid_url_format: "Invalid URL format. Please enter a valid URL (starting with http:// or https://).", // Add this line
          processing_url: "Processing URL...",
          unsupport_file_url_provider: "This API Provider does not support direct file URLs. Please select Gemini or Puter.",
          google_translate_page_menu_label: " Google Trans (Page)",
          google_translate_enabled: "Google Translate page translation enabled.",
          google_translate_already_active: "Google Translate is already active. Please refresh page to disable.",
          revert_google_translate_label: "Disable Google Translate",
          google_translate_unsupported: "Google Translate is not supported on this page.",
          reload_page_label: "Reload Page",
          not_find_video: "Could not find an active video after 5 minutes",
          get_transcript_error: "Error getting video transcript:",
          get_transcript_error_generic: "Could not get the transcript from YouTube after multiple attempts.",
          get_transcript_error_suggestion1: "Suggestion 1: Please try refreshing (F5) this page.",
          get_transcript_error_suggestion2: "Suggestion 2: If the error persists, try clearing cookies and site data for YouTube.",
        },
      }
    },
    TTS: {
      GEMINI: {
        MODEL: [
          'gemini-2.5-flash-preview-tts',
          'gemini-2.5-pro-preview-tts'
        ],
        VOICES: [
          'Zephyr', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Leda', 'Orus',
          'Aoede', 'Callirrhoe', 'Autonoe', 'Enceladus', 'Iapetus',
          'Umbriel', 'Algieba', 'Despina', 'Erinome', 'Algenib',
          'Rasalgethi', 'Laomedeia', 'Achernar', 'Alnilam', 'Schedar',
          'Gacrux', 'Pulcherrima', 'Achird', 'Zubenelgenubi',
          'Vindemiatrix', 'Sadachbia', 'Sadaltager', 'Sulafat'
        ]
      },
      OPENAI: {
        MODEL: ['tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'],
        VOICES: ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse']
      },
      GOOGLE: {
        VOICES: {
          vi: [
            { name: 'vi-VN-Standard-A', display: 'Google Nữ (Bắc) - Standard' },
            { name: 'vi-VN-Standard-B', display: 'Google Nam (Bắc) - Standard' },
            { name: 'vi-VN-Standard-C', display: 'Google Nữ (Nam) - Standard' },
            { name: 'vi-VN-Standard-D', display: 'Google Nam (Nam) - Standard' },
            { name: 'vi-VN-Wavenet-A', display: 'Google Nữ (Bắc) - Wavenet' },
            { name: 'vi-VN-Wavenet-B', display: 'Google Nam (Bắc) - Wavenet' },
            { name: 'vi-VN-Wavenet-C', display: 'Google Nữ (Nam) - Wavenet' },
            { name: 'vi-VN-Wavenet-D', display: 'Google Nam (Nam) - Wavenet' },
            { name: 'vi-VN-Neural2-A', display: 'Google Nữ (Bắc) - Neural2' },
            { name: 'vi-VN-Neural2-B', display: 'Google Nam (Bắc) - Neural2' },
            { name: 'vi-VN-Neural2-C', display: 'Google Nữ (Nam) - Neural2' },
            { name: 'vi-VN-Neural2-D', display: 'Google Nam (Nam) - Neural2' }
          ],
          en: [
            { name: 'en-US-Standard-A', display: 'US Female 1 - Standard' },
            { name: 'en-US-Standard-B', display: 'US Male 1 - Standard' },
            { name: 'en-US-Standard-C', display: 'US Female 2 - Standard' },
            { name: 'en-US-Standard-D', display: 'US Male 2 - Standard' },
            { name: 'en-US-Standard-E', display: 'US Female 3 - Standard' },
            { name: 'en-US-Standard-F', display: 'US Female 4 - Standard' },
            { name: 'en-US-Standard-G', display: 'US Female 5 - Standard' },
            { name: 'en-US-Standard-H', display: 'US Female 6 - Standard' },
            { name: 'en-US-Standard-I', display: 'US Male 3 - Standard' },
            { name: 'en-US-Standard-J', display: 'US Male 4 - Standard' },
            { name: 'en-US-Wavenet-A', display: 'US Female 1 - Wavenet' },
            { name: 'en-US-Wavenet-B', display: 'US Male 1 - Wavenet' },
            { name: 'en-US-Wavenet-C', display: 'US Female 2 - Wavenet' },
            { name: 'en-US-Wavenet-D', display: 'US Male 2 - Wavenet' },
            { name: 'en-US-Wavenet-E', display: 'US Female 3 - Wavenet' },
            { name: 'en-US-Wavenet-F', display: 'US Female 4 - Wavenet' },
            { name: 'en-US-Wavenet-G', display: 'US Female 5 - Wavenet' },
            { name: 'en-US-Wavenet-H', display: 'US Female 6 - Wavenet' },
            { name: 'en-US-Wavenet-I', display: 'US Male 3 - Wavenet' },
            { name: 'en-US-Wavenet-J', display: 'US Male 4 - Wavenet' },
            { name: 'en-US-Neural2-A', display: 'US Female 1 - Neural2' },
            { name: 'en-US-Neural2-B', display: 'US Male 1 - Neural2' },
            { name: 'en-US-Neural2-C', display: 'US Female 2 - Neural2' },
            { name: 'en-US-Neural2-D', display: 'US Male 2 - Neural2' },
            { name: 'en-US-Neural2-E', display: 'US Female 3 - Neural2' },
            { name: 'en-US-Neural2-F', display: 'US Female 4 - Neural2' },
            { name: 'en-US-Neural2-G', display: 'US Female 5 - Neural2' },
            { name: 'en-US-Neural2-H', display: 'US Female 6 - Neural2' },
            { name: 'en-US-Neural2-I', display: 'US Male 3 - Neural2' },
            { name: 'en-US-Neural2-J', display: 'US Male 4 - Neural2' },
            { name: 'en-GB-Standard-A', display: 'UK Female 1 - Standard' },
            { name: 'en-GB-Standard-B', display: 'UK Male 1 - Standard' },
            { name: 'en-GB-Standard-C', display: 'UK Female 2 - Standard' },
            { name: 'en-GB-Standard-D', display: 'UK Male 2 - Standard' },
            { name: 'en-GB-Standard-F', display: 'UK Female 3 - Standard' },
            { name: 'en-GB-Wavenet-A', display: 'UK Female 1 - Wavenet' },
            { name: 'en-GB-Wavenet-B', display: 'UK Male 1 - Wavenet' },
            { name: 'en-GB-Wavenet-C', display: 'UK Female 2 - Wavenet' },
            { name: 'en-GB-Wavenet-D', display: 'UK Male 2 - Wavenet' },
            { name: 'en-GB-Wavenet-F', display: 'UK Female 3 - Wavenet' },
            { name: 'en-GB-Neural2-A', display: 'UK Female 1 - Neural2' },
            { name: 'en-GB-Neural2-B', display: 'UK Male 1 - Neural2' },
            { name: 'en-GB-Neural2-C', display: 'UK Female 2 - Neural2' },
            { name: 'en-GB-Neural2-D', display: 'UK Male 2 - Neural2' },
            { name: 'en-GB-Neural2-F', display: 'UK Female 3 - Neural2' }
          ],
          zh: [
            { name: 'cmn-CN-Standard-A', display: 'CN Female 1 - Standard' },
            { name: 'cmn-CN-Standard-B', display: 'CN Male 1 - Standard' },
            { name: 'cmn-CN-Standard-C', display: 'CN Male 2 - Standard' },
            { name: 'cmn-CN-Standard-D', display: 'CN Female 2 - Standard' },
            { name: 'cmn-CN-Wavenet-A', display: 'CN Female 1 - Wavenet' },
            { name: 'cmn-CN-Wavenet-B', display: 'CN Male 1 - Wavenet' },
            { name: 'cmn-CN-Wavenet-C', display: 'CN Male 2 - Wavenet' },
            { name: 'cmn-CN-Wavenet-D', display: 'CN Female 2 - Wavenet' },
            { name: 'cmn-CN-Neural2-A', display: 'CN Female 1 - Neural2' },
            { name: 'cmn-CN-Neural2-B', display: 'CN Male 1 - Neural2' },
            { name: 'cmn-CN-Neural2-C', display: 'CN Male 2 - Neural2' },
            { name: 'cmn-CN-Neural2-D', display: 'CN Female 2 - Neural2' },
            { name: 'cmn-TW-Standard-A', display: 'TW Female 1 - Standard' },
            { name: 'cmn-TW-Standard-B', display: 'TW Male 1 - Standard' },
            { name: 'cmn-TW-Standard-C', display: 'TW Male 2 - Standard' },
            { name: 'cmn-TW-Wavenet-A', display: 'TW Female 1 - Wavenet' },
            { name: 'cmn-TW-Wavenet-B', display: 'TW Male 1 - Wavenet' },
            { name: 'cmn-TW-Wavenet-C', display: 'TW Male 2 - Wavenet' },
            { name: 'cmn-TW-Neural2-A', display: 'TW Female 1 - Neural2' },
            { name: 'cmn-TW-Neural2-B', display: 'TW Male 1 - Neural2' },
            { name: 'cmn-TW-Neural2-C', display: 'TW Male 2 - Neural2' }
          ],
          ja: [
            { name: 'ja-JP-Standard-A', display: 'JP Female 1 - Standard' },
            { name: 'ja-JP-Standard-B', display: 'JP Female 2 - Standard' },
            { name: 'ja-JP-Standard-C', display: 'JP Male 1 - Standard' },
            { name: 'ja-JP-Standard-D', display: 'JP Male 2 - Standard' },
            { name: 'ja-JP-Wavenet-A', display: 'JP Female 1 - Wavenet' },
            { name: 'ja-JP-Wavenet-B', display: 'JP Female 2 - Wavenet' },
            { name: 'ja-JP-Wavenet-C', display: 'JP Male 1 - Wavenet' },
            { name: 'ja-JP-Wavenet-D', display: 'JP Male 2 - Wavenet' },
            { name: 'ja-JP-Neural2-A', display: 'JP Female 1 - Neural2' },
            { name: 'ja-JP-Neural2-B', display: 'JP Female 2 - Neural2' },
            { name: 'ja-JP-Neural2-C', display: 'JP Male 1 - Neural2' },
            { name: 'ja-JP-Neural2-D', display: 'JP Male 2 - Neural2' }
          ],
          ko: [
            { name: 'ko-KR-Standard-A', display: 'KR Female 1 - Standard' },
            { name: 'ko-KR-Standard-B', display: 'KR Female 2 - Standard' },
            { name: 'ko-KR-Standard-C', display: 'KR Male 1 - Standard' },
            { name: 'ko-KR-Standard-D', display: 'KR Male 2 - Standard' },
            { name: 'ko-KR-Wavenet-A', display: 'KR Female 1 - Wavenet' },
            { name: 'ko-KR-Wavenet-B', display: 'KR Female 2 - Wavenet' },
            { name: 'ko-KR-Wavenet-C', display: 'KR Male 1 - Wavenet' },
            { name: 'ko-KR-Wavenet-D', display: 'KR Male 2 - Wavenet' },
            { name: 'ko-KR-Neural2-A', display: 'KR Female 1 - Neural2' },
            { name: 'ko-KR-Neural2-B', display: 'KR Female 2 - Neural2' },
            { name: 'ko-KR-Neural2-C', display: 'KR Male 1 - Neural2' },
            { name: 'ko-KR-Neural2-D', display: 'KR Male 2 - Neural2' }
          ],
          fr: [
            { name: 'fr-FR-Standard-A', display: 'FR Female 1 - Standard' },
            { name: 'fr-FR-Standard-B', display: 'FR Male 1 - Standard' },
            { name: 'fr-FR-Standard-C', display: 'FR Female 2 - Standard' },
            { name: 'fr-FR-Standard-D', display: 'FR Male 2 - Standard' },
            { name: 'fr-FR-Standard-E', display: 'FR Female 3 - Standard' },
            { name: 'fr-FR-Wavenet-A', display: 'FR Female 1 - Wavenet' },
            { name: 'fr-FR-Wavenet-B', display: 'FR Male 1 - Wavenet' },
            { name: 'fr-FR-Wavenet-C', display: 'FR Female 2 - Wavenet' },
            { name: 'fr-FR-Wavenet-D', display: 'FR Male 2 - Wavenet' },
            { name: 'fr-FR-Wavenet-E', display: 'FR Female 3 - Wavenet' },
            { name: 'fr-FR-Neural2-A', display: 'FR Female 1 - Neural2' },
            { name: 'fr-FR-Neural2-B', display: 'FR Male 1 - Neural2' },
            { name: 'fr-FR-Neural2-C', display: 'FR Female 2 - Neural2' },
            { name: 'fr-FR-Neural2-D', display: 'FR Male 2 - Neural2' },
            { name: 'fr-FR-Neural2-E', display: 'FR Female 3 - Neural2' }
          ],
          de: [
            { name: 'de-DE-Standard-A', display: 'DE Female 1 - Standard' },
            { name: 'de-DE-Standard-B', display: 'DE Male 1 - Standard' },
            { name: 'de-DE-Standard-C', display: 'DE Female 2 - Standard' },
            { name: 'de-DE-Standard-D', display: 'DE Male 2 - Standard' },
            { name: 'de-DE-Standard-E', display: 'DE Male 3 - Standard' },
            { name: 'de-DE-Standard-F', display: 'DE Female 3 - Standard' },
            { name: 'de-DE-Wavenet-A', display: 'DE Female 1 - Wavenet' },
            { name: 'de-DE-Wavenet-B', display: 'DE Male 1 - Wavenet' },
            { name: 'de-DE-Wavenet-C', display: 'DE Female 2 - Wavenet' },
            { name: 'de-DE-Wavenet-D', display: 'DE Male 2 - Wavenet' },
            { name: 'de-DE-Wavenet-E', display: 'DE Male 3 - Wavenet' },
            { name: 'de-DE-Wavenet-F', display: 'DE Female 3 - Wavenet' },
            { name: 'de-DE-Neural2-A', display: 'DE Female 1 - Neural2' },
            { name: 'de-DE-Neural2-B', display: 'DE Male 1 - Neural2' },
            { name: 'de-DE-Neural2-C', display: 'DE Female 2 - Neural2' },
            { name: 'de-DE-Neural2-D', display: 'DE Male 2 - Neural2' },
            { name: 'de-DE-Neural2-E', display: 'DE Male 3 - Neural2' },
            { name: 'de-DE-Neural2-F', display: 'DE Female 3 - Neural2' }
          ],
          es: [
            { name: 'es-ES-Standard-A', display: 'ES Female 1 - Standard' },
            { name: 'es-ES-Standard-B', display: 'ES Male 1 - Standard' },
            { name: 'es-ES-Standard-C', display: 'ES Female 2 - Standard' },
            { name: 'es-ES-Standard-D', display: 'ES Male 2 - Standard' },
            { name: 'es-ES-Wavenet-A', display: 'ES Female 1 - Wavenet' },
            { name: 'es-ES-Wavenet-B', display: 'ES Male 1 - Wavenet' },
            { name: 'es-ES-Wavenet-C', display: 'ES Female 2 - Wavenet' },
            { name: 'es-ES-Wavenet-D', display: 'ES Male 2 - Wavenet' },
            { name: 'es-ES-Neural2-A', display: 'ES Female 1 - Neural2' },
            { name: 'es-ES-Neural2-B', display: 'ES Male 1 - Neural2' },
            { name: 'es-ES-Neural2-C', display: 'ES Female 2 - Neural2' },
            { name: 'es-ES-Neural2-D', display: 'ES Male 2 - Neural2' },
            { name: 'es-US-Standard-A', display: 'ES-US Female 1 - Standard' },
            { name: 'es-US-Standard-B', display: 'ES-US Male 1 - Standard' },
            { name: 'es-US-Standard-C', display: 'ES-US Male 2 - Standard' },
            { name: 'es-US-Wavenet-A', display: 'ES-US Female 1 - Wavenet' },
            { name: 'es-US-Wavenet-B', display: 'ES-US Male 1 - Wavenet' },
            { name: 'es-US-Wavenet-C', display: 'ES-US Male 2 - Wavenet' },
            { name: 'es-US-Neural2-A', display: 'ES-US Female 1 - Neural2' },
            { name: 'es-US-Neural2-B', display: 'ES-US Male 1 - Neural2' },
            { name: 'es-US-Neural2-C', display: 'ES-US Male 2 - Neural2' }
          ],
          it: [
            { name: 'it-IT-Standard-A', display: 'IT Female 1 - Standard' },
            { name: 'it-IT-Standard-B', display: 'IT Female 2 - Standard' },
            { name: 'it-IT-Standard-C', display: 'IT Male 1 - Standard' },
            { name: 'it-IT-Standard-D', display: 'IT Male 2 - Standard' },
            { name: 'it-IT-Wavenet-A', display: 'IT Female 1 - Wavenet' },
            { name: 'it-IT-Wavenet-B', display: 'IT Female 2 - Wavenet' },
            { name: 'it-IT-Wavenet-C', display: 'IT Male 1 - Wavenet' },
            { name: 'it-IT-Wavenet-D', display: 'IT Male 2 - Wavenet' },
            { name: 'it-IT-Neural2-A', display: 'IT Female 1 - Neural2' },
            { name: 'it-IT-Neural2-B', display: 'IT Female 2 - Neural2' },
            { name: 'it-IT-Neural2-C', display: 'IT Male 1 - Neural2' },
            { name: 'it-IT-Neural2-D', display: 'IT Male 2 - Neural2' }
          ],
          ru: [
            { name: 'ru-RU-Standard-A', display: 'RU Female 1 - Standard' },
            { name: 'ru-RU-Standard-B', display: 'RU Male 1 - Standard' },
            { name: 'ru-RU-Standard-C', display: 'RU Female 2 - Standard' },
            { name: 'ru-RU-Standard-D', display: 'RU Male 2 - Standard' },
            { name: 'ru-RU-Standard-E', display: 'RU Female 3 - Standard' },
            { name: 'ru-RU-Wavenet-A', display: 'RU Female 1 - Wavenet' },
            { name: 'ru-RU-Wavenet-B', display: 'RU Male 1 - Wavenet' },
            { name: 'ru-RU-Wavenet-C', display: 'RU Female 2 - Wavenet' },
            { name: 'ru-RU-Wavenet-D', display: 'RU Male 2 - Wavenet' },
            { name: 'ru-RU-Wavenet-E', display: 'RU Female 3 - Wavenet' }
          ],
          pt: [
            { name: 'pt-BR-Standard-A', display: 'PT-BR Female 1 - Standard' },
            { name: 'pt-BR-Standard-B', display: 'PT-BR Male 1 - Standard' },
            { name: 'pt-BR-Standard-C', display: 'PT-BR Female 2 - Standard' },
            { name: 'pt-BR-Wavenet-A', display: 'PT-BR Female 1 - Wavenet' },
            { name: 'pt-BR-Wavenet-B', display: 'PT-BR Male 1 - Wavenet' },
            { name: 'pt-BR-Wavenet-C', display: 'PT-BR Female 2 - Wavenet' },
            { name: 'pt-BR-Neural2-A', display: 'PT-BR Female 1 - Neural2' },
            { name: 'pt-BR-Neural2-B', display: 'PT-BR Male 1 - Neural2' },
            { name: 'pt-BR-Neural2-C', display: 'PT-BR Female 2 - Neural2' },
            { name: 'pt-PT-Standard-A', display: 'PT-PT Female 1 - Standard' },
            { name: 'pt-PT-Standard-B', display: 'PT-PT Male 1 - Standard' },
            { name: 'pt-PT-Standard-C', display: 'PT-PT Male 2 - Standard' },
            { name: 'pt-PT-Standard-D', display: 'PT-PT Female 2 - Standard' },
            { name: 'pt-PT-Wavenet-A', display: 'PT-PT Female 1 - Wavenet' },
            { name: 'pt-PT-Wavenet-B', display: 'PT-PT Male 1 - Wavenet' },
            { name: 'pt-PT-Wavenet-C', display: 'PT-PT Male 2 - Wavenet' },
            { name: 'pt-PT-Wavenet-D', display: 'PT-PT Female 2 - Wavenet' }
          ],
          nl: [
            { name: 'nl-NL-Standard-A', display: 'NL Female 1 - Standard' },
            { name: 'nl-NL-Standard-B', display: 'NL Male 1 - Standard' },
            { name: 'nl-NL-Standard-C', display: 'NL Male 2 - Standard' },
            { name: 'nl-NL-Standard-D', display: 'NL Female 2 - Standard' },
            { name: 'nl-NL-Standard-E', display: 'NL Female 3 - Standard' },
            { name: 'nl-NL-Wavenet-A', display: 'NL Female 1 - Wavenet' },
            { name: 'nl-NL-Wavenet-B', display: 'NL Male 1 - Wavenet' },
            { name: 'nl-NL-Wavenet-C', display: 'NL Male 2 - Wavenet' },
            { name: 'nl-NL-Wavenet-D', display: 'NL Female 2 - Wavenet' },
            { name: 'nl-NL-Wavenet-E', display: 'NL Female 3 - Wavenet' }
          ],
          pl: [
            { name: 'pl-PL-Standard-A', display: 'PL Female 1 - Standard' },
            { name: 'pl-PL-Standard-B', display: 'PL Male 1 - Standard' },
            { name: 'pl-PL-Standard-C', display: 'PL Male 2 - Standard' },
            { name: 'pl-PL-Standard-D', display: 'PL Female 2 - Standard' },
            { name: 'pl-PL-Standard-E', display: 'PL Female 3 - Standard' },
            { name: 'pl-PL-Wavenet-A', display: 'PL Female 1 - Wavenet' },
            { name: 'pl-PL-Wavenet-B', display: 'PL Male 1 - Wavenet' },
            { name: 'pl-PL-Wavenet-C', display: 'PL Male 2 - Wavenet' },
            { name: 'pl-PL-Wavenet-D', display: 'PL Female 2 - Wavenet' },
            { name: 'pl-PL-Wavenet-E', display: 'PL Female 3 - Wavenet' }
          ],
          tr: [
            { name: 'tr-TR-Standard-A', display: 'TR Female 1 - Standard' },
            { name: 'tr-TR-Standard-B', display: 'TR Male 1 - Standard' },
            { name: 'tr-TR-Standard-C', display: 'TR Female 2 - Standard' },
            { name: 'tr-TR-Standard-D', display: 'TR Female 3 - Standard' },
            { name: 'tr-TR-Standard-E', display: 'TR Male 2 - Standard' },
            { name: 'tr-TR-Wavenet-A', display: 'TR Female 1 - Wavenet' },
            { name: 'tr-TR-Wavenet-B', display: 'TR Male 1 - Wavenet' },
            { name: 'tr-TR-Wavenet-C', display: 'TR Female 2 - Wavenet' },
            { name: 'tr-TR-Wavenet-D', display: 'TR Female 3 - Wavenet' },
            { name: 'tr-TR-Wavenet-E', display: 'TR Male 2 - Wavenet' }
          ],
          ar: [
            { name: 'ar-XA-Standard-A', display: 'AR Female 1 - Standard' },
            { name: 'ar-XA-Standard-B', display: 'AR Male 1 - Standard' },
            { name: 'ar-XA-Standard-C', display: 'AR Male 2 - Standard' },
            { name: 'ar-XA-Standard-D', display: 'AR Female 2 - Standard' },
            { name: 'ar-XA-Wavenet-A', display: 'AR Female 1 - Wavenet' },
            { name: 'ar-XA-Wavenet-B', display: 'AR Male 1 - Wavenet' },
            { name: 'ar-XA-Wavenet-C', display: 'AR Male 2 - Wavenet' },
            { name: 'ar-XA-Wavenet-D', display: 'AR Female 2 - Wavenet' }
          ],
          th: [
            { name: 'th-TH-Standard-A', display: 'TH Female 1 - Standard' },
            { name: 'th-TH-Neural2-C', display: 'TH Female 2 - Neural2' }
          ],
          hi: [
            { name: 'hi-IN-Standard-A', display: 'HI Female 1 - Standard' },
            { name: 'hi-IN-Standard-B', display: 'HI Female 2 - Standard' },
            { name: 'hi-IN-Standard-C', display: 'HI Male 1 - Standard' },
            { name: 'hi-IN-Standard-D', display: 'HI Male 2 - Standard' },
            { name: 'hi-IN-Wavenet-A', display: 'HI Female 1 - Wavenet' },
            { name: 'hi-IN-Wavenet-B', display: 'HI Female 2 - Wavenet' },
            { name: 'hi-IN-Wavenet-C', display: 'HI Male 1 - Wavenet' },
            { name: 'hi-IN-Wavenet-D', display: 'HI Male 2 - Wavenet' }
          ],
          id: [
            { name: 'id-ID-Standard-A', display: 'ID Female 1 - Standard' },
            { name: 'id-ID-Standard-B', display: 'ID Male 1 - Standard' },
            { name: 'id-ID-Standard-C', display: 'ID Male 2 - Standard' },
            { name: 'id-ID-Standard-D', display: 'ID Female 2 - Standard' },
            { name: 'id-ID-Wavenet-A', display: 'ID Female 1 - Wavenet' },
            { name: 'id-ID-Wavenet-B', display: 'ID Male 1 - Wavenet' },
            { name: 'id-ID-Wavenet-C', display: 'ID Male 2 - Wavenet' },
            { name: 'id-ID-Wavenet-D', display: 'ID Female 2 - Wavenet' }
          ],
          ms: [
            { name: 'ms-MY-Standard-A', display: 'MS Female 1 - Standard' },
            { name: 'ms-MY-Standard-B', display: 'MS Male 1 - Standard' },
            { name: 'ms-MY-Standard-C', display: 'MS Female 2 - Standard' },
            { name: 'ms-MY-Standard-D', display: 'MS Male 2 - Standard' }
          ],
          fil: [
            { name: 'fil-PH-Standard-A', display: 'FIL Female 1 - Standard' },
            { name: 'fil-PH-Standard-B', display: 'FIL Female 2 - Standard' },
            { name: 'fil-PH-Standard-C', display: 'FIL Male 1 - Standard' },
            { name: 'fil-PH-Standard-D', display: 'FIL Male 2 - Standard' },
            { name: 'fil-PH-Wavenet-A', display: 'FIL Female 1 - Wavenet' },
            { name: 'fil-PH-Wavenet-B', display: 'FIL Female 2 - Wavenet' },
            { name: 'fil-PH-Wavenet-C', display: 'FIL Male 1 - Wavenet' },
            { name: 'fil-PH-Wavenet-D', display: 'FIL Male 2 - Wavenet' }
          ],
          cs: [
            { name: 'cs-CZ-Standard-A', display: 'CS Female 1 - Standard' },
            { name: 'cs-CZ-Wavenet-A', display: 'CS Female 1 - Wavenet' }
          ],
          el: [
            { name: 'el-GR-Standard-A', display: 'EL Female 1 - Standard' },
            { name: 'el-GR-Wavenet-A', display: 'EL Female 1 - Wavenet' }
          ],
          hu: [
            { name: 'hu-HU-Standard-A', display: 'HU Female 1 - Standard' },
            { name: 'hu-HU-Wavenet-A', display: 'HU Female 1 - Wavenet' }
          ],
          da: [
            { name: 'da-DK-Standard-A', display: 'DA Female 1 - Standard' },
            { name: 'da-DK-Standard-C', display: 'DA Male 1 - Standard' },
            { name: 'da-DK-Standard-D', display: 'DA Female 2 - Standard' },
            { name: 'da-DK-Standard-E', display: 'DA Female 3 - Standard' },
            { name: 'da-DK-Wavenet-A', display: 'DA Female 1 - Wavenet' },
            { name: 'da-DK-Wavenet-C', display: 'DA Male 1 - Wavenet' },
            { name: 'da-DK-Wavenet-D', display: 'DA Female 2 - Wavenet' },
            { name: 'da-DK-Wavenet-E', display: 'DA Female 3 - Wavenet' }
          ],
          fi: [
            { name: 'fi-FI-Standard-A', display: 'FI Female 1 - Standard' },
            { name: 'fi-FI-Wavenet-A', display: 'FI Female 1 - Wavenet' }
          ],
          nb: [
            { name: 'nb-NO-Standard-A', display: 'NB Female 1 - Standard' },
            { name: 'nb-NO-Standard-B', display: 'NB Male 1 - Standard' },
            { name: 'nb-NO-Standard-C', display: 'NB Female 2 - Standard' },
            { name: 'nb-NO-Standard-D', display: 'NB Male 2 - Standard' },
            { name: 'nb-NO-Standard-E', display: 'NB Female 3 - Standard' },
            { name: 'nb-NO-Wavenet-A', display: 'NB Female 1 - Wavenet' },
            { name: 'nb-NO-Wavenet-B', display: 'NB Male 1 - Wavenet' },
            { name: 'nb-NO-Wavenet-C', display: 'NB Female 2 - Wavenet' },
            { name: 'nb-NO-Wavenet-D', display: 'NB Male 2 - Wavenet' },
            { name: 'nb-NO-Wavenet-E', display: 'NB Female 3 - Wavenet' }
          ],
          sv: [
            { name: 'sv-SE-Standard-A', display: 'SV Female 1 - Standard' },
            { name: 'sv-SE-Standard-B', display: 'SV Female 2 - Standard' },
            { name: 'sv-SE-Standard-C', display: 'SV Male 1 - Standard' },
            { name: 'sv-SE-Standard-D', display: 'SV Male 2 - Standard' },
            { name: 'sv-SE-Standard-E', display: 'SV Female 3 - Standard' },
            { name: 'sv-SE-Wavenet-A', display: 'SV Female 1 - Wavenet' },
            { name: 'sv-SE-Wavenet-B', display: 'SV Female 2 - Wavenet' },
            { name: 'sv-SE-Wavenet-C', display: 'SV Male 1 - Wavenet' },
            { name: 'sv-SE-Wavenet-D', display: 'SV Male 2 - Wavenet' },
            { name: 'sv-SE-Wavenet-E', display: 'SV Female 3 - Wavenet' }
          ]
        }
      }
    },
    LANGUAGEDISPLAY: {
      vi: { name: 'vi', display: 'Tiếng Việt' },
      en: { name: 'en', display: 'English' },
      'en-US': { name: 'en-US', display: 'English (US)' },
      'en-GB': { name: 'en-GB', display: 'English (UK)' },
      'en-AU': { name: 'en-AU', display: 'English (Australia)' },
      zh: { name: 'zh', display: '中文' },
      'zh-CN': { name: 'zh-CN', display: '中文 (简体)' },
      'zh-TW': { name: 'zh-TW', display: '中文 (繁體)' },
      'zh-HK': { name: 'zh-HK', display: '中文 (香港)' },
      ja: { name: 'ja', display: '日本語' },
      ko: { name: 'ko', display: '한국어' },
      fr: { name: 'fr', display: 'Français' },
      'fr-FR': { name: 'fr-FR', display: 'Français (France)' },
      'fr-CA': { name: 'fr-CA', display: 'Français (Canada)' },
      de: { name: 'de', display: 'Deutsch' },
      'de-DE': { name: 'de-DE', display: 'Deutsch (Deutschland)' },
      'de-AT': { name: 'de-AT', display: 'Deutsch (Österreich)' },
      'de-CH': { name: 'de-CH', display: 'Deutsch (Schweiz)' },
      es: { name: 'es', display: 'Español' },
      'es-ES': { name: 'es-ES', display: 'Español (España)' },
      'es-MX': { name: 'es-MX', display: 'Español (México)' },
      'es-US': { name: 'es-US', display: 'Español (Estados Unidos)' },
      it: { name: 'it', display: 'Italiano' },
      ru: { name: 'ru', display: 'Русский' },
      pt: { name: 'pt', display: 'Português' },
      'pt-BR': { name: 'pt-BR', display: 'Português (Brasil)' },
      'pt-PT': { name: 'pt-PT', display: 'Português (Portugal)' },
      nl: { name: 'nl', display: 'Nederlands' },
      pl: { name: 'pl', display: 'Polski' },
      tr: { name: 'tr', display: 'Türkçe' },
      ar: { name: 'ar', display: 'العربية' },
      th: { name: 'th', display: 'ไทย' },
      hi: { name: 'hi', display: 'हिन्दी' },
      id: { name: 'id', display: 'Indonesia' },
      ms: { name: 'ms', display: 'Melayu' },
      fil: { name: 'fil', display: 'Filipino' },
      'es-AR': { name: 'es-AR', display: 'Español (Argentina)' },
      'es-BO': { name: 'es-BO', display: 'Español (Bolivia)' },
      'es-CL': { name: 'es-CL', display: 'Español (Chile)' },
      'es-CO': { name: 'es-CO', display: 'Español (Colombia)' },
      'es-CR': { name: 'es-CR', display: 'Español (Costa Rica)' },
      'es-CU': { name: 'es-CU', display: 'Español (Cuba)' },
      'es-DO': { name: 'es-DO', display: 'Español (República Dominicana)' },
      'es-EC': { name: 'es-EC', display: 'Español (Ecuador)' },
      'es-SV': { name: 'es-SV', display: 'Español (El Salvador)' },
      'es-GT': { name: 'es-GT', display: 'Español (Guatemala)' },
      'es-HN': { name: 'es-HN', display: 'Español (Honduras)' },
      'es-NI': { name: 'es-NI', display: 'Español (Nicaragua)' },
      'es-PA': { name: 'es-PA', display: 'Español (Panamá)' },
      'es-PY': { name: 'es-PY', display: 'Español (Paraguay)' },
      'es-PE': { name: 'es-PE', display: 'Español (Perú)' },
      'es-PR': { name: 'es-PR', display: 'Español (Puerto Rico)' },
      'es-UY': { name: 'es-UY', display: 'Español (Uruguay)' },
      'es-VE': { name: 'es-VE', display: 'Español (Venezuela)' },
      'ar-AE': { name: 'ar-AE', display: 'العربية (الإمارات)' },
      'ar-BH': { name: 'ar-BH', display: 'العربية (البحرين)' },
      'ar-DZ': { name: 'ar-DZ', display: 'العربية (الجزائر)' },
      'ar-EG': { name: 'ar-EG', display: 'العربية (مصر)' },
      'ar-IQ': { name: 'ar-IQ', display: 'العربية (العراق)' },
      'ar-JO': { name: 'ar-JO', display: 'العربية (الأردن)' },
      'ar-KW': { name: 'ar-KW', display: 'العربية (الكويت)' },
      'ar-LB': { name: 'ar-LB', display: 'العربية (لبنان)' },
      'ar-LY': { name: 'ar-LY', display: 'العربية (ليبيا)' },
      'ar-MA': { name: 'ar-MA', display: 'العربية (المغرب)' },
      'ar-OM': { name: 'ar-OM', display: 'العربية (عُمان)' },
      'ar-QA': { name: 'ar-QA', display: 'العربية (قطر)' },
      'ar-SA': { name: 'ar-SA', display: 'العربية (السعودية)' },
      'ar-SY': { name: 'ar-SY', display: 'العربية (سوريا)' },
      'ar-TN': { name: 'ar-TN', display: 'العربية (تونس)' },
      'ar-YE': { name: 'ar-YE', display: 'العربية (اليمن)' },
      'bn-BD': { name: 'bn-BD', display: 'বাংলা (বাংলাদেশ)' },
      'bn-IN': { name: 'bn-IN', display: 'বাংলা (ভারত)' },
      'gu': { name: 'gu', display: 'ગુજરાતી' },
      'kn': { name: 'kn', display: 'ಕನ್ನಡ' },
      'ml': { name: 'ml', display: 'മലയാളം' },
      'mr': { name: 'mr', display: 'मराठी' },
      'ne': { name: 'ne', display: 'नेपाली' },
      'pa': { name: 'pa', display: 'ਪੰਜਾਬੀ' },
      'si': { name: 'si', display: 'සිංහල' },
      'ta': { name: 'ta', display: 'தமிழ்' },
      'te': { name: 'te', display: 'తెలుగు' },
      'ur': { name: 'ur', display: 'اردو' },
      'km': { name: 'km', display: 'ខ្មែរ' },
      'lo': { name: 'lo', display: 'ລາວ' },
      'my': { name: 'my', display: 'မြန်မာ' },
      'bg': { name: 'bg', display: 'Български' },
      'ca': { name: 'ca', display: 'Català' },
      'hr': { name: 'hr', display: 'Hrvatski' },
      'is': { name: 'is', display: 'Íslenska' },
      'lv': { name: 'lv', display: 'Latviešu' },
      'lt': { name: 'lt', display: 'Lietuvių' },
      'ro': { name: 'ro', display: 'Română' },
      'sk': { name: 'sk', display: 'Slovenčina' },
      'sl': { name: 'sl', display: 'Slovenščina' },
      'sr': { name: 'sr', display: 'Српски' },
      'uk': { name: 'uk', display: 'Українська' },
      cs: { name: 'cs', display: 'Čeština' },
      el: { name: 'el', display: 'Ελληνικά' },
      hu: { name: 'hu', display: 'Magyar' },
      da: { name: 'da', display: 'Dansk' },
      fi: { name: 'fi', display: 'Suomi' },
      nb: { name: 'nb', display: 'Norsk Bokmål' },
      sv: { name: 'sv', display: 'Svenska' }
    },
    LANGUAGES: {
      "ar": "Arabic",
      "bg": "Bulgarian",
      "bn": "Bengali",
      "ca": "Catalan",
      "cs": "Czech",
      "da": "Danish",
      "de": "German",
      "el": "Greek",
      "en": "English",
      "es": "Spanish",
      "et": "Estonian",
      "fa": "Farsi",
      "fi": "Finnish",
      "fr": "French",
      "gu": "Gujarati",
      "he": "Hebrew",
      "hi": "Hindi",
      "hr": "Croatian",
      "hu": "Hungarian",
      "id": "Indonesian",
      "it": "Italian",
      "ja": "Japanese",
      "kn": "Kannada",
      "ko": "Korean",
      "lt": "Lithuanian",
      "lv": "Latvian",
      "ml": "Malayalam",
      "mr": "Marathi",
      "ms": "Malay",
      "nb": "Norwegian Bokmål",
      "nl": "Dutch",
      "pl": "Polish",
      "pt": "Portuguese",
      "ro": "Romanian",
      "ru": "Russian",
      "sk": "Slovak",
      "sl": "Slovenian",
      "sr": "Serbian",
      "sv": "Swedish",
      "sw": "Swahili",
      "ta": "Tamil",
      "te": "Telugu",
      "th": "Thai",
      "tl": "Tagalog",
      "tr": "Turkish",
      "uk": "Ukrainian",
      "ur": "Urdu",
      "vi": "Vietnamese",
      "zh": "Chinese (Simplified)",
      "zh-TW": "Chinese (Traditional)"
    },
    OCR: {
      generation: {
        temperature: 0.6,
        topP: 0.8,
        topK: 30
      },
      maxFileSize: 2 * 1024 * 1024 * 1024,
      supportedFormats: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif"
      ]
    },
    MEDIA: {
      generation: {
        temperature: 0.6,
        topP: 0.8,
        topK: 30
      },
      audio: {
        maxSize: 2 * 1024 * 1024 * 1024,
        supportedFormats: [
          "audio/wav",
          "audio/mp3",
          "audio/ogg",
          "audio/m4a",
          "audio/aac",
          "audio/flac",
          "audio/wma",
          "audio/opus",
          "audio/amr",
          "audio/midi",
          "audio/mpa"
        ]
      },
      video: {
        maxSize: 2 * 1024 * 1024 * 1024,
        supportedFormats: [
          "video/mp4",
          "video/webm",
          "video/ogg",
          "video/x-msvideo",
          "video/quicktime",
          "video/x-ms-wmv",
          "video/x-flv",
          "video/3gpp",
          "video/3gpp2",
          "video/x-matroska"
        ]
      }
    },
    VIDEO_STREAMING: {
      enabled: true,
      supportedSites: [
        'youtube.com',
        // 'netflix.com',
        // 'udemy.com',  // Thêm Udemy
        // 'coursera.org', // Thêm Coursera
      ],
      styles: {
        subtitleContainer: {
          position: 'absolute',
          bottom: '2%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 2147483647,
          padding: '5px 10px',
          borderRadius: '5px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          color: 'white',
          fontSize: 'clamp(1rem, 1.5cqw, 2.5rem)',
          fontFamily: "'GoMono Nerd Font', 'Noto Sans', Arial",
          textShadow: '2px 2px 2px rgba(0,0,0,0.5)',
          maxWidth: '90%'
        }
      }
    },
    contextMenu: {
      enabled: true
    },
    pageTranslation: {
      enabled: true,
      autoTranslate: false,
      showInitialButton: false, // Hiện nút dịch ban đầu
      buttonTimeout: 10000, // Thời gian hiển thị nút (10 giây)
      enableGoogleTranslate: false, // Mặc định tắt
      googleTranslateLayout: 'INLINE', // "SIMPLE", "INLINE", "OVERLAY"
      useCustomSelectors: false,
      customSelectors: [],
      defaultSelectors: [
        "script",
        "code",
        "style",
        "input",
        "button",
        "textarea",
        ".notranslate",
        ".translator-settings-container",
        ".translator-tools-container",
        ".translator-content",
        ".draggable",
        ".page-translate-button",
        ".translator-tools-dropdown",
        ".translator-notification",
        ".translator-content",
        ".translator-context-menu",
        ".translator-overlay",
        ".translator-guide",
        ".center-translate-status",
        ".no-translate",
        "[data-notranslate]",
        "[translate='no']",
        ".html5-player-chrome",
        ".html5-video-player"
      ],
      generation: {
        temperature: 0.6,
        topP: 0.8,
        topK: 30
      }
    },
    promptSettings: {
      enabled: true,
      customPrompts: {
        normal: "",
        advanced: "",
        chinese: "",
        ocr: "",
        media: "",
        page: "",
        file_content: "",
        normal_chinese: "",
        advanced_chinese: "",
        chinese_chinese: "",
        ocr_chinese: "",
        media_chinese: "",
        page_chinese: "",
        file_content_chinese: ""
      },
      useCustom: false
    },
    CACHE: {
      text: {
        maxSize: 100, // Tối đa 100 entries cho text
        expirationTime: 5 * 60 * 1000, // 5 phút
      },
      image: {
        maxSize: 25, // Tối đa 25 entries cho ảnh
        expirationTime: 30 * 60 * 1000, // 30 phút
      },
      media: {
        maxSize: 25, // Số lượng media được cache tối đa
        expirationTime: 30 * 60 * 1000, // 30 phút
      }
    },
    RATE_LIMIT: {
      maxRequests: 5,
      perMilliseconds: 10000
    },
    THEME: {
      mode: "dark",
      light: {
        background: "#cccccc",
        backgroundShadow: "rgba(255, 255, 255, 0.05)",
        text: "#333333",
        border: "#bbb",
        title: "#202020",
        content: "#555",
        button: {
          close: { background: "#ff4444", text: "#ddd" },
          translate: { background: "#007BFF", text: "#ddd" }
        }
      },
      dark: {
        background: "#333333",
        backgroundShadow: "rgba(0, 0, 0, 0.05)",
        text: "#cccccc",
        border: "#555",
        title: "#eeeeee",
        content: "#bbb",
        button: {
          close: { background: "#aa2222", text: "#ddd" },
          translate: { background: "#004a99", text: "#ddd" }
        }
      }
    },
    STYLES: {
      translation: {
        marginTop: "10px",
        padding: "10px",
        backgroundColor: "#f0f0f0",
        borderLeft: "3px solid #4CAF50",
        borderRadius: "8px",
        color: "#333",
        position: "relative",
        fontFamily: "'GoMono Nerd Font', 'Noto Sans', Arial",
        fontSize: "16px",
        zIndex: "2147483647"
      },
      popup: {
        position: "fixed",
        border: "1px solid",
        padding: "20px",
        zIndex: "2147483647",
        maxWidth: "90vw",
        minWidth: "300px",
        maxHeight: "80vh",
        boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
        borderRadius: "15px",
        fontFamily: "'GoMono Nerd Font', 'Noto Sans', Arial",
        fontSize: "16px",
        top: `${window.innerHeight / 2}px`,
        left: `${window.innerWidth / 2}px`,
        transform: "translate(-50%, -50%)",
        display: "flex",
        flexDirection: "column",
        overflowY: "auto"
      },
      button: {
        position: "fixed",
        border: "none",
        borderRadius: "8px",
        padding: "5px 10px",
        cursor: "pointer",
        zIndex: "2147483647",
        fontSize: "14px"
      },
      dragHandle: {
        padding: "10px",
        borderBottom: "1px solid",
        cursor: "move",
        userSelect: "none",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTopLeftRadius: "15px",
        borderTopRightRadius: "15px",
        zIndex: "2147483647"
      }
    }
  };
  const DEFAULT_SETTINGS = {
    uiLanguage: "vi", // cài đặt ngôn ngữ giao diện mặc định: 'en', 'vi'
    theme: CONFIG.THEME.mode,
    apiProvider: CONFIG.API.currentProvider,
    apiKey: {
      gemini: [""],
      perplexity: [""],
      claude: [""],
      openai: [""],
      mistral: [""]
    },
    currentKeyIndex: {
      gemini: 0,
      perplexity: 0,
      claude: 0,
      openai: 0,
      mistral: 0
    },
    geminiOptions: {
      modelType: "fast", // 'fast', 'pro', 'think', 'custom'
      fastModel: "gemini-2.0-flash-lite",
      proModel: "gemini-2.0-pro-exp-02-05",
      thinkModel: "gemini-2.0-flash-thinking-exp-01-21",
      customModel: ""
    },
    perplexityOptions: {
      modelType: "fast", // 'fast', 'balance', 'pro', 'custom'
      fastModel: "sonar",
      balanceModel: "sonar-deep-research",
      proModel: "sonar-pro",
      customModel: ""
    },
    claudeOptions: {
      modelType: "balance", // 'fast', 'balance', 'pro', 'custom'
      fastModel: "claude-3-5-haiku-latest",
      balanceModel: "claude-3-7-sonnet-latest",
      proModel: "claude-3-opus-latest",
      customModel: ""
    },
    openaiOptions: {
      modelType: "fast", // 'fast', 'balance', 'pro', 'custom'
      fastModel: "gpt-4.1-nano",
      balanceModel: "gpt-4.1",
      proModel: "o1-pro",
      customModel: ""
    },
    mistralOptions: {
      modelType: "free", // 'free', 'research', 'premier', 'custom'
      freeModel: "mistral-small-latest",
      researchModel: "open-mistral-nemo",
      premierModel: "codestral-latest",
      customModel: "",
    },
    puterOptions: {
      modelType: "fast", // 'fast', 'balance', 'pro', 'custom'
      fastModel: "claude-3-7-sonnet",
      balanceModel: "gpt-4.5-preview",
      proModel: "o1-pro",
      customModel: ""
    },
    contextMenu: {
      enabled: true
    },
    promptSettings: {
      enabled: true,
      customPrompts: {
        normal: "",
        advanced: "",
        chinese: "",
        ocr: "",
        media: "",
        page: "",
        file_content: "",
        normal_chinese: "",
        advanced_chinese: "",
        chinese_chinese: "",
        ocr_chinese: "",
        media_chinese: "",
        page_chinese: "",
        file_content_chinese: ""
      },
      useCustom: false
    },
    inputTranslation: {
      enabled: true,
      savePosition: true,
      excludeSelectors: []
    },
    translatorTools: {
      enabled: true
    },
    pageTranslation: {
      enabled: true,
      autoTranslate: false,
      showInitialButton: false, // Hiện nút dịch ban đầu
      buttonTimeout: 10000, // Thời gian hiển thị nút (10 giây)
      enableGoogleTranslate: false, // Mặc định tắt
      googleTranslateLayout: 'INLINE', // "SIMPLE", "INLINE", "OVERLAY"
      useCustomSelectors: false,
      customSelectors: [],
      defaultSelectors: CONFIG.pageTranslation.defaultSelectors,
      generation: {
        temperature: 0.6,
        topP: 0.8,
        topK: 30
      }
    },
    ocrOptions: {
      enabled: true,
      preferredProvider: CONFIG.API.currentProvider,
      displayType: "popup",
      maxFileSize: CONFIG.OCR.maxFileSize,
      temperature: CONFIG.OCR.generation.temperature,
      topP: CONFIG.OCR.generation.topP,
      topK: CONFIG.OCR.generation.topK
    },
    mediaOptions: {
      enabled: true,
      temperature: CONFIG.MEDIA.generation.temperature,
      topP: CONFIG.MEDIA.generation.topP,
      topK: CONFIG.MEDIA.generation.topK,
      audio: {
        processingInterval: 2000, // 2 seconds
        bufferSize: 16384,
        format: {
          sampleRate: 44100,
          numChannels: 1,
          bitsPerSample: 16
        }
      }
    },
    videoStreamingOptions: {
      enabled: false,
      fontSize: 'clamp(1rem, 1.5cqw, 2.5rem)',
      backgroundColor: 'rgba(0,0,0,0.7)',
      textColor: 'white'
    },
    displayOptions: {
      fontSize: "1rem",
      minPopupWidth: "300px",
      maxPopupWidth: "90vw",
      webImageTranslation: {
        fontSize: "auto",
        minFontSize: "8px",
        maxFontSize: "24px"
      },
      translationMode: "translation_only", // 'translation_only', 'parallel' hoặc 'language_learning'
      sourceLanguage: "auto", // 'auto' hoặc 'zh','en','vi',...
      targetLanguage: "vi", // 'vi', 'en', 'zh', 'ko', 'ja',...
      languageLearning: {
        showSource: true
      }
    },
    ttsOptions: {
      enabled: true,
      defaultProvider: 'google', // 'google', 'google_translate', 'local'
      defaultGeminiModel: 'gemini-2.5-flash-preview-tts',
      defaultModel: 'tts-1', // 'tts-1', 'tts-1-hd', 'gpt-4o-mini-tts'
      defaultSpeed: 1.0,
      defaultPitch: 1.0,
      defaultVolume: 1.0,
      defaultVoice: {
        gemini: { voice: 'Leda' },
        openai: { voice: 'sage' },
        google: {
          vi: { name: 'vi-VN-Standard-A', display: 'Google Nữ (Bắc) - Standard' },
          en: { name: 'en-US-Standard-A', display: 'US Female 1 - Standard' },
          zh: { name: 'cmn-CN-Standard-A', display: 'CN Female 1 - Standard' },
          ja: { name: 'ja-JP-Standard-A', display: 'JP Female 1 - Standard' },
          ko: { name: 'ko-KR-Standard-A', display: 'KR Female 1 - Standard' },
        }
      }
    },
    shortcuts: {
      settingsEnabled: true,
      enabled: true,
      pageTranslate: { key: "f", altKey: true },
      inputTranslate: { key: "t", altKey: true },
      quickTranslate: { key: "q", altKey: true },
      popupTranslate: { key: "e", altKey: true },
      advancedTranslate: { key: "a", altKey: true }
    },
    clickOptions: {
      enabled: true,
      singleClick: { translateType: "popup" },
      doubleClick: { translateType: "quick" },
      hold: { translateType: "advanced" }
    },
    touchOptions: {
      enabled: true,
      sensitivity: 100,
      twoFingers: { translateType: "popup" },
      threeFingers: { translateType: "advanced" },
      fourFingers: { translateType: "quick" }
    },
    cacheOptions: {
      text: {
        enabled: true,
        maxSize: CONFIG.CACHE.text.maxSize,
        expirationTime: CONFIG.CACHE.text.expirationTime
      },
      image: {
        enabled: true,
        maxSize: CONFIG.CACHE.image.maxSize,
        expirationTime: CONFIG.CACHE.image.expirationTime
      },
      media: {
        enabled: true,
        maxSize: CONFIG.CACHE.media.maxSize,
        expirationTime: CONFIG.CACHE.media.expirationTime
      }
    },
    rateLimit: {
      maxRequests: CONFIG.RATE_LIMIT.maxRequests,
      perMilliseconds: CONFIG.RATE_LIMIT.perMilliseconds
    }
  };
  class MobileOptimizer {
    constructor(ui) {
      this.ui = ui;
      this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (this.isMobile) {
        this.optimizeForMobile();
      }
    }
    optimizeForMobile() {
      this.reduceDOMOperations();
      this.optimizeTouchHandling();
      this.adjustUIForMobile();
    }
    reduceDOMOperations() {
      const observer = new MutationObserver((mutations) => {
        requestAnimationFrame(() => {
          mutations.forEach((mutation) => {
            if (mutation.type === "childList") {
              this.optimizeAddedNodes(mutation.addedNodes);
            }
          });
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    optimizeTouchHandling() {
      let touchStartY = 0;
      let touchStartX = 0;
      document.addEventListener(
        "touchstart",
        (e) => {
          touchStartY = e.touches[0].clientY;
          touchStartX = e.touches[0].clientX;
        },
        { passive: true }
      );
      document.addEventListener(
        "touchmove",
        (e) => {
          const touchY = e.touches[0].clientY;
          const touchX = e.touches[0].clientX;
          if (
            Math.abs(touchY - touchStartY) > 10 ||
            Math.abs(touchX - touchStartX) > 10
          ) {
            this.ui.removeTranslateButton();
          }
        },
        { passive: true }
      );
    }
    adjustUIForMobile() {
      const style = document.createElement("style");
      style.textContent = `
.translator-tools-container {
  bottom: 25px;
  right: 5px;
}
.translator-tools-button {
  padding: 8px 15px;
  font-size: 14px;
}
.translator-tools-dropdown {
  min-width: 208px;
  max-height: 90vh;
  overflow-y: auto;
}
.translator-tools-item {
  padding: 10px;
}
.draggable {
  max-width: 95vw;
  max-height: 80vh;
}
`;
      this.ui.shadowRoot.appendChild(style);
    }
    optimizeAddedNodes(nodes) {
      nodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const images = node.getElementsByTagName("img");
          Array.from(images).forEach((img) => {
            if (!img.loading) img.loading = "lazy";
          });
        }
      });
    }
  }
  // const bypassCSP = () => {
  //   const style = document.createElement("style");
  //   style.textContent = `
  //   .translator-tools-container {
  //     position: fixed;
  //     bottom: 40px;
  //     right: 25px;
  //     z-index: 2147483647;
  //     font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  //     display: block;
  //     visibility: visible;
  //     opacity: 1;
  //   }
  // `;
  //   this.shadowRoot.appendChild(style);
  // };
  class UserSettings {
    constructor(translator) {
      this.translator = translator;
      this.settings = this.loadSettings();
      this.isSettingsUIOpen = false;
      this.currentLanguage = CONFIG.LANG_DATA[this.settings.uiLanguage];
      if (!this.currentLanguage) {
        const browserLang = navigator.language || navigator.userLanguage;
        const langData = browserLang.startsWith('vi') ? 'vi' : 'en';
        this.currentLanguage = CONFIG.LANG_DATA[langData];
        this.settings.uiLanguage = langData;
        GM_setValue("translatorSettings", JSON.stringify(this.settings));
      }
    }
    _ = (key, replacements = {}) => {
      let text = key.split('.').reduce((obj, k) => obj && obj[k], this.currentLanguage);
      if (text === undefined) {
        console.warn(`Missing translation for key: ${key} in language ${this.settings.uiLanguage}`);
        text = key;
      }
      for (const placeholder in replacements) {
        text = text.replace(`{${placeholder}}`, replacements[placeholder]);
      }
      return text;
    }
    createProviderRadios(settings) {
      const providers = [
        ['gemini', 'Gemini'],
        ['perplexity', 'Perplexity'],
        ['claude', 'Claude'],
        ['openai', 'OpenAI'],
        ['mistral', 'Mistral'],
        ['puter', 'Puter']
      ];
      return `
<div style="margin-bottom: 15px;">
  <h3>API PROVIDER</h3>
  ${this.chunk(providers, 2).map(group => `
    <div class="radio-group">
      ${group.map(([value, label]) => `
        <label>
          <input type="radio" name="apiProvider" value="${value}"
            ${settings.apiProvider === value ? "checked" : ""}>
          <span class="settings-label">${label}</span>
        </label>
      `).join('')}
    </div>
  `).join('')}
</div>
`;
    }
    createApiKeySection(provider, settings) {
      const keys = settings.apiKey[provider];
      if (provider === 'puter') return '';
      return `
  <div id="${provider}Keys" style="margin-bottom: 10px;">
    <h4 class="settings-label" style="margin-bottom: 5px;">${this.capitalize(provider)} API Keys</h4>
    <div class="api-keys-container">
      ${keys.map((key, index) => `
        <div class="api-key-entry" style="display: flex; gap: 10px; margin-bottom: 5px;">
          <input type="text" class="${provider}-key" value="${key}"
            style="flex: 1; width: 100%; border-radius: 6px; margin-left: 5px;">
          <button class="remove-key" data-provider="${provider}" data-index="${index}"
            style="background-color: #ff4444;">×</button>
        </div>
      `).join('')}
    </div>
    <button id="add-${provider}-key" class="settings-label"
      style="background-color: #28a745; margin-top: 5px;">+ Add ${this.capitalize(provider)} Key</button>
  </div>
`;
    }
    createModelSection(provider, settings) {
      const options = settings[`${provider}Options`];
      const modelTypes = this.getModelTypesCss(provider);
      const config = CONFIG.API.providers[provider].models;
      return `
  <div class="${provider}-models" style="display: ${settings.apiProvider === provider ? "" : "none"}">
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.model_type")}</span>
      <select id="${provider}ModelType" class="settings-input">
        ${modelTypes.map(([value, label]) => `
          <option value="${value}" ${options?.modelType === value ? "selected" : ""}>${label}</option>
        `).join('')}
      </select>
    </div>
    ${modelTypes.map(([type]) => type !== 'custom' ? `
      <div id="${provider}-${type}-container" class="settings-grid"
        style="display: ${options?.modelType === type ? "" : "none"}">
        <span class="settings-label">Model ${this.capitalize(type)}:</span>
        <select id="${provider}-${type}-model" class="settings-input">
          ${config[type].map(model => `
            <option value="${model}" ${options?.[`${type}Model`] === model ? "selected" : ""}>
              ${model}
            </option>
          `).join('')}
        </select>
      </div>
    ` : `
      <div id="${provider}-custom-container" class="settings-grid"
        style="display: ${options?.modelType === 'custom' ? "" : "none"}">
        <span class="settings-label">Model tùy chỉnh:</span>
        <input type="text" id="${provider}-custom-model" class="settings-input"
          value="${options?.customModel || ''}" placeholder="Nhập tên model">
      </div>
    `).join('')}
  </div>
`;
    }
    getModelTypesCss(provider) {
      const types = {
        gemini: [['fast', 'Fast'], ['pro', 'Pro'], ['think', 'Thinkking']],
        mistral: [['free', 'Free'], ['research', 'Research'], ['premier', 'Premier']],
        default: [['fast', 'Fast'], ['balance', 'Balance'], ['pro', 'Pro']]
      };
      const baseTypes = types[provider] || types.default;
      return [...baseTypes, ['custom', 'Custom']];
    }
    getModelTypes(provider) {
      const types = {
        gemini: ['fast', 'pro', 'think'],
        mistral: ['free', 'research', 'premier'],
        default: ['fast', 'balance', 'pro']
      };
      const baseTypes = types[provider] || types.default;
      return [...baseTypes, 'custom'];
    }
    capitalize(str) {
      if (str === "openai") return "OpenAI";
      return str.charAt(0).toUpperCase() + str.slice(1);
    }
    chunk(arr, size) {
      return Array.from({ length: Math.ceil(arr.length / size) }, (_v, i) =>
        arr.slice(i * size, i * size + size)
      );
    }
    renderSettingsUI(settings) {
      return `
${this.createProviderRadios(settings)}
<div style="margin-bottom: 15px;">
  <h3>API MODEL</h3>
  ${['gemini', 'perplexity', 'claude', 'openai', 'mistral', 'puter']
          .map(p => this.createModelSection(p, settings)).join('')}
</div>
<div style="margin-bottom: 15px;">
  <h3>API KEYS</h3>
  ${['gemini', 'perplexity', 'claude', 'openai', 'mistral']
          .map(p => this.createApiKeySection(p, settings)).join('')}
</div>
`;
    }
    createSettingsUI() {
      if (this.isSettingsUIOpen) {
        return;
      }
      this.isSettingsUIOpen = true;
      const container = document.createElement("div");
      const themeMode = this.settings.theme ? this.settings.theme : CONFIG.THEME.mode;
      const theme = CONFIG.THEME[themeMode];
      const isDark = themeMode === "dark";
      const backupVoice = (provider, name, lang = '') => {
        const voice = this.settings.ttsOptions?.defaultVoice?.[provider];
        if (provider === 'openai' || provider === 'gemini') {
          if (voice?.voice) {
            return voice.voice === name;
          } else if (provider === 'gemini') {
            return name === 'Leda';
          } else if (provider === 'openai') {
            return name === 'sage';
          }
        }
        if (voice?.[lang]?.name) {
          return voice[lang].name === name;
        } else {
          return name.endsWith('Wavenet-A');
        }
      }
      const resetStyle = `
* {
  box-sizing: border-box;
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  margin: 0;
  padding: 0;
}
.settings-grid {
  display: grid;
  grid-template-columns: minmax(150px, 50%) minmax(100px, 53%);
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.settings-label {
  min-width: 100px;
  text-align: left;
  padding-right: 10px;
}
.settings-input {
  min-width: 100px;
  margin-left: 5px;
}
h2 {
  flex: 1;
  display: flex;
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  align-items: center;
  justify-content: center;
  margin-bottom: 15px;
  font-weight: bold;
  background-image: linear-gradient(
    90deg,
    #FF0000 0%,   /* Đỏ */
    #FFA500 15%,  /* Cam */
    #FFFF00 30%,  /* Vàng */
    #008000 45%,  /* Xanh lá */
    #0000FF 60%,  /* Xanh dương */
    #4B0082 75%,  /* Chàm */
    #EE82EE 90%,  /* Tím */
    #FF0000 100%  /* Lặp lại màu đỏ để chuyển động mượt */
  );
  background-size: 400% auto; /* Tăng kích thước nền lên 400% hoặc hơn để đủ không gian cho hiệu ứng chạy */
  animation: text-shimmer 9s linear infinite; /* Tăng thời gian animation để màu chuyển động mượt hơn */
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  grid-column: 1 / -1;
}
@keyframes text-shimmer {
  0% {
    background-position: -200% 0; /* Bắt đầu từ bên trái của gradient */
  }
  100% {
    background-position: 200% 0;  /* Kết thúc ở bên phải của gradient */
  }
}
h3 {
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  margin-bottom: 15px;
  font-weight: bold;
  color: ${theme.title};
  grid-column: 1 / -1;
}
h4 {
  color: ${isDark ? "#dddddd" : "#333333"};
}
input[type="radio"],
input[type="checkbox"] {
  align-items: center;
  justify-content: center;
}
button {
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  font-size: 14px;
  background-color: ${isDark ? "#444" : "#ddd"};
  color: ${isDark ? "#ddd" : "#000"};
  padding: 5px 15px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  margin: 5px;
  font-weight: 500;
  letter-spacing: 0.3px;
}
button:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.3);
}
button:active {
  transform: translateY(0);
}
#cancelSettings {
  background-color: ${isDark ? "#666" : "#ddd"};
  color: ${isDark ? "#ddd" : "#000"};
  padding: 5px 15px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  margin: 5px;
}
#cancelSettings:hover {
  background-color: ${isDark ? "#888" : "#aaa"};
}
#saveSettings {
  background-color: #007BFF;
  padding: 5px 15px;
  border-radius: 8px;
  cursor: pointer;
  border: none;
  margin: 5px;
}
#saveSettings:hover {
  background-color: #009ddd;
}
#exportSettings:hover {
  background-color: #218838;
}
#importSettings:hover {
  background-color: #138496;
}
@keyframes buttonPop {
  0% { transform: scale(1); }
  50% { transform: scale(0.98); }
  100% { transform: scale(1); }
}
button:active {
  animation: buttonPop 0.2s ease;
}
.radio-group {
    display: flex;
    gap: 15px;
}
.radio-group label {
    flex: 1;
    display: flex;
    color: ${isDark ? "#ddd" : "#000"};
    align-items: center;
    justify-content: center;
    padding: 5px;
}
.radio-group input[type="radio"] {
    margin-right: 5px;
}
.shortcut-container {
    display: flex;
    align-items: center;
    gap: 8px;
}
.shortcut-prefix {
    white-space: nowrap;
    color: ${isDark ? "#aaa" : "#555"};
    font-size: 14px;
    min-width: 45px;
}
.shortcut-input {
    flex: 1;
    min-width: 60px;
    max-width: 100px;
}
.prompt-textarea {
  width: 100%;
  min-height: 100px;
  margin: 5px 0;
  padding: 8px;
  background-color: ${isDark ? "#444" : "#fff"};
  color: ${isDark ? "#fff" : "#000"};
  border: 1px solid ${isDark ? "#666" : "#ccc"};
  border-radius: 8px;
  font-family: monospace;
  font-size: 13px;
  resize: vertical;
}
`;
      const styleElement = document.createElement("style");
      styleElement.textContent = resetStyle;
      container.appendChild(styleElement);
      container.innerHTML += `
<h2 style="position: sticky; top: 0; background-color: ${theme.background}; padding: 20px; margin: 0; z-index: 2147483647; border-bottom: 1px solid ${theme.border}; border-radius: 15px 15px 0 0;">${this._("settings.title")}</h2>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.interface_section")}</h3>
  <span class="settings-label">${this._("settings.theme_mode")}</span>
  <div class="radio-group" style="margin-bottom: 8px;">
    <label>
      <input type="radio" name="theme" value="light" ${!isDark ? "checked" : ""} style="margin-bottom: 5px;">
      <span class="settings-label" style="margin-bottom: 5px;">${this._("settings.light")}</span>
    </label>
    <label>
      <input type="radio" name="theme" value="dark" ${isDark ? "checked" : ""} style="margin-bottom: 5px;">
      <span class="settings-label" style="margin-bottom: 5px;">${this._("settings.dark")}</span>
    </label>
  </div>
  <span class="settings-label">${this._("settings.ui_language")}</span>
  <div class="radio-group">
    <label>
      <input type="radio" name="uiLanguage" value="en" ${this.settings.uiLanguage === "en" ? "checked" : ""}>
      <span class="settings-label">English</span>
    </label>
    <label>
      <input type="radio" name="uiLanguage" value="vi" ${this.settings.uiLanguage === "vi" ? "checked" : ""}>
      <span class="settings-label">Tiếng Việt</span>
    </label>
  </div>
</div>
<div class="puter-sign" style="display: ${this.settings.apiProvider === "puter" ? "" : "none"}; margin-bottom: 15px;">
  <h3>${this._("settings.account_puter")}</h3>
  <div class="settings-grid">
    <button id="puter-signin" class="settings-label" style="background-color: #28a745; margin-top: 5px;">${this._("settings.sign_in")}</button>
    <button id="puter-signout" class="settings-input" style="background-color: ${isDark ? "#202020" : "#999"};">${this._("settings.sign_out")}</button>
  </div>
</div>
${this.renderSettingsUI(this.settings)}
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.input_translation_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_feature")}</span>
    <input type="checkbox" id="inputTranslationEnabled" ${this.settings.inputTranslation?.enabled ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.save_position")}</span>
    <input type="checkbox" id="inputTranslationSavePosition" ${this.settings.inputTranslation?.savePosition ? "checked" : ""}>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.tools_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_tools")}</span>
    <input type="checkbox" id="ToolsEnabled" ${this.settings.translatorTools?.enabled ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_tools_current_web")}</span>
    <input type="checkbox" id="showTranslatorTools" ${localStorage.getItem("translatorToolsEnabled") === "true" ? "checked" : ""}>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.page_translation_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_page_translation")}</span>
    <input type="checkbox" id="pageTranslationEnabled" ${this.settings.pageTranslation?.enabled ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.show_initial_button")}</span>
    <input type="checkbox" id="showInitialButton" ${this.settings.pageTranslation?.showInitialButton ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.auto_translate_page")}</span>
    <input type="checkbox" id="autoTranslatePage" ${this.settings.pageTranslation?.autoTranslate ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_google_translate_page")}</span>
    <input type="checkbox" id="enableGoogleTranslate" ${this.settings.pageTranslation?.enableGoogleTranslate ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.google_translate_layout")}</span>
    <select id="googleTranslateLayout" class="settings-input">
      <option value="SIMPLE" ${this.settings.pageTranslation?.googleTranslateLayout === "SIMPLE" ? "selected" : ""}>${this._("settings.google_translate_minimal")}</option>
      <option value="INLINE" ${this.settings.pageTranslation?.googleTranslateLayout === "INLINE" ? "selected" : ""}>${this._("settings.google_translate_inline")}</option>
      <option value="OVERLAY" ${this.settings.pageTranslation?.googleTranslateLayout === "OVERLAY" ? "selected" : ""}>${this._("settings.google_translate_selected")}</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.custom_selectors")}</span>
    <input type="checkbox" id="useCustomSelectors" ${this.settings.pageTranslation?.useCustomSelectors ? "checked" : ""}>
  </div>
  <div id="selectorsSettings" style="display: ${this.settings.pageTranslation?.useCustomSelectors ? "block" : "none"}">
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.exclude_selectors")}</span>
      <div style="flex: 1;">
        <textarea id="customSelectors"
          style="width: 100%; min-height: 100px; margin: 5px 0; padding: 8px;
          background-color: ${isDark ? "#444" : "#fff"};
          color: ${isDark ? "#fff" : "#000"};
          border: 1px solid ${isDark ? "#666" : "#ccc"};
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;"
        >${this.settings.pageTranslation?.customSelectors?.join("\n") || ""
        }</textarea>
        <div style="font-size: 12px; color: ${isDark ? "#999" : "#666"
        }; margin-top: 4px;">
          ${this._("settings.one_selector_per_line")}
        </div>
      </div>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.default_selectors")}</span>
      <div style="flex: 1;">
        <textarea id="defaultSelectors" readonly
          style="width: 100%; min-height: 100px; margin: 5px 0; padding: 8px;
          background-color: ${isDark ? "#333" : "#f5f5f5"};
          color: ${isDark ? "#999" : "#666"};
          border: 1px solid ${isDark ? "#555" : "#ddd"};
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;"
        >${this.settings.pageTranslation?.defaultSelectors?.join("\n") || ""
        }</textarea>
        <div style="font-size: 12px; color: ${isDark ? "#999" : "#666"
        }; margin-top: 4px;">
          ${this._("settings.default_selectors_info")}
        </div>
      </div>
    </div>
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.combine_with_default")}</span>
      <input type="checkbox" id="combineWithDefault" ${this.settings.pageTranslation?.combineWithDefault ? "checked" : ""
        }>
      <div style="font-size: 12px; color: ${isDark ? "#999" : "#666"
        }; margin-top: 4px; grid-column: 2;">
        ${this._("settings.combine_with_default_info")}
      </div>
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.temperature")}</span>
    <input type="number" id="pageTranslationTemperature" class="settings-input"
      value="${this.settings.pageTranslation.generation.temperature}"
      min="0" max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.top_p")}</span>
    <input type="number" id="pageTranslationTopP" class="settings-input"
      value="${this.settings.pageTranslation.generation.topP}"
      min="0" max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.top_k")}</span>
    <input type="number" id="pageTranslationTopK" class="settings-input"
      value="${this.settings.pageTranslation.generation.topK}"
      min="1" max="100" step="1">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.prompt_settings_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.use_custom_prompt")}</span>
    <input type="checkbox" id="useCustomPrompt" ${this.settings.promptSettings?.useCustom ? "checked" : ""
        }>
  </div>
  <div id="promptSettings" style="display: ${this.settings.promptSettings?.useCustom ? "block" : "none"
        }">
    <!-- Normal prompts -->
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_normal")}</span>
      <textarea id="normalPrompt" class="prompt-textarea"
        placeholder="${this._("settings.prompt_normal")}"
      >${this.settings.promptSettings?.customPrompts?.normal || ""}</textarea>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_normal_chinese")}</span>
      <textarea id="normalPrompt_chinese" class="prompt-textarea"
        placeholder="${this._("settings.prompt_normal_chinese")}"
      >${this.settings.promptSettings?.customPrompts?.normal_chinese || ""
        }</textarea>
    </div>
    <!-- Advanced prompts -->
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_advanced")}</span>
      <textarea id="advancedPrompt" class="prompt-textarea"
        placeholder="${this._("settings.prompt_advanced")}"
      >${this.settings.promptSettings?.customPrompts?.advanced || ""}</textarea>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_advanced_chinese")}</span>
      <textarea id="advancedPrompt_chinese" class="prompt-textarea"
        placeholder="${this._("settings.prompt_advanced_chinese")}"
      >${this.settings.promptSettings?.customPrompts?.advanced_chinese || ""
        }</textarea>
    </div>
    <!-- OCR prompts -->
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_ocr")}</span>
      <textarea id="ocrPrompt" class="prompt-textarea"
        placeholder="${this._("settings.prompt_ocr")}"
      >${this.settings.promptSettings?.customPrompts?.ocr || ""}</textarea>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_ocr_chinese")}</span>
      <textarea id="ocrPrompt_chinese" class="prompt-textarea"
        placeholder="${this._("settings.prompt_ocr_chinese")}"
      >${this.settings.promptSettings?.customPrompts?.ocr_chinese || ""
        }</textarea>
    </div>
    <!-- Media prompts -->
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_media")}</span>
      <textarea id="mediaPrompt" class="prompt-textarea"
        placeholder="${this._("settings.prompt_media")}"
      >${this.settings.promptSettings?.customPrompts?.media || ""}</textarea>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_media_chinese")}</span>
      <textarea id="mediaPrompt_chinese" class="prompt-textarea"
        placeholder="${this._("settings.prompt_media_chinese")}"
      >${this.settings.promptSettings?.customPrompts?.media_chinese || ""
        }</textarea>
    </div>
    <!-- Page prompts -->
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_page")}</span>
      <textarea id="pagePrompt" class="prompt-textarea"
        placeholder="${this._("settings.prompt_page")}"
      >${this.settings.promptSettings?.customPrompts?.page || ""}</textarea>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_page_chinese")}</span>
      <textarea id="pagePrompt_chinese" class="prompt-textarea"
        placeholder="${this._("settings.prompt_page_chinese")}"
      >${this.settings.promptSettings?.customPrompts?.page_chinese || ""
        }</textarea>
    </div>
    <!-- File Content prompts -->
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_file_content")}</span>
      <textarea id="fileContentPrompt" class="prompt-textarea"
        placeholder="${this._("settings.prompt_file_content")}"
      >${this.settings.promptSettings?.customPrompts?.file_content || ""}</textarea>
    </div>
    <div class="settings-grid" style="align-items: start;">
      <span class="settings-label">${this._("settings.prompt_file_content_chinese")}</span>
      <textarea id="fileContentPrompt_chinese" class="prompt-textarea"
        placeholder="${this._("settings.prompt_file_content_chinese")}"
      >${this.settings.promptSettings?.customPrompts?.file_content_chinese || ""
        }</textarea>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: ${isDark ? "#999" : "#666"
        };">
      ${this._("settings.prompt_vars_info")}
      <ul style="margin-left: 20px;">
        <li>${this._("settings.prompt_var_text")}</li>
        <li>${this._("settings.prompt_var_doc_title")}</li>
        <li>${this._("settings.prompt_var_target_lang")}</li>
        <li>${this._("settings.prompt_var_source_lang")}</li>
      </ul>
    </div>
    <div style="margin-top: 10px; font-size: 12px; color: ${isDark ? "#999" : "#666"
        };">
      ${this._("settings.prompt_notes")}
      <ul style="margin-left: 20px;">
        <li>${this._("settings.prompt_notes_required")}</li>
        <li>${this._("settings.prompt_note_en")}</li>
        <li>${this._("settings.prompt_note_zh")}</li>
      </ul>
    </div>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.ocr_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_ocr")}</span>
    <input type="checkbox" id="ocrEnabled" ${this.settings.ocrOptions?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.temperature")}</span>
    <input type="number" id="ocrTemperature" class="settings-input" value="${this.settings.ocrOptions.temperature
        }"
      min="0" max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.top_p")}</span>
    <input type="number" id="ocrTopP" class="settings-input" value="${this.settings.ocrOptions.topP
        }" min="0" max="1"
      step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.top_k")}</span>
    <input type="number" id="ocrTopK" class="settings-input" value="${this.settings.ocrOptions.topK
        }" min="1"
      max="100" step="1">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.media_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_media")}</span>
    <input type="checkbox" id="mediaEnabled" ${this.settings.mediaOptions.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.temperature")}</span>
    <input type="number" id="mediaTemperature" class="settings-input"
      value="${this.settings.mediaOptions.temperature
        }" min="0" max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.top_p")}</span>
    <input type="number" id="mediaTopP" class="settings-input" value="${this.settings.mediaOptions.topP
        }" min="0"
      max="1" step="0.1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.top_k")}</span>
    <input type="number" id="mediaTopK" class="settings-input" value="${this.settings.mediaOptions.topK
        }" min="1"
      max="100" step="1">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.video_streaming_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_feature")}</span>
    <input type="checkbox" id="videoStreamingEnabled"
      ${this.settings.videoStreamingOptions?.enabled ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.font_size")}</span>
    <input type="text" id="videoStreamingFontSize" class="settings-input" placeholder="clamp(1rem, 1.5cqw, 2.5rem)"
      value="${this.settings.videoStreamingOptions?.fontSize}">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.background_color")}</span>
    <input type="text" id="videoStreamingBgColor" class="settings-input" placeholder="rgba(0,0,0,0.7)"
      value="${this.settings.videoStreamingOptions?.backgroundColor}">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.text_color")}</span>
    <input type="text" id="videoStreamingTextColor" class="settings-input" placeholder="white"
      value="${this.settings.videoStreamingOptions?.textColor}">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.display_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.display_mode")}</span>
    <select id="displayMode" class="settings-input">
      <option value="translation_only" ${this.settings.displayOptions.translationMode === "translation_only" ? "selected" : ""}>${this._("settings.translation_only")}</option>
      <option value="parallel" ${this.settings.displayOptions.translationMode === "parallel" ? "selected" : ""}>${this._("settings.parallel")}</option>
      <option value="language_learning" ${this.settings.displayOptions.translationMode === "language_learning" ? "selected" : ""}>${this._("settings.language_learning")}</option>
    </select>
  </div>
  <div id="languageLearningOptions" style="display: ${this.settings.displayOptions.translationMode === "language_learning" ? "block" : "none"}">
    <div id="sourceOption" class="settings-grid">
      <span class="settings-label">${this._("settings.show_source")}</span>
      <input type="checkbox" id="showSource" ${this.settings.displayOptions.languageLearning.showSource ? "checked" : ""}>
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.source_language")}</span>
    <select id="sourceLanguage" class="settings-input">
      <option value="auto" ${this.settings.displayOptions.sourceLanguage === "auto" ? "selected" : ""}>${this._("auto_detect")}</option>
      ${Object.entries(CONFIG.LANGUAGES).map(([lang, name]) => `
      <option value="${lang}" ${this.settings.displayOptions.sourceLanguage === lang ? 'selected' : ''
          }>${name}</option>
      `).join('')}
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.target_language")}</span>
    <select id="targetLanguage" class="settings-input">
      ${Object.entries(CONFIG.LANGUAGES).map(([lang, name]) => `
      <option value="${lang}" ${this.settings.displayOptions.targetLanguage === lang ? 'selected' : ''
            }>${name}</option>
      `).join('')}
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.web_image_font_size")}</span>
    <input type="text" id="webImageFontSize" class="settings-input" placeholder="auto"
      value="${this.settings.displayOptions?.webImageTranslation?.fontSize}">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.popup_font_size")}</span>
    <input type="text" id="fontSize" class="settings-input" placeholder="1rem"
      value="${this.settings.displayOptions?.fontSize}">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.min_popup_width")}</span>
    <input type="text" id="minPopupWidth" class="settings-input" placeholder="330px"
      value="${this.settings.displayOptions?.minPopupWidth}">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.max_popup_width")}</span>
    <input type="text" id="maxPopupWidth" class="settings-input" placeholder="50vw"
      value="${this.settings.displayOptions?.maxPopupWidth}">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.tts_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_tts")}</span>
    <input class="settings-input" type="checkbox" id="ttsEnabled" ${this.settings.ttsOptions?.enabled ? "checked" : ""}>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.tts_source")}</span>
    <select id="tts-provider" class="settings-input">
      <option value="google" ${this.settings.ttsOptions?.defaultProvider === "google" ? "selected" : ""}>Google Cloud TTS</option>
      <option value="google_translate" ${this.settings.ttsOptions?.defaultProvider === "google_translate" ? "selected" : ""}>Google Translate TTS</option>
      <option value="gemini" ${this.settings.ttsOptions?.defaultProvider === "gemini" ? "selected" : ""}>Gemini AI TTS</option>
      <option value="openai" ${this.settings.ttsOptions?.defaultProvider === "openai" ? "selected" : ""}>OpenAI TTS</option>
      <option value="local" ${this.settings.ttsOptions?.defaultProvider === "local" ? "selected" : ""}>TTS Thiết bị</option>
    </select>
  </div>
  <div id="tts-gemini-container" style="display: ${this.settings.ttsOptions?.defaultProvider === 'gemini' ? "block" : "none"}">
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.model_label")} TTS:</span>
      <select id="tts-gemini-model" class="settings-input">
        ${CONFIG.TTS.GEMINI.MODEL.map(model => `
          <option value="${model}" ${this.settings.ttsOptions?.defaultGeminiModel === model ? "selected" : ""}>${model}</option>
        `).join('')}
      </select>
    </div>
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.voice")}:</span>
      <select id="tts-gemini-select" class="settings-input">
      ${CONFIG.TTS.GEMINI.VOICES.map(voice => `
        <option value="${voice}" ${backupVoice('gemini', voice) ? 'selected' : ''}>${voice}</option>
      `).join('')}
      </select>
    </div>
  </div>
  <div id="tts-openai-container" style="display: ${this.settings.ttsOptions?.defaultProvider === 'openai' ? "block" : "none"}">
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.model_label")} TTS:</span>
      <select id="tts-openai-model" class="settings-input">
        ${CONFIG.TTS.OPENAI.MODEL.map(model => `
          <option value="${model}" ${this.settings.ttsOptions?.defaultModel === model ? "selected" : ""}>${model}</option>
        `).join('')}
      </select>
    </div>
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.voice")}:</span>
      <select id="tts-openai-select" class="settings-input">
      ${CONFIG.TTS.OPENAI.VOICES.map(voice => `
        <option value="${voice}" ${backupVoice('openai', voice) ? 'selected' : ''}>${voice}</option>
      `).join('')}
      </select>
    </div>
  </div>
  <div id="tts-google-container" style="display: ${this.settings.ttsOptions?.defaultProvider === 'google' ? "block" : "none"}">
    <h4 style="margin: 0 0 8px 8px;">${this._("settings.default_voice")}</h4>
      ${Object.entries(CONFIG.TTS.GOOGLE.VOICES).map(([lang, voiceList]) => `
      <div class="settings-grid" style="margin: 0 0 8px 8px;">
        <label class="settings-label" style="color: ${isDark ? "#aaa" : "#666"}">${CONFIG.LANGUAGEDISPLAY[lang].display}:</label>
        <select class="settings-input" id="tts-google-select" data-lang="${lang}">
        ${voiceList.map(voice => `
          <option value="${voice.name}" ${backupVoice('google', voice.name, lang) ? 'selected' : ''}>
            ${voice.display}
          </option>
        `).join('')}
        </select>
      </div>
      `).join('')}
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.speed")}</span>
    <div class="settings-input" style="display:flex;align-items:center;gap:8px">
      <input type="range" id="ttsDefaultSpeed" style="flex:1;height:4px;outline:none"
        value="${this.settings.ttsOptions?.defaultSpeed || 1.0}" min="0.1" max="2" step="0.1">
      <span style="min-width:36px;margin-right:5px;text-align:right">${this.settings.ttsOptions?.defaultSpeed || 1.0}</span>
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.pitch")}</span>
    <div class="settings-input" style="display:flex;align-items:center;gap:8px">
      <input type="range" id="ttsDefaultPitch" style="flex:1;height:4px;outline:none"
        value="${this.settings.ttsOptions?.defaultPitch || 1.0}" min="0" max="2" step="0.1">
      <span style="min-width:36px;margin-right:5px;text-align:right">${this.settings.ttsOptions?.defaultPitch || 1.0}</span>
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.volume")}</span>
    <div class="settings-input" style="display:flex;align-items:center;gap:8px">
      <input type="range" id="ttsDefaultVolume" style="flex:1;height:4px;outline:none"
        value="${this.settings.ttsOptions?.defaultVolume || 1.0}" min="0" max="1" step="0.1">
      <span style="min-width:36px;margin-right:5px;text-align:right">${this.settings.ttsOptions?.defaultVolume || 1.0}</span>
    </div>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.context_menu_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_context_menu")}</span>
    <input type="checkbox" id="contextMenuEnabled" ${this.settings.contextMenu?.enabled ? "checked" : ""
        }>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.shortcuts_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_settings_shortcut")}</span>
    <input type="checkbox" id="settingsShortcutEnabled" ${this.settings.shortcuts?.settingsEnabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_translation_shortcuts")}</span>
    <input type="checkbox" id="shortcutsEnabled" ${this.settings.shortcuts?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.page_translate_shortcut")}:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Cmd/Alt\u2003+</span>
      <input type="text" id="pageTranslateKey" class="shortcut-input settings-input"
        value="${this.settings.shortcuts.pageTranslate.key}">
    </div>
  </div>
  <div class="settings-grid">
      <span class="settings-label">${this._("settings.input_translate_shortcut")}:</span>
      <div class="shortcut-container">
          <span class="shortcut-prefix">Cmd/Alt\u2003+</span>
          <input type="text" id="inputTranslationKey" class="shortcut-input settings-input"
              value="${this.settings.shortcuts.inputTranslate.key}">
      </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.quick_translate_shortcut")}:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Cmd/Alt\u2003+</span>
      <input type="text" id="quickKey" class="shortcut-input settings-input"
        value="${this.settings.shortcuts.quickTranslate.key}">
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.popup_translate_shortcut")}:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Cmd/Alt\u2003+</span>
      <input type="text" id="popupKey" class="shortcut-input settings-input"
        value="${this.settings.shortcuts.popupTranslate.key}">
    </div>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.advanced_translate_shortcut")}:</span>
    <div class="shortcut-container">
      <span class="shortcut-prefix">Cmd/Alt\u2003+</span>
      <input type="text" id="advancedKey" class="shortcut-input settings-input" value="${this.settings.shortcuts.advancedTranslate.key
        }">
    </div>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.button_options_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_translation_button")}</span>
    <input type="checkbox" id="translationButtonEnabled" ${this.settings.clickOptions?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.single_click")}</span>
    <select id="singleClickSelect" class="settings-input">
      <option value="quick" ${this.settings.clickOptions.singleClick.translateType === "quick" ? "selected" : ""}>${this._("settings.quick_translate_shortcut")}</option>
      <option value="popup" ${this.settings.clickOptions.singleClick.translateType === "popup" ? "selected" : ""}>${this._("settings.popup_translate_shortcut")}</option>
      <option value="advanced" ${this.settings.clickOptions.singleClick.translateType === "advanced" ? "selected" : ""}>${this._("settings.advanced_translate_shortcut")}</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.double_click")}</span>
    <select id="doubleClickSelect" class="settings-input">
      <option value="quick" ${this.settings.clickOptions.doubleClick.translateType === "quick" ? "selected" : ""}>${this._("settings.quick_translate_shortcut")}</option>
      <option value="popup" ${this.settings.clickOptions.doubleClick.translateType === "popup" ? "selected" : ""}>${this._("settings.popup_translate_shortcut")}</option>
      <option value="advanced" ${this.settings.clickOptions.doubleClick.translateType === "advanced" ? "selected" : ""}>${this._("settings.advanced_translate_shortcut")}</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.hold_button")}</span>
    <select id="holdSelect" class="settings-input">
      <option value="quick" ${this.settings.clickOptions.hold.translateType === "quick" ? "selected" : ""}>${this._("settings.quick_translate_shortcut")}</option>
      <option value="popup" ${this.settings.clickOptions.hold.translateType === "popup" ? "selected" : ""}>${this._("settings.popup_translate_shortcut")}</option>
      <option value="advanced" ${this.settings.clickOptions.hold.translateType === "advanced" ? "selected" : ""}>${this._("settings.advanced_translate_shortcut")}</option>
    </select>
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.touch_options_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.enable_touch")}</span>
    <input type="checkbox" id="touchEnabled" ${this.settings.touchOptions?.enabled ? "checked" : ""
        }>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.two_fingers")}</span>
    <select id="twoFingersSelect" class="settings-input">
      <option value="quick" ${this.settings.touchOptions?.twoFingers?.translateType === "quick" ? "selected" : ""}>${this._("settings.quick_translate_shortcut")}</option>
      <option value="popup" ${this.settings.touchOptions?.twoFingers?.translateType === "popup" ? "selected" : ""}>${this._("settings.popup_translate_shortcut")}</option>
      <option value="advanced" ${this.settings.touchOptions?.twoFingers?.translateType === "advanced" ? "selected" : ""}>${this._("settings.advanced_translate_shortcut")}</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.three_fingers")}</span>
    <select id="threeFingersSelect" class="settings-input">
      <option value="quick" ${this.settings.touchOptions?.threeFingers?.translateType === "quick" ? "selected" : ""}>${this._("settings.quick_translate_shortcut")}</option>
      <option value="popup" ${this.settings.touchOptions?.threeFingers?.translateType === "popup" ? "selected" : ""}>${this._("settings.popup_translate_shortcut")}</option>
      <option value="advanced" ${this.settings.touchOptions?.threeFingers?.translateType === "advanced" ? "selected" : ""}>${this._("settings.advanced_translate_shortcut")}</option>
    </select>
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.sensitivity")}</span>
    <input type="number" id="touchSensitivity" class="settings-input"
      value="${this.settings.touchOptions?.sensitivity || 100
        }" min="50" max="350" step="50">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.rate_limit_section")}</h3>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.max_requests")}</span>
    <input type="number" id="maxRequests" class="settings-input" value="${this.settings.rateLimit?.maxRequests || CONFIG.RATE_LIMIT.maxRequests
        }" min="1" max="50" step="1">
  </div>
  <div class="settings-grid">
    <span class="settings-label">${this._("settings.per_milliseconds")}</span>
    <input type="number" id="perMilliseconds" class="settings-input" value="${this.settings.rateLimit?.perMilliseconds ||
        CONFIG.RATE_LIMIT.perMilliseconds
        }" min="1000" step="1000">
  </div>
</div>
<div style="margin-bottom: 15px;">
  <h3>${this._("settings.cache_section")}</h3>
  <div style="margin-bottom: 10px;">
    <h4 style="margin-bottom: 8px;">${this._("settings.text_cache")}</h4>
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.enable_text_cache")}</span>
      <input type="checkbox" id="textCacheEnabled" ${this.settings.cacheOptions?.text?.enabled ? "checked" : ""
        }>
    </div>
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.text_cache_max_size")}</span>
      <input type="number" id="textCacheMaxSize" class="settings-input" value="${this.settings.cacheOptions?.text?.maxSize || CONFIG.CACHE.text.maxSize
        }" min="10" max="1000">
    </div>
    <div class="settings-grid">
      <span class="settings-label">${this._("settings.text_cache_expiration")}</span>
      <input type="number" id="textCacheExpiration" class="settings-input" value="${this.settings.cacheOptions?.text?.expirationTime ||
        CONFIG.CACHE.text.expirationTime
        }" min="60000" step="60000">
    </div>
    <div style="margin-bottom: 10px;">
      <h4 style="margin-bottom: 8px;">${this._("settings.image_cache")}</h4>
      <div class="settings-grid">
        <span class="settings-label">${this._("settings.enable_image_cache")}</span>
        <input type="checkbox" id="imageCacheEnabled" ${this.settings.cacheOptions?.image?.enabled ? "checked" : ""
        }>
      </div>
      <div class="settings-grid">
        <span class="settings-label">${this._("settings.image_cache_max_size")}</span>
        <input type="number" id="imageCacheMaxSize" class="settings-input" value="${this.settings.cacheOptions?.image?.maxSize ||
        CONFIG.CACHE.image.maxSize
        }" min="10" max="100">
      </div>
      <div class="settings-grid">
        <span class="settings-label">${this._("settings.image_cache_expiration")}</span>
        <input type="number" id="imageCacheExpiration" class="settings-input" value="${this.settings.cacheOptions?.image?.expirationTime ||
        CONFIG.CACHE.image.expirationTime
        }" min="60000" step="60000">
      </div>
    </div>
    <div style="margin-bottom: 10px;">
      <h4 style="margin-bottom: 8px;">${this._("settings.media_cache")}</h4>
      <div class="settings-grid">
        <span class="settings-label">${this._("settings.enable_media_cache")}</span>
        <input type="checkbox" id="mediaCacheEnabled" ${this.settings.cacheOptions.media?.enabled ? "checked" : ""
        }>
      </div>
      <div class="settings-grid">
        <span class="settings-label">${this._("settings.media_cache_max_size")}</span>
        <input type="number" id="mediaCacheMaxSize" class="settings-input" value="${this.settings.cacheOptions.media?.maxSize ||
        CONFIG.CACHE.media.maxSize
        }" min="5" max="100">
      </div>
      <div class="settings-grid">
        <span class="settings-label">${this._("settings.media_cache_expiration")}</span>
        <input type="number" id="mediaCacheExpirationTime" class="settings-input" value="${this.settings.cacheOptions.media?.expirationTime / 1000 ||
        CONFIG.CACHE.media.expirationTime / 1000
        }" min="60000" step="60000">
      </div>
    </div>
  </div>
</div>
<div style="border-top: 1px solid ${isDark ? "#444" : "#ddd"
        }; margin-top: 20px; padding-top: 20px;">
  <h3>${this._("settings.backup_settings_section")}</h3>
  <div style="display: flex; gap: 10px; margin-bottom: 15px;">
    <button id="exportSettings" style="flex: 1; background-color: #28a745; min-width: 140px; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7 10 12 15 17 10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      ${this._("settings.export_settings")}
    </button>
    <input type="file" id="importInput" accept=".json" style="display: none;">
    <button id="importSettings" style="flex: 1; background-color: #17a2b8; min-width: 140px; height: 36px; display: flex; align-items: center; justify-content: center; gap: 8px;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      ${this._("settings.import_settings")}
    </button>
  </div>
</div>
<div style="position: sticky; bottom: 0; background-color: ${theme.background}; padding: 20px; margin-top: 20px; border-top: 1px solid ${theme.border}; z-index: 2147483647; border-radius: 0 0 15px 15px;">
  <div style="display: flex; gap: 10px; justify-content: flex-end;">
    <button id="cancelSettings" style="min-width: 100px; height: 36px; background-color: ${isDark ? "#666" : "#e9ecef"
        }; color: ${isDark ? "#fff" : "#333"};">
      ${this._("settings.cancel")}
    </button>
    <button id="saveSettings" style="min-width: 100px; height: 36px; background-color: #007bff; color: white;">
      ${this._("settings.save")}
    </button>
  </div>
</div>
`;
      container.className = "translator-settings-container";
      const providers = ['gemini', 'perplexity', 'claude', 'openai', 'mistral', 'puter'];
      container.querySelectorAll('input[name="apiProvider"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const provider = e.target.value;
          container.querySelector('.puter-sign').style.display = provider === "puter" ? '' : 'none';
          providers.forEach(p => {
            const modelsContainer = container.querySelector(`.${p}-models`);
            const keysContainer = container.querySelector(`#${p}Keys`);
            if (modelsContainer) modelsContainer.style.display = p === provider ? '' : 'none';
            if (keysContainer) keysContainer.style.display = p === provider ? '' : 'none';
          });
        });
      });
      container.querySelector('#puter-signin').addEventListener('click', async () => {
        await puter.auth.signIn().then((res) => {
          puter.print('Signed in<br>' + JSON.stringify(res));
        });
      });
      container.querySelector('#puter-signout').addEventListener('click', async () => {
        await puter.auth.signOut();
      });
      providers.forEach(provider => {
        const modelType = container.querySelector(`#${provider}ModelType`);
        const modelTypes = this.getModelTypes(provider);
        if (modelType) {
          modelType.addEventListener('change', (e) => {
            const type = e.target.value;
            modelTypes.forEach(t => {
              const modelContainer = container.querySelector(`#${provider}-${t}-container`);
              if (modelContainer) {
                modelContainer.style.display = type === t ? '' : 'none';
              }
            });
          });
        }
      });
      ['gemini', 'perplexity', 'claude', 'openai', 'mistral'].forEach(provider => {
        const addButton = container.querySelector(`#add-${provider}-key`);
        const keyContainer = container.querySelector(`#${provider}Keys .api-keys-container`);
        addButton.addEventListener('click', () => {
          const newEntry = document.createElement('div');
          newEntry.className = 'api-key-entry';
          newEntry.style.cssText = 'display: flex; gap: 10px; margin-bottom: 5px;';
          const currentKeysCount = keyContainer.children.length;
          newEntry.innerHTML = `
      <input type="text" class="${provider}-key" value=""
        style="flex: 1; width: 100%; border-radius: 6px; margin-left: 5px;">
      <button class="remove-key"
        data-provider="${provider}"
        data-index="${currentKeysCount}"
        style="background-color: #ff4444;">×</button>
`;
          keyContainer.appendChild(newEntry);
        });
      });
      container.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-key")) {
          const provider = e.target.dataset.provider;
          e.target.parentElement.remove();
          const container = this.$(
            `#${provider}Keys .api-keys-container`
          );
          Array.from(container.querySelectorAll(".remove-key")).forEach(
            (btn, i) => {
              btn.dataset.index = i;
            }
          );
        }
      });
      container.querySelector('#tts-provider').addEventListener('change', (e) => {
        const provider = e.target.value;
        ['google', 'openai', 'gemini'].forEach(p => {
          const ttsContainer = container?.querySelector(`#tts-${p}-container`);
          if (ttsContainer) ttsContainer.style.display = p === provider ? '' : 'none';
        });
      });
      const useCustomSelectors = container.querySelector("#useCustomSelectors");
      const selectorsSettings = container.querySelector("#selectorsSettings");
      useCustomSelectors.addEventListener("change", (e) => {
        selectorsSettings.style.display = e.target.checked ? "block" : "none";
      });
      const useCustomPrompt = container.querySelector("#useCustomPrompt");
      const promptSettings = container.querySelector("#promptSettings");
      useCustomPrompt.addEventListener("change", (e) => {
        promptSettings.style.display = e.target.checked ? "block" : "none";
      });
      const displayModeSelect = container.querySelector("#displayMode");
      displayModeSelect.addEventListener("change", (e) => {
        const languageLearningOptions = container.querySelector(
          "#languageLearningOptions"
        );
        languageLearningOptions.style.display =
          e.target.value === "language_learning" ? "block" : "none";
      });
      ['Speed', 'Pitch', 'Volume'].forEach(suffix => {
        const input = container.querySelector(`#ttsDefault${suffix}`);
        input.addEventListener('input', () => {
          input.nextElementSibling.textContent = parseFloat(input.value).toFixed(1);
        });
      });
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", handleEscape);
          if (container && container.parentNode) {
            container.parentNode.removeChild(container);
          }
        }
      };
      document.addEventListener("keydown", handleEscape);
      const exportBtn = container.querySelector("#exportSettings");
      const importBtn = container.querySelector("#importSettings");
      const importInput = container.querySelector("#importInput");
      exportBtn.addEventListener("click", () => {
        try {
          this.exportSettings();
          this.showNotification(this._("notifications.export_success"));
        } catch (error) {
          this.showNotification(this._("notifications.export_error"));
        }
      });
      importBtn.addEventListener("click", () => {
        importInput.click();
      });
      importInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await this.importSettings(file);
          this.showNotification(this._("notifications.import_success"));
          setTimeout(() => location.reload(), 1500);
        } catch (error) {
          this.showNotification(error.message, "error");
        }
      });
      const cancelButton = container.querySelector("#cancelSettings");
      cancelButton.addEventListener("click", () => {
        if (container && container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
      const saveButton = container.querySelector("#saveSettings");
      saveButton.addEventListener("click", () => {
        this.saveSettings(container);
        container.remove();
        location.reload();
      });
      return container;
    }
    getScriptVersion() {
      try {
        const scripts = GM_info.script;
        return scripts.version || "unknown";
      } catch (error) {
        console.warn("Không thể lấy version từ metadata:", error);
        return "unknown";
      }
    }
    async exportSettings() {
      try {
        const settings = this.settings;
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const ver = this.getScriptVersion();
        const filename = `king1x32-translator-settings-v${ver}-${timestamp}.json`;
        const compressedData = LZString.compressToBase64(JSON.stringify(settings));
        const exportData = {
          version: ver,
          timestamp: Date.now(),
          compressed: true,
          data: compressedData
        };
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
          type: "application/json"
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Export error:", error);
        throw new Error(this._("notifications.export_error"));
      }
    }
    async importSettings(file) {
      try {
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error((this._("notifications.failed_read_file"))));
          reader.readAsText(file);
        });
        let importedData;
        try {
          importedData = JSON.parse(content);
        } catch (error) {
          throw new Error(this._("notifications.invalid_settings_file"));
        }
        if (!this.validateImportFormat(importedData)) {
          throw new Error(this._("notifications.invalid_settings_format"));
        }
        let settingsData;
        if (importedData.compressed) {
          try {
            settingsData = JSON.parse(LZString.decompressFromBase64(importedData.data));
          } catch (error) {
            throw new Error(this._("notifications.decompression_error"));
          }
        } else {
          settingsData = importedData.data || importedData;
        }
        if (!this.validateImportedSettings(settingsData)) {
          throw new Error(this._("notifications.invalid_settings"));
        }
        const mergedSettings = this.mergeWithDefaults(settingsData);
        GM_setValue("translatorSettings", JSON.stringify(mergedSettings));
        return true;
      } catch (error) {
        console.error("Import error:", error);
        throw new Error((this._("notifications.import_error")) + ` ${error.message}`);
      }
    }
    validateImportFormat(data) {
      if (!data) return false;
      if (data.compressed) {
        return typeof data.version === "string" &&
          typeof data.timestamp === "number" &&
          typeof data.data === "string";
      }
      return this.validateImportedSettings(data);
    }
    validateImportedSettings(settings) {
      const requiredFields = [
        "theme",
        "apiProvider",
        "apiKey",
        "ocrOptions",
        "mediaOptions",
        "displayOptions",
        "shortcuts",
        "cacheOptions",
        "rateLimit"
      ];
      return requiredFields.every(field => settings.hasOwnProperty(field));
    }
    showNotification(message, type = "info") {
      const notification = document.createElement("div");
      notification.className = "translator-notification";
      const colors = {
        info: "#4a90e2",
        success: "#28a745",
        warning: "#ffc107",
        error: "#dc3545"
      };
      const backgroundColor = colors[type] || colors.info;
      const textColor = type === "warning" ? "#000" : "#fff";
      Object.assign(notification.style, {
        position: "fixed",
        top: "20px",
        left: `${window.innerWidth / 2}px`,
        transform: "translateX(-50%)",
        backgroundColor,
        color: textColor,
        padding: "10px 20px",
        borderRadius: "8px",
        zIndex: "2147483647",
        animation: "fadeInOut 2s ease",
        fontFamily: "'GoMono Nerd Font', 'Noto Sans', Arial",
        fontSize: "14px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
      });
      notification.innerText = message;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }
    loadSettings() {
      const savedSettings = GM_getValue("translatorSettings");
      return savedSettings
        ? this.mergeWithDefaults(JSON.parse(savedSettings))
        : DEFAULT_SETTINGS;
    }
    mergeWithDefaults(savedSettings) {
      return {
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        geminiOptions: {
          ...DEFAULT_SETTINGS.geminiOptions,
          ...(savedSettings?.geminiOptions || {})
        },
        perplexityOptions: {
          ...DEFAULT_SETTINGS.perplexityOptions,
          ...(savedSettings?.perplexityOptions || {})
        },
        claudeOptions: {
          ...DEFAULT_SETTINGS.claudeOptions,
          ...(savedSettings?.claudeOptions || {})
        },
        openaiOptions: {
          ...DEFAULT_SETTINGS.openaiOptions,
          ...(savedSettings?.openaiOptions || {})
        },
        mistralOptions: {
          ...DEFAULT_SETTINGS.mistralOptions,
          ...(savedSettings?.mistralOptions || {})
        },
        puterOptions: {
          ...DEFAULT_SETTINGS.puterOptions,
          ...(savedSettings?.puterOptions || {})
        },
        apiKey: {
          gemini: [
            ...(savedSettings?.apiKey?.gemini ||
              DEFAULT_SETTINGS.apiKey.gemini)
          ],
          perplexity: [
            ...(savedSettings?.apiKey?.perplexity ||
              DEFAULT_SETTINGS.apiKey.perplexity)
          ],
          claude: [
            ...(savedSettings?.apiKey?.claude ||
              DEFAULT_SETTINGS.apiKey.claude)
          ],
          openai: [
            ...(savedSettings?.apiKey?.openai ||
              DEFAULT_SETTINGS.apiKey.openai)
          ],
          mistral: [
            ...(savedSettings?.apiKey?.mistral ||
              DEFAULT_SETTINGS.apiKey.mistral)
          ]
        },
        currentKeyIndex: {
          ...DEFAULT_SETTINGS.currentKeyIndex,
          ...(savedSettings?.currentKeyIndex || {})
        },
        contextMenu: {
          ...DEFAULT_SETTINGS.contextMenu,
          ...(savedSettings?.contextMenu || {})
        },
        promptSettings: {
          ...DEFAULT_SETTINGS.promptSettings,
          ...(savedSettings?.promptSettings || {})
        },
        inputTranslation: {
          ...DEFAULT_SETTINGS.inputTranslation,
          ...(savedSettings?.inputTranslation || {})
        },
        translatorTools: {
          ...DEFAULT_SETTINGS.translatorTools,
          ...(savedSettings?.translatorTools || {})
        },
        pageTranslation: {
          ...DEFAULT_SETTINGS.pageTranslation,
          ...(savedSettings?.pageTranslation || {})
        },
        ocrOptions: {
          ...DEFAULT_SETTINGS.ocrOptions,
          ...(savedSettings?.ocrOptions || {})
        },
        mediaOptions: {
          ...DEFAULT_SETTINGS.mediaOptions,
          ...(savedSettings?.mediaOptions || {})
        },
        videoStreamingOptions: {
          ...DEFAULT_SETTINGS.videoStreamingOptions,
          ...(savedSettings?.videoStreamingOptions || {})
        },
        displayOptions: {
          ...DEFAULT_SETTINGS.displayOptions,
          ...(savedSettings?.displayOptions || {})
        },
        ttsOptions: {
          ...DEFAULT_SETTINGS.ttsOptions,
          ...(savedSettings?.ttsOptions || {})
        },
        shortcuts: {
          ...DEFAULT_SETTINGS.shortcuts,
          ...(savedSettings?.shortcuts || {})
        },
        clickOptions: {
          ...DEFAULT_SETTINGS.clickOptions,
          ...(savedSettings?.clickOptions || {})
        },
        touchOptions: {
          ...DEFAULT_SETTINGS.touchOptions,
          ...(savedSettings?.touchOptions || {})
        },
        cacheOptions: {
          text: {
            ...DEFAULT_SETTINGS.cacheOptions.text,
            ...(savedSettings?.cacheOptions?.text || {})
          },
          image: {
            ...DEFAULT_SETTINGS.cacheOptions.image,
            ...(savedSettings?.cacheOptions?.image || {})
          },
          media: {
            ...DEFAULT_SETTINGS.cacheOptions.media,
            ...(savedSettings?.cacheOptions?.media || {})
          },
          page: {
            ...DEFAULT_SETTINGS.cacheOptions.page,
            ...(savedSettings?.cacheOptions?.page || {})
          }
        },
        rateLimit: {
          ...DEFAULT_SETTINGS.rateLimit,
          ...(savedSettings?.rateLimit || {})
        }
      };
    }
    saveSettings(settingsUI) {
      const geminiKeys = Array.from(settingsUI.querySelectorAll(".gemini-key"))
        .map((input) => input.value.trim())
        .filter((key) => key !== "");
      const perplexityKeys = Array.from(settingsUI.querySelectorAll(".perplexity-key"))
        .map((input) => input.value.trim())
        .filter((key) => key !== "");
      const claudeKeys = Array.from(settingsUI.querySelectorAll(".claude-key"))
        .map((input) => input.value.trim())
        .filter((key) => key !== "");
      const openaiKeys = Array.from(settingsUI.querySelectorAll(".openai-key"))
        .map((input) => input.value.trim())
        .filter((key) => key !== "");
      const mistralKeys = Array.from(settingsUI.querySelectorAll(".mistral-key"))
        .map((input) => input.value.trim())
        .filter((key) => key !== "");
      const useCustomSelectors = settingsUI.querySelector(
        "#useCustomSelectors"
      ).checked;
      const customSelectors = settingsUI
        .querySelector("#customSelectors")
        .value.split("\n")
        .map((s) => s.trim())
        .filter((s) => s && s.length > 0);
      const combineWithDefault = settingsUI.querySelector(
        "#combineWithDefault"
      ).checked;
      const maxWidthVw = settingsUI.querySelector("#maxPopupWidth").value;
      const maxWidthPx = (window.innerWidth * parseInt(maxWidthVw)) / 100;
      const minWidthPx = parseInt(
        settingsUI.querySelector("#minPopupWidth").value
      );
      const finalMinWidth =
        minWidthPx > maxWidthPx
          ? maxWidthVw
          : settingsUI.querySelector("#minPopupWidth").value;
      const newSettings = {
        theme: settingsUI.querySelector('input[name="theme"]:checked').value,
        uiLanguage: settingsUI.querySelector('input[name="uiLanguage"]:checked').value,
        apiProvider: settingsUI.querySelector('input[name="apiProvider"]:checked').value,
        apiKey: {
          gemini:
            geminiKeys.length > 0
              ? geminiKeys
              : [DEFAULT_SETTINGS.apiKey.gemini[0]],
          perplexity:
            perplexityKeys.length > 0
              ? perplexityKeys
              : [DEFAULT_SETTINGS.apiKey.perplexity[0]],
          claude:
            claudeKeys.length > 0
              ? claudeKeys
              : [DEFAULT_SETTINGS.apiKey.claude[0]],
          openai:
            openaiKeys.length > 0
              ? openaiKeys
              : [DEFAULT_SETTINGS.apiKey.openai[0]],
          mistral:
            mistralKeys.length > 0
              ? mistralKeys
              : [DEFAULT_SETTINGS.apiKey.mistral[0]]
        },
        currentKeyIndex: {
          gemini: 0,
          perplexity: 0,
          claude: 0,
          openai: 0,
          mistral: 0
        },
        geminiOptions: {
          modelType: settingsUI.querySelector('#geminiModelType')?.value,
          fastModel: settingsUI.querySelector('#gemini-fast-model')?.value,
          proModel: settingsUI.querySelector('#gemini-pro-model')?.value,
          thinkModel: settingsUI.querySelector('#gemini-think-model')?.value,
          customModel: settingsUI.querySelector('#gemini-custom-model')?.value
        },
        perplexityOptions: {
          modelType: settingsUI.querySelector('#perplexityModelType')?.value,
          fastModel: settingsUI.querySelector('#perplexity-fast-model')?.value,
          balanceModel: settingsUI.querySelector('#perplexity-balance-model')?.value,
          proModel: settingsUI.querySelector('#perplexity-pro-model')?.value,
          customModel: settingsUI.querySelector('#perplexity-custom-model')?.value
        },
        claudeOptions: {
          modelType: settingsUI.querySelector('#claudeModelType')?.value,
          fastModel: settingsUI.querySelector('#claude-fast-model')?.value,
          balanceModel: settingsUI.querySelector('#claude-balance-model')?.value,
          proModel: settingsUI.querySelector('#claude-pro-model')?.value,
          customModel: settingsUI.querySelector('#claude-custom-model')?.value
        },
        openaiOptions: {
          modelType: settingsUI.querySelector('#openaiModelType')?.value,
          fastModel: settingsUI.querySelector('#openai-fast-model')?.value,
          balanceModel: settingsUI.querySelector('#openai-balance-model')?.value,
          proModel: settingsUI.querySelector('#openai-pro-model')?.value,
          customModel: settingsUI.querySelector('#openai-custom-model')?.value
        },
        mistralOptions: {
          modelType: settingsUI.querySelector('#mistralModelType')?.value,
          freeModel: settingsUI.querySelector('#mistral-free-model')?.value,
          researchModel: settingsUI.querySelector('#mistral-research-model')?.value,
          premierModel: settingsUI.querySelector('#mistral-premier-model')?.value,
          customModel: settingsUI.querySelector('#mistral-custom-model')?.value,
        },
        puterOptions: {
          modelType: settingsUI.querySelector('#puterModelType')?.value,
          fastModel: settingsUI.querySelector('#puter-fast-model')?.value,
          balanceModel: settingsUI.querySelector('#puter-balance-model')?.value,
          proModel: settingsUI.querySelector('#puter-pro-model')?.value,
          customModel: settingsUI.querySelector('#puter-custom-model')?.value
        },
        contextMenu: {
          enabled: settingsUI.querySelector("#contextMenuEnabled").checked
        },
        inputTranslation: {
          enabled: settingsUI.querySelector("#inputTranslationEnabled").checked,
          savePosition: settingsUI.querySelector("#inputTranslationSavePosition").checked
        },
        translatorTools: {
          enabled: settingsUI.querySelector("#ToolsEnabled").checked
        },
        promptSettings: {
          enabled: true,
          useCustom: settingsUI.querySelector("#useCustomPrompt").checked,
          customPrompts: {
            normal: settingsUI.querySelector("#normalPrompt").value.trim(),
            normal_chinese: settingsUI
              .querySelector("#normalPrompt_chinese")
              .value.trim(),
            advanced: settingsUI.querySelector("#advancedPrompt").value.trim(),
            advanced_chinese: settingsUI
              .querySelector("#advancedPrompt_chinese")
              .value.trim(),
            ocr: settingsUI.querySelector("#ocrPrompt").value.trim(),
            ocr_chinese: settingsUI
              .querySelector("#ocrPrompt_chinese")
              .value.trim(),
            media: settingsUI.querySelector("#mediaPrompt").value.trim(),
            media_chinese: settingsUI
              .querySelector("#mediaPrompt_chinese")
              .value.trim(),
            page: settingsUI.querySelector("#pagePrompt").value.trim(),
            page_chinese: settingsUI
              .querySelector("#pagePrompt_chinese")
              .value.trim(),
            file_content: settingsUI.querySelector("#fileContentPrompt").value.trim(),
            file_content_chinese: settingsUI
              .querySelector("#fileContentPrompt_chinese")
              .value.trim()
          }
        },
        pageTranslation: {
          enabled: settingsUI.querySelector("#pageTranslationEnabled").checked,
          autoTranslate: settingsUI.querySelector("#autoTranslatePage").checked,
          showInitialButton:
            settingsUI.querySelector("#showInitialButton").checked,
          buttonTimeout: DEFAULT_SETTINGS.pageTranslation.buttonTimeout,
          enableGoogleTranslate: settingsUI.querySelector("#enableGoogleTranslate").checked,
          googleTranslateLayout: settingsUI.querySelector("#googleTranslateLayout").value,
          useCustomSelectors,
          customSelectors,
          combineWithDefault,
          defaultSelectors: DEFAULT_SETTINGS.pageTranslation.defaultSelectors,
          excludeSelectors: useCustomSelectors
            ? combineWithDefault
              ? [
                ...new Set([
                  ...DEFAULT_SETTINGS.pageTranslation.defaultSelectors,
                  ...customSelectors
                ])
              ]
              : customSelectors
            : DEFAULT_SETTINGS.pageTranslation.defaultSelectors,
          generation: {
            temperature: parseFloat(settingsUI.querySelector("#pageTranslationTemperature").value),
            topP: parseFloat(settingsUI.querySelector("#pageTranslationTopP").value),
            topK: parseInt(settingsUI.querySelector("#pageTranslationTopK").value)
          }
        },
        ocrOptions: {
          enabled: settingsUI.querySelector("#ocrEnabled").checked,
          preferredProvider: settingsUI.querySelector(
            'input[name="apiProvider"]:checked'
          ).value,
          displayType: "popup",
          maxFileSize: CONFIG.OCR.maxFileSize,
          temperature: parseFloat(
            settingsUI.querySelector("#ocrTemperature").value
          ),
          topP: parseFloat(settingsUI.querySelector("#ocrTopP").value),
          topK: parseInt(settingsUI.querySelector("#ocrTopK").value)
        },
        mediaOptions: {
          enabled: settingsUI.querySelector("#mediaEnabled").checked,
          temperature: parseFloat(
            settingsUI.querySelector("#mediaTemperature").value
          ),
          topP: parseFloat(settingsUI.querySelector("#mediaTopP").value),
          topK: parseInt(settingsUI.querySelector("#mediaTopK").value)
        },
        videoStreamingOptions: {
          enabled: settingsUI.querySelector("#videoStreamingEnabled").checked,
          fontSize: settingsUI.querySelector("#videoStreamingFontSize").value,
          backgroundColor: settingsUI.querySelector("#videoStreamingBgColor").value,
          textColor: settingsUI.querySelector("#videoStreamingTextColor").value
        },
        displayOptions: {
          fontSize: settingsUI.querySelector("#fontSize").value,
          minPopupWidth: finalMinWidth,
          maxPopupWidth: maxWidthVw,
          webImageTranslation: {
            fontSize: settingsUI.querySelector("#webImageFontSize").value
          },
          translationMode: settingsUI.querySelector("#displayMode").value,
          targetLanguage: settingsUI.querySelector("#targetLanguage").value,
          sourceLanguage: settingsUI.querySelector("#sourceLanguage").value,
          languageLearning: {
            enabled:
              settingsUI.querySelector("#displayMode").value ===
              "language_learning",
            showSource: settingsUI.querySelector("#showSource").checked
          }
        },
        ttsOptions: {
          enabled: settingsUI.querySelector("#ttsEnabled").checked,
          defaultGeminiModel: settingsUI.querySelector("#tts-gemini-model").value,
          defaultProvider: settingsUI.querySelector("#tts-provider").value,
          defaultModel: settingsUI.querySelector("#tts-openai-model").value,
          defaultSpeed: parseFloat(settingsUI.querySelector("#ttsDefaultSpeed").value),
          defaultPitch: parseFloat(settingsUI.querySelector("#ttsDefaultPitch").value),
          defaultVolume: parseFloat(settingsUI.querySelector("#ttsDefaultVolume").value)
        },
        shortcuts: {
          settingsEnabled: settingsUI.querySelector("#settingsShortcutEnabled")
            .checked,
          enabled: settingsUI.querySelector("#shortcutsEnabled").checked,
          pageTranslate: {
            key: settingsUI.querySelector("#pageTranslateKey").value,
            altKey: true
          },
          inputTranslate: {
            key: settingsUI.querySelector("#inputTranslationKey").value,
            altKey: true
          },
          quickTranslate: {
            key: settingsUI.querySelector("#quickKey").value,
            altKey: true
          },
          popupTranslate: {
            key: settingsUI.querySelector("#popupKey").value,
            altKey: true
          },
          advancedTranslate: {
            key: settingsUI.querySelector("#advancedKey").value,
            altKey: true
          }
        },
        clickOptions: {
          enabled: settingsUI.querySelector("#translationButtonEnabled")
            .checked,
          singleClick: {
            translateType: settingsUI.querySelector("#singleClickSelect").value
          },
          doubleClick: {
            translateType: settingsUI.querySelector("#doubleClickSelect").value
          },
          hold: {
            translateType: settingsUI.querySelector("#holdSelect").value
          }
        },
        touchOptions: {
          enabled: settingsUI.querySelector("#touchEnabled").checked,
          sensitivity: parseInt(
            settingsUI.querySelector("#touchSensitivity").value
          ),
          twoFingers: {
            translateType: settingsUI.querySelector("#twoFingersSelect").value
          },
          threeFingers: {
            translateType: settingsUI.querySelector("#threeFingersSelect")
              .value
          }
        },
        cacheOptions: {
          text: {
            enabled: settingsUI.querySelector("#textCacheEnabled").checked,
            maxSize: parseInt(
              settingsUI.querySelector("#textCacheMaxSize").value
            ),
            expirationTime: parseInt(
              settingsUI.querySelector("#textCacheExpiration").value
            )
          },
          image: {
            enabled: settingsUI.querySelector("#imageCacheEnabled").checked,
            maxSize: parseInt(
              settingsUI.querySelector("#imageCacheMaxSize").value
            ),
            expirationTime: parseInt(
              settingsUI.querySelector("#imageCacheExpiration").value
            )
          },
          media: {
            enabled: settingsUI.querySelector("#mediaCacheEnabled").checked,
            maxSize: parseInt(
              settingsUI.querySelector("#mediaCacheMaxSize").value
            ),
            expirationTime:
              parseInt(
                settingsUI.querySelector("#mediaCacheExpirationTime").value
              ) * 1000
          }
        },
        rateLimit: {
          maxRequests: parseInt(settingsUI.querySelector("#maxRequests").value),
          perMilliseconds: parseInt(
            settingsUI.querySelector("#perMilliseconds").value
          )
        }
      };
      const providerTTS = settingsUI.querySelector("#tts-provider").value;
      const getOldSettings = JSON.parse(GM_getValue("translatorSettings"))?.ttsOptions?.defaultVoice;
      if (providerTTS === 'gemini') {
        const selectedGeminiVoice = settingsUI.querySelector(`#tts-gemini-select`).value;
        newSettings.ttsOptions.defaultVoice = {
          ...getOldSettings,
          gemini: {}
        };
        newSettings.ttsOptions.defaultVoice.gemini.voice = selectedGeminiVoice;
      } else if (providerTTS === 'openai') {
        const selectedOpenAIVoice = settingsUI.querySelector(`#tts-openai-select`).value;
        newSettings.ttsOptions.defaultVoice = {
          ...getOldSettings,
          openai: {}
        };
        newSettings.ttsOptions.defaultVoice.openai.voice = selectedOpenAIVoice;
      } else if (providerTTS === 'google') {
        newSettings.ttsOptions.defaultVoice = {
          ...getOldSettings,
          google: {},
        };
        Object.keys(CONFIG.TTS.GOOGLE.VOICES).forEach(lang => {
          const selectedVoice = settingsUI.querySelector(`#tts-google-select[data-lang="${lang}"]`).value;
          newSettings.ttsOptions.defaultVoice.google[lang] = {
            name: selectedVoice,
            display: CONFIG.TTS.GOOGLE.VOICES[lang].find(voice => voice.name === selectedVoice).display
          };
        });
      }
      const isToolsEnabled = settingsUI.querySelector(
        "#showTranslatorTools"
      ).checked;
      const currentState =
        localStorage.getItem("translatorToolsEnabled") === "true";
      if (isToolsEnabled !== currentState) {
        localStorage.setItem(
          "translatorToolsEnabled",
          isToolsEnabled.toString()
        );
        this.translator.ui.removeToolsContainer();
        this.translator.ui.resetState();
        const overlays = this.$$(".translator-overlay");
        overlays.forEach((overlay) => overlay.remove());
        if (this.settings.translatorTools?.enabled && isToolsEnabled) {
          this.translator.ui.setupTranslatorTools();
        }
      }
      this.currentLanguage = CONFIG.LANG_DATA[newSettings.uiLanguage];
      const mergedSettings = this.mergeWithDefaults(newSettings);
      GM_setValue("translatorSettings", JSON.stringify(mergedSettings));
      this.settings = mergedSettings;
      const event = new CustomEvent("settingsChanged", {
        detail: mergedSettings
      });
      document.dispatchEvent(event);
      return mergedSettings;
    }
    getSetting(path) {
      return path.split(".").reduce((obj, key) => obj?.[key], this.settings);
    }
  }
  class APIKeyManager {
    constructor(settings, _) {
      this.settings = settings;
      this._ = _;
      this.failedKeys = new Map();
      this.activeKeys = new Map();
      this.keyStats = new Map();
      this.rateLimitedKeys = new Map();
      this.keyRotationInterval = 10000; // 10s
      this.maxConcurrentRequests = 5;
      this.retryDelays = [1000, 2000, 4000];
      this.successRateThreshold = 0.7;
      this.lastSuccessfulIndex = null;
      this.setupKeyRotation();
    }
    markKeyAsRateLimited(key) {
      const now = Date.now();
      this.rateLimitedKeys.set(key, {
        timestamp: now,
        retryAfter: now + this.settings.rateLimit.perMilliseconds
      });
    }
    getAvailableKeys(provider) {
      const allKeys = this.settings.apiKey[provider];
      if (!allKeys || allKeys.length === 0) {
        throw new Error(this._("notifications.no_api_key_configured"));
      }
      const now = Date.now();
      const availableKeys = allKeys.filter(key => {
        if (!key) return false;
        const failedInfo = this.failedKeys.get(key);
        const activeInfo = this.activeKeys.get(key);
        const rateLimitInfo = this.rateLimitedKeys.get(key);
        const stats = this.keyStats.get(key);
        const isFailed = failedInfo && (now - failedInfo.timestamp < 60000);
        const isBusy = activeInfo && (activeInfo.requests >= this.maxConcurrentRequests);
        const isRateLimited = rateLimitInfo && (now < rateLimitInfo.retryAfter);
        const hasLowSuccessRate = stats &&
          stats.total > 10 &&
          (stats.success / stats.total) < this.successRateThreshold;
        return !isFailed && !isBusy && !isRateLimited && !hasLowSuccessRate;
      });
      if (this.lastSuccessfulIndex !== null && availableKeys.length > 1) {
        const lastKey = allKeys[this.lastSuccessfulIndex];
        if (availableKeys.includes(lastKey)) {
          const currentIndex = availableKeys.indexOf(lastKey);
          if (currentIndex !== -1) {
            availableKeys.splice(currentIndex, 1);
            availableKeys.push(lastKey);
          }
        }
      }
      return availableKeys;
    }
    async executeWithMultipleKeys(promiseGenerator, provider, maxConcurrent = 3) {
      const availableKeys = this.getAvailableKeys(provider);
      if (!availableKeys || availableKeys.length === 0) {
        throw new Error(this._("notifications.no_api_key_available"));
      }
      const errors = [];
      const promises = [];
      let currentKeyIndex = 0;
      const processRequest = async () => {
        if (currentKeyIndex >= availableKeys.length) return null;
        const key = availableKeys[++currentKeyIndex];
        try {
          const result = await this.useKey(key, () => promiseGenerator(key));
          if (result) {
            this.updateKeyStats(key, true);
            return { status: "fulfilled", value: result };
          }
        } catch (error) {
          this.updateKeyStats(key, false);
          if (error.status === 401) {
            this.markKeyAsFailed(key);
            errors.push(`API key ${key.slice(0, 8)}... invalid`);
          } else if (error.status === 429) {
            this.markKeyAsRateLimited(key);
            errors.push(`API key ${key.slice(0, 8)}... is rate-limitd`);
          } else {
            errors.push(`API key ${key.slice(0, 8)}... : ${error.message}`);
          }
          if (currentKeyIndex < availableKeys.length) {
            return processRequest();
          }
          return { status: "rejected", reason: error };
        }
      };
      const maxParallel = Math.min(maxConcurrent, availableKeys.length);
      for (let i = 0; i < maxParallel; i++) {
        promises.push(processRequest());
      }
      const results = await Promise.all(promises);
      const successResults = results
        .filter(r => r && r.status === "fulfilled")
        .map(r => r.value);
      if (successResults.length > 0) {
        return successResults;
      }
      const errorGroups = {
        invalid: errors.filter(e => e.includes("invalid")),
        rateLimit: errors.filter(e => e.includes("rate-limitd")),
        other: errors.filter(e => !e.includes("invalid") && !e.includes("rate-limitd"))
      };
      let errorMessage = this._("notifications.all_keys_failed");
      if (errorGroups.invalid.length > 0) {
        errorMessage += "\nInvalid API key:\n" + errorGroups.invalid.join("\n");
      }
      if (errorGroups.rateLimit.length > 0) {
        errorMessage += "\nAPI key rate limited:\n" + errorGroups.rateLimit.join("\n");
      }
      if (errorGroups.other.length > 0) {
        errorMessage += "\nOther errors:\n" + errorGroups.other.join("\n");
      }
      throw new Error(errorMessage);
    }
    async useKey(key, action) {
      let activeInfo = this.activeKeys.get(key) || { requests: 0, timestamp: Date.now() };
      const rateLimitInfo = this.rateLimitedKeys.get(key);
      if (rateLimitInfo && Date.now() < rateLimitInfo.retryAfter) {
        throw new Error(`API key ${key.slice(0, 8)}... is rate-limited. Retrying in ${Math.ceil((rateLimitInfo.retryAfter - Date.now()) / 1000)}s`);
      }
      if (activeInfo.requests >= this.maxConcurrentRequests) {
        throw new Error(`API key ${key.slice(0, 8)}... ` + this._("notifications.too_many_requests"));
      }
      activeInfo.requests++;
      this.activeKeys.set(key, activeInfo);
      try {
        return await action();
      } catch (error) {
        if (error.status === 429) {
          const retryAfter = Date.now() + (parseInt(error.headers?.['retry-after']) * 1000 || 60000);
          this.rateLimitedKeys.set(key, { retryAfter });
          throw new Error(`Rate limitd: ${error.message}`);
        }
        throw error;
      } finally {
        activeInfo = this.activeKeys.get(key);
        if (activeInfo) {
          activeInfo.requests--;
          if (activeInfo.requests <= 0) {
            this.activeKeys.delete(key);
          } else {
            this.activeKeys.set(key, activeInfo);
          }
        }
      }
    }
    markKeyAsFailed(key) {
      if (!key) return;
      const failInfo = this.failedKeys.get(key) || { failures: 0 };
      failInfo.failures++;
      failInfo.timestamp = Date.now();
      this.failedKeys.set(key, failInfo);
      if (this.activeKeys.has(key)) {
        this.activeKeys.delete(key);
      }
      this.updateKeyStats(key, false);
      console.log(`Marked key as failed: ${key.slice(0, 8)}... (${failInfo.failures} failures)`);
    }
    updateKeyStats(key, success) {
      const stats = this.keyStats.get(key) || {
        success: 0,
        fails: 0,
        total: 0,
        lastUsed: 0,
        avgResponseTime: 0
      };
      stats.total++;
      if (success) {
        stats.success++;
      } else {
        stats.fails++;
      }
      stats.lastUsed = Date.now();
      this.keyStats.set(key, stats);
    }
    setupKeyRotation() {
      setInterval(() => {
        const now = Date.now();
        for (const [key, info] of this.rateLimitedKeys.entries()) {
          if (now >= info.retryAfter) {
            this.rateLimitedKeys.delete(key);
          }
        }
        for (const [key, info] of this.failedKeys.entries()) {
          if (now - info.timestamp >= 60000) {
            this.failedKeys.delete(key);
          }
        }
        for (const [key, info] of this.activeKeys.entries()) {
          if (now - info.timestamp >= 30000) {
            info.requests = 0;
            this.activeKeys.set(key, info);
          }
        }
        for (const [key, stats] of this.keyStats.entries()) {
          if (now - stats.lastUsed > 3600000) {
            stats.success = Math.floor(stats.success * 0.9);
            stats.total = Math.floor(stats.total * 0.9);
            this.keyStats.set(key, stats);
          }
        }
      }, this.keyRotationInterval);
    }
  }
  class APIManager {
    constructor(config, getSettings, _) {
      this.config = config;
      this.getSettings = getSettings;
      this._ = _;
      this.keyManager = new APIKeyManager(getSettings(), _);
      this.currentProvider = getSettings().apiProvider;
    }
    async request(prompt, useCase = 'normal', apiKey = null) {
      const provider = this.config.providers[this.currentProvider];
      if (!provider) {
        throw new Error(`Provider ${this.currentProvider} not found`);
      }
      try {
        if (this.currentProvider === "puter") {
          const result = await provider.chat(prompt, {
            model: this.getModel(),
          });
          return provider.responseParser(result);
        }
        const settings = this.getSettings();
        let keysToTry = [];
        if (apiKey) {
          keysToTry = [apiKey];
        } else {
          keysToTry = this.keyManager.getAvailableKeys(settings.apiProvider);
        }
        if (!keysToTry || keysToTry.length === 0) {
          throw new Error(this._("notifications.no_api_key_available"));
        }
        const errors = [];
        for (let i = 0; i < keysToTry.length; i++) {
          const currentKey = keysToTry[i];
          try {
            const result = await this.keyManager.useKey(currentKey, () => this.makeApiRequest(currentKey, prompt, useCase));
            if (result) {
              this.keyManager.updateKeyStats(currentKey, true);
              return result;
            }
          } catch (error) {
            this.keyManager.updateKeyStats(currentKey, false);
            const keyPrefix = currentKey.slice(0, 8);
            if (error.status === 401 || error.status === 403) {
              this.keyManager.markKeyAsFailed(currentKey);
              errors.push(`API Key ${keyPrefix}... invalid`);
            }
            else if (error.status === 429) {
              this.keyManager.markKeyAsRateLimited(currentKey);
              errors.push(`API Key ${keyPrefix}... is rate-limited`);
            }
            else {
              errors.push(`API Key ${keyPrefix}... : ${error.message}`);
            }
            if (apiKey || i === keysToTry.length - 1 || error.status === 401 || error.status === 403) {
              throw new Error(this._("notifications.all_keys_failed") + ` ${errors.join('\n')}`);
            }
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
        throw new Error(this._("notifications.unknown_api_error"));
      } catch (error) {
        console.error("Request failed:", error);
        throw error;
      }
    }
    async makeApiRequest(key, content, useCase = 'normal') {
      const apiConfig = this.getAPIConfig(key, content, useCase);
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "POST",
          url: apiConfig.url,
          headers: apiConfig.headers,
          data: JSON.stringify(apiConfig.body),
          responseType: "json",
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              try {
                const result = apiConfig.responseParser(response.response);
                resolve(result);
              } catch (error) {
                reject({
                  status: response.status,
                  message: this._("notifications.api_response_parse_error")
                });
              }
            } else {
              reject({
                status: response.status,
                message: response.response?.error?.message || this._("notifications.unknown_api_error")
              });
            }
          },
          onerror: () => {
            reject({
              status: 0,
              message: this._("notifications.network_error")
            });
          }
        });
      });
    }
    getAPIConfig(key, content, useCase = 'normal') {
      const settings = this.getSettings();
      const provider = settings.apiProvider;
      const config = this.config.providers[provider];
      const generation = this.getGenerationConfig(useCase);
      switch (provider) {
        case 'gemini':
          const geminiModel = this.getGeminiModel();
          return {
            url: `${config.baseUrl}/${geminiModel}:generateContent?key=${key}`,
            headers: config.headers,
            body: config.createRequestBody(content, generation),
            responseParser: config.responseParser
          };
        case 'perplexity':
        case 'claude':
        case 'openai':
        case 'mistral':
          const model = this.getModel();
          let body = config.createRequestBody(
            content,
            model,
            generation.temperature,
            generation.topP
          );
          if (provider === 'perplexity' || provider === 'claude' || provider === 'mistral') {
            if (generation.topK !== undefined) {
              body.top_k = generation.topK;
            }
          }
          return {
            url: config.baseUrl,
            headers: config.headers(key),
            body: body,
            responseParser: config.responseParser
          };
        default:
          throw new Error(this._("notifications.unsupported_provider") + ` ${provider}`);
      }
    }
    getGenerationConfig(useCase) {
      const settings = this.getSettings();
      switch (useCase) {
        case 'ocr':
          return {
            temperature: settings.ocrOptions.temperature,
            topP: settings.ocrOptions.topP,
            topK: settings.ocrOptions.topK
          };
        case 'media':
          return {
            temperature: settings.mediaOptions.temperature,
            topP: settings.mediaOptions.topP,
            topK: settings.mediaOptions.topK
          };
        case 'page':
          return {
            temperature: settings.pageTranslation.generation.temperature,
            topP: settings.pageTranslation.generation.topP,
            topK: settings.pageTranslation.generation.topK
          };
        default:
          return {
            temperature: settings.pageTranslation.generation.temperature,
            topP: settings.pageTranslation.generation.topP,
            topK: settings.pageTranslation.generation.topK
          };
      }
    }
    getModel() {
      const settings = this.getSettings();
      const provider = settings.apiProvider;
      if (provider === 'gemini') {
        return this.getGeminiModel();
      } else if (provider === 'mistral') {
        return this.getMistralModel();
      }
      const Options = settings[`${provider}Options`];
      const config = this.config.providers[provider];
      switch (Options.modelType) {
        case "fast":
          return Options.fastModel;
        case "balance":
          return Options.balanceModel;
        case "pro":
          return Options.proModel;
        case "custom":
          return Options.customModel || config.models.fast[0];
        default:
          return config.models.fast[0];
      }
    }
    getGeminiModel() {
      const settings = this.getSettings();
      const geminiOptions = settings.geminiOptions;
      switch (geminiOptions.modelType) {
        case 'fast':
          return geminiOptions.fastModel;
        case 'pro':
          return geminiOptions.proModel;
        case 'think':
          return geminiOptions.thinkModel;
        case 'custom':
          return geminiOptions.customModel || "gemini-2.0-flash-lite";
        default:
          return "gemini-2.0-flash-lite";
      }
    }
    getMistralModel() {
      const settings = this.getSettings();
      const mistralOptions = settings.mistralOptions;
      switch (mistralOptions.modelType) {
        case 'free':
          return mistralOptions.freeModel;
        case 'research':
          return mistralOptions.researchModel;
        case 'premier':
          return mistralOptions.premierModel;
        case 'custom':
          return mistralOptions.customModel || "mistral-small-latest";
        default:
          return "mistral-small-latest";
      }
    }
  }
  class InputTranslator {
    constructor(translator) {
      this.translator = translator;
      this.settings = this.translator.userSettings.settings;
      this._ = this.translator.userSettings._;
      this.isSelectOpen = false;
      this.isTranslating = false;
      this.activeButtons = new Map();
      this._focusinHandler = this.handleFocusIn.bind(this);
      this._focusoutHandler = this.handleFocusOut.bind(this);
      this._inputHandler = this.handleInput.bind(this);
      this.setupObservers();
      this.setupEventListeners();
      this.initializeExistingEditors();
    }
    setupObservers() {
      const settings = this.settings;
      if (!settings.inputTranslation?.enabled) return;
      this.mutationObserver = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              this.handleNewNode(node);
            }
          });
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === 1) {
              this.handleRemovedNode(node);
            }
          });
        });
      });
      this.resizeObserver = new ResizeObserver(
        debounce((entries) => {
          entries.forEach((entry) => {
            const editor = this.findParentEditor(entry.target);
            if (editor) {
              this.updateButtonPosition(editor);
            }
          });
        }, 100)
      );
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
    getEditorSelectors() {
      return [
        ".fr-element.fr-view",
        ".message-editable",
        ".js-editor",
        ".xenForm textarea",
        '[contenteditable="true"]',
        '[role="textbox"]',
        "textarea",
        'input[type="text"]'
      ].join(",");
    }
    isValidEditor(element) {
      const settings = this.settings;
      if (!settings.inputTranslation?.enabled && !settings.shortcuts?.enabled) return;
      if (!element) return false;
      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden") {
        return false;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        return false;
      }
      return element.matches(this.getEditorSelectors());
    }
    findParentEditor(element) {
      while (element && element !== document.body) {
        if (this.isValidEditor(element)) {
          return element;
        }
        if (element.tagName === "IFRAME") {
          try {
            const iframeDoc = element.contentDocument;
            if (iframeDoc && this.isValidEditor(iframeDoc.body)) {
              return iframeDoc.body;
            }
          } catch (e) {
          }
        }
        element = element.parentElement;
      }
      return null;
    }
    setupEventListeners() {
      const settings = this.settings;
      if (!settings.inputTranslation?.enabled) return;
      document.addEventListener("focusin", this._focusinHandler);
      document.addEventListener("focusout", this._focusoutHandler);
      document.addEventListener("input", this._inputHandler);
    }
    handleFocusIn(e) {
      const editor = this.findParentEditor(e.target);
      if (editor) {
        this.addTranslateButton(editor);
        this.updateButtonVisibility(editor);
      }
    }
    handleFocusOut(e) {
      const editor = this.findParentEditor(e.target);
      if (editor) {
        setTimeout(() => {
          if (this.isSelectOpen) {
            return;
          }
          const activeElement = document.activeElement;
          const container = this.activeButtons.get(editor);
          const isContainerFocused = container && (
            container === activeElement ||
            container.contains(activeElement)
          );
          const isEditorFocused = editor === activeElement ||
            editor.contains(activeElement);
          if (!isContainerFocused && !isEditorFocused) {
            this.removeTranslateButton(editor);
          }
        }, 100);
      }
    }
    handleInput(e) {
      const editor = this.findParentEditor(e.target);
      if (editor) {
        if (!this.activeButtons.has(editor)) {
          this.addTranslateButton(editor);
        }
        this.updateButtonVisibility(editor);
      }
    }
    updateButtonVisibility(editor) {
      const container = this.activeButtons.get(editor);
      if (container) {
        const hasContent = this.getEditorContent(editor);
        container.style.display = hasContent ? "" : "none";
      }
    }
    getEditorContent(editor) {
      const settings = this.settings;
      if (!settings.inputTranslation?.enabled && !settings.shortcuts?.enabled) return;
      let content = "";
      if (editor.value !== undefined) {
        content = editor.value;
      } else if (editor.textContent !== undefined) {
        content = editor.textContent;
      } else if (editor.innerText !== undefined) {
        content = editor.innerText;
      }
      return content.trim();
    }
    setEditorContent(editor, content) {
      if (editor.matches(".fr-element.fr-view")) {
        editor.innerHTML = content;
      } else if (editor.value !== undefined) {
        editor.value = content;
      } else {
        editor.innerHTML = content;
      }
      editor.dispatchEvent(new Event("input", { bubbles: true }));
      editor.dispatchEvent(new Event("change", { bubbles: true }));
    }
    createButton(icon, title) {
      const button = document.createElement("button");
      button.className = "input-translate-button";
      button.innerHTML = icon;
      button.title = title;
      const theme = this.getCurrentTheme();
      button.style.cssText = `
background-color: ${theme.backgroundColor};
color: ${theme.text};
border: none;
border-radius: 8px;
padding: 4px;
font-size: 16px;
cursor: pointer;
display: flex;
align-items: center;
justify-content: center;
min-width: 28px;
height: 28px;
transition: all 0.15s ease;
margin: 0;
outline: none;
`;
      button.onmouseover = () => {
        button.style.background = theme.hoverBg;
        button.style.color = theme.hoverText;
      };
      button.onmouseout = () => {
        button.style.background = "transparent";
        button.style.color = theme.text;
      };
      return button;
    }
    createButtonContainer() {
      const container = document.createElement("div");
      container.className = "input-translate-button-container";
      const theme = this.getCurrentTheme();
      container.style.cssText = `
position: absolute;
display: flex;
flex-direction: column;
gap: 5px;
z-index: 2147483647;
pointer-events: auto;
background-color: rgba(0,74,153,0.5);
border-radius: 8px;
padding: 5px;
box-shadow: 0 2px 5px rgba(0,0,0,0.3);
border: 1px solid ${theme.border};
`;
      return container;
    }
    addTranslateButton(editor) {
      if (this.activeButtons.has(editor)) {
        this.updateButtonVisibility(editor);
        return;
      }
      const container = this.createButtonContainer();
      const settings = this.settings.displayOptions;
      let isDragging = false;
      let currentX;
      let currentY;
      let initialX;
      let initialY;
      let xOffset = 0;
      let yOffset = 0;
      const dragHandle = document.createElement('div');
      dragHandle.className = 'translate-drag-handle';
      dragHandle.innerHTML = '⋮King1x32⋮';
      Object.assign(dragHandle.style, {
        padding: '2px 5px',
        cursor: 'grab',
        color: '#999',
        fontSize: '12px',
        userSelect: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '4px',
        marginRight: '5px'
      });
      container.insertBefore(dragHandle, container.firstChild);
      const getPositionFromEvent = (e) => {
        if (e.type.startsWith('touch')) {
          return {
            x: e.touches[0].clientX,
            y: e.touches[0].clientY
          };
        }
        return {
          x: e.clientX,
          y: e.clientY
        };
      };
      const setTranslate = (xPos, yPos, el) => {
        el.style.transform = `translate(${xPos}px, ${yPos}px)`;
      };
      const dragStart = (e) => {
        const position = getPositionFromEvent(e);
        if (!position) return;
        initialX = position.x - xOffset;
        initialY = position.y - yOffset;
        if (e.target === dragHandle) {
          isDragging = true;
          container.style.cursor = 'grabbing';
        }
        if (e.type === 'touchstart') {
          e.preventDefault();
        }
      };
      const drag = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const position = getPositionFromEvent(e);
        if (!position) return;
        currentX = position.x - initialX;
        currentY = position.y - initialY;
        xOffset = currentX;
        yOffset = currentY;
        setTranslate(xOffset, yOffset, container);
        if (e.type === 'touchmove') {
          e.preventDefault();
        }
      };
      const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        container.style.cursor = 'grab';
        if (this.settings.inputTranslation.savePosition) {
          const position = {
            x: xOffset,
            y: yOffset
          };
          localStorage.setItem('translatorButtonPosition', JSON.stringify(position));
        }
      };
      if (this.settings.inputTranslation.savePosition) {
        const savedPosition = localStorage.getItem('translatorButtonPosition');
        if (savedPosition) {
          try {
            const position = JSON.parse(savedPosition);
            xOffset = position.x;
            yOffset = position.y;
            setTranslate(xOffset, yOffset, container);
          } catch (e) {
            console.error('Error restoring position:', e);
          }
        }
      }
      const resetButton = document.createElement('button');
      resetButton.innerHTML = '↺';
      resetButton.title = 'Reset vị trí';
      Object.assign(resetButton.style, {
        position: 'absolute',
        top: '-8px',
        right: '-8px',
        width: '20px',
        height: '20px',
        padding: '0',
        border: 'none',
        borderRadius: '50%',
        backgroundColor: '#ff4444',
        color: 'white',
        cursor: 'pointer',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '12px',
        zIndex: '2147483647'
      });
      resetButton.onclick = () => {
        xOffset = 0;
        yOffset = 0;
        setTranslate(0, 0, container);
        localStorage.removeItem('translatorButtonPosition');
      };
      container.appendChild(resetButton);
      container.addEventListener('mouseenter', () => {
        if (xOffset !== 0 || yOffset !== 0) {
          resetButton.style.display = 'flex';
        }
      });
      container.addEventListener('mouseleave', () => {
        resetButton.style.display = 'none';
      });
      dragHandle.addEventListener('mousedown', dragStart, false);
      dragHandle.addEventListener('touchstart', dragStart, false);
      document.addEventListener('mousemove', drag, false);
      document.addEventListener('mouseup', dragEnd, false);
      document.addEventListener('touchmove', drag, false);
      document.addEventListener('touchend', dragEnd, false);
      container.cleanup = () => {
        dragHandle.removeEventListener('mousedown', dragStart);
        dragHandle.removeEventListener('touchstart', dragStart);
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('mouseup', dragEnd);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('touchend', dragEnd);
      };
      const sourceRow = document.createElement("div");
      sourceRow.style.cssText = `
display: flex;
align-items: center;
gap: 5px;
`;
      const sourceButton = this.createButton("🌐", this._("notifications.source_trans"));
      const sourceSelect = document.createElement("select");
      const theme = this.getCurrentTheme();
      sourceSelect.style.cssText = `
background-color: ${theme.backgroundColor};
color: ${theme.text};
transition: all 0.15s ease;
padding: 4px;
border-radius: 6px;
border: none;
margin-left: 5px;
font-size: 14px;
max-height: 32px;
width: auto;
min-width: 75px;
max-width: 100px;
`;
      const languages = {
        auto: "Auto-detect",
        ...CONFIG.LANGUAGES
      };
      for (const [code, name] of Object.entries(languages)) {
        const option = document.createElement("option");
        option.value = code;
        option.text = name;
        option.selected = code === settings.sourceLanguage;
        sourceSelect.appendChild(option);
      }
      sourceSelect.addEventListener('mousedown', () => {
        this.isSelectOpen = true;
      });
      sourceSelect.addEventListener('blur', () => {
        setTimeout(() => {
          this.isSelectOpen = false;
        }, 200);
      });
      sourceSelect.addEventListener('change', () => {
        setTimeout(() => {
          editor.focus();
          this.isSelectOpen = false;
        }, 200);
      });
      sourceButton.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceLang = sourceSelect.value;
        await this.translateEditor(editor, true, sourceLang);
      };
      sourceRow.appendChild(sourceButton);
      sourceRow.appendChild(sourceSelect);
      const targetRow = document.createElement("div");
      targetRow.style.cssText = `
display: flex;
align-items: center;
gap: 5px;
margin-top: 5px;
`;
      const targetButton = this.createButton("🔄", this._("notifications.target_trans"));
      const targetSelect = document.createElement("select");
      targetSelect.style.cssText = sourceSelect.style.cssText;
      for (const [code, name] of Object.entries(languages)) {
        if (code !== 'auto') {
          const option = document.createElement("option");
          option.value = code;
          option.text = name;
          option.selected = code === settings.targetLanguage;
          targetSelect.appendChild(option);
        }
      }
      targetSelect.addEventListener('mousedown', () => {
        this.isSelectOpen = true;
      });
      targetSelect.addEventListener('blur', () => {
        setTimeout(() => {
          this.isSelectOpen = false;
        }, 200);
      });
      targetSelect.addEventListener('change', () => {
        setTimeout(() => {
          editor.focus();
          this.isSelectOpen = false;
        }, 200);
      });
      targetButton.onclick = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetLang = targetSelect.value;
        await this.translateEditor(editor, false, targetLang);
      };
      targetRow.appendChild(targetButton);
      targetRow.appendChild(targetSelect);
      container.appendChild(sourceRow);
      container.appendChild(targetRow);
      this.positionButtonContainer(container, editor);
      this.translator.ui.shadowRoot.appendChild(container);
      this.activeButtons.set(editor, container);
      container.addEventListener("mousedown", (e) => {
        if (e.target.tagName !== 'SELECT') {
          e.preventDefault();
        }
      });
      this.updateButtonVisibility(editor);
      this.resizeObserver.observe(editor);
    }
    async translateEditor(editor, isSource, selectedLang) {
      if (this.isTranslating) return;
      this.isTranslating = true;
      const container = this.activeButtons.get(editor);
      const button = isSource ?
        container.querySelector('button:first-of-type') :
        container.querySelector('button:last-of-type');
      const originalIcon = button.innerHTML;
      try {
        const text = this.getEditorContent(editor);
        if (!text) return;
        button.innerHTML = "⌛";
        button.style.opacity = "0.7";
        const sourceLang = isSource && selectedLang === "auto" ?
          this.translator.page.languageCode : selectedLang;
        const result = await this.translator.translate(
          text,
          null,
          false,
          false,
          sourceLang
        );
        if (this.settings.displayOptions.translationMode === "translation_only") {
          this.setEditorContent(editor, result.trim());
        } else {
          const translations = result.split("\n");
          let fullTranslation = "";
          for (const trans of translations) {
            const parts = trans.split("<|>");
            fullTranslation += (parts[2]?.trim() || trans) + "\n";
          }
          this.setEditorContent(editor, fullTranslation.trim());
        }
      } catch (error) {
        console.error("Translation error:", error);
        this.translator.ui.showNotification(this.translator.userSettings._("notifications.translation_error") + error.message, "error");
      } finally {
        this.isTranslating = false;
        if (button) {
          button.innerHTML = originalIcon;
          button.style.opacity = "1";
        }
      }
    }
    positionButtonContainer(container, editor) {
      const rect = editor.getBoundingClientRect();
      const toolbar = this.findEditorToolbar(editor);
      if (toolbar) {
        const toolbarRect = toolbar.getBoundingClientRect();
        container.style.top = `${toolbarRect.top + window.scrollY}px`;
        container.style.left = `${toolbarRect.right + 5}px`;
      } else {
        container.style.top = `${rect.top + window.scrollY}px`;
        container.style.left = `${rect.right + 5}px`;
      }
    }
    findEditorToolbar(editor) {
      return (
        editor.closest(".fr-box")?.querySelector(".fr-toolbar") ||
        editor.closest(".xenForm")?.querySelector(".buttonGroup")
      );
    }
    updateButtonPosition(editor) {
      const container = this.activeButtons.get(editor);
      if (container) {
        this.positionButtonContainer(container, editor);
      }
    }
    getCurrentTheme() {
      const themeMode = this.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      const isDark = themeMode === 'dark';
      return {
        backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.5)",
        text: isDark ? "#fff" : "#000",
        border: theme.border,
        hoverBg: isDark ? "#555" : "#eee",
        hoverText: isDark ? "#eee" : "#555"
      };
    }
    updateAllButtonStyles() {
      const theme = this.getCurrentTheme();
      this.activeButtons.forEach((container) => {
        container.style.background = theme.background;
        container.style.borderColor = theme.border;
        container
          .querySelectorAll(".input-translate-button")
          .forEach((button) => {
            button.style.color = theme.text;
          });
      });
    }
    handleNewNode(node) {
      if (this.isValidEditor(node)) {
        this.addTranslateButton(node);
      }
      node.querySelectorAll(this.getEditorSelectors()).forEach((editor) => {
        if (this.isValidEditor(editor)) {
          this.addTranslateButton(editor);
        }
      });
    }
    handleRemovedNode(node) {
      if (this.activeButtons.has(node)) {
        this.removeTranslateButton(node);
      }
      node.querySelectorAll(this.getEditorSelectors()).forEach((editor) => {
        if (this.activeButtons.has(editor)) {
          this.removeTranslateButton(editor);
        }
      });
    }
    handleEditorFocus(editor) {
      if (this.getEditorContent(editor)) {
        this.addTranslateButton(editor);
      }
    }
    handleEditorClick(editor) {
      if (this.getEditorContent(editor)) {
        this.addTranslateButton(editor);
      }
    }
    removeTranslateButton(editor) {
      const container = this.activeButtons.get(editor);
      if (container) {
        container.cleanup(),
          container.remove();
        this.activeButtons.delete(editor);
        this.resizeObserver.unobserve(editor);
      }
    }
    initializeExistingEditors() {
      const settings = this.settings;
      if (!settings.inputTranslation?.enabled) return;
      document.querySelectorAll(this.getEditorSelectors()).forEach((editor) => {
        if (this.isValidEditor(editor) && this.getEditorContent(editor)) {
          this.addTranslateButton(editor);
        }
      });
    }
    cleanup() {
      if (this.mutationObserver) {
        this.mutationObserver.disconnect();
        this.mutationObserver = null;
      }
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
      document.removeEventListener("focusin", this._focusinHandler);
      document.removeEventListener("focusout", this._focusoutHandler);
      document.removeEventListener("input", this._inputHandler);
      this.activeButtons.forEach((container, _editor) => {
        if (container.cleanup) container.cleanup();
        container.remove();
      });
      this.activeButtons.clear();
    }
  }
  class OCRManager {
    constructor(translator) {
      if (!translator) {
        throw new Error("Translator instance is required for OCRManager");
      }
      this.translator = translator;
      this.isProcessing = false;
      this._ = this.translator.userSettings._;
      this.imageCache = new FileCache(
        CONFIG.CACHE.image.maxSize,
        CONFIG.CACHE.image.expirationTime
      );
    }
    async captureScreen() {
      try {
        const elements = this.translator.ui.$$(".translator-tools-container, .translator-notification, .center-translate-status");
        elements.forEach(el => {
          if (el) el.style.visibility = "hidden";
        });
        try {
          const style = document.createElement('style');
          style.textContent = `
        .screenshot-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.3);
          cursor: crosshair;
          z-index: 2147483647;
          touch-action: none;
        }
        .screenshot-guide {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          z-index: 2147483648;
          font-family: "GoMono Nerd Font", "Noto Sans", Arial;
          font-size: 14px;
          text-align: center;
          white-space: nowrap;
        }
        .screenshot-cancel {
          position: fixed;
          top: 20px;
          right: 20px;
          background-color: #ff4444;
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2147483647;
          pointer-events: auto;
        }
        .screenshot-selection {
          position: fixed;
          border: 2px solid #4a90e2;
          background: rgba(74,144,226,0.1);
          z-index: 2147483647;
        }`;
          this.translator.ui.shadowRoot.appendChild(style);
          const overlay = document.createElement('div');
          overlay.className = 'screenshot-overlay';
          const guide = document.createElement('div');
          guide.className = 'screenshot-guide';
          guide.textContent = this._("notifications.cap_gui");
          const cancelBtn = document.createElement("button");
          cancelBtn.className = "screenshot-cancel";
          cancelBtn.textContent = "✕";
          this.translator.ui.shadowRoot.appendChild(overlay);
          this.translator.ui.shadowRoot.appendChild(guide);
          this.translator.ui.shadowRoot.appendChild(cancelBtn);
          return new Promise((resolve, reject) => {
            let startX, startY;
            let selection = null;
            let isSelecting = false;
            const getCoordinates = (event) => {
              if (event.touches) {
                return {
                  x: event.touches[0].clientX,
                  y: event.touches[0].clientY
                };
              }
              return {
                x: event.clientX,
                y: event.clientY
              };
            };
            const startSelection = (e) => {
              e.preventDefault();
              const coords = getCoordinates(e);
              startX = coords.x;
              startY = coords.y;
              isSelecting = true;
              if (selection) selection.remove();
              selection = document.createElement('div');
              selection.className = 'screenshot-selection';
              this.translator.ui.shadowRoot.appendChild(selection);
            };
            const updateSelection = debounce((e) => {
              if (!isSelecting || !selection) return;
              e.preventDefault();
              const coords = getCoordinates(e);
              const currentX = coords.x;
              const currentY = coords.y;
              const left = Math.min(startX, currentX);
              const top = Math.min(startY, currentY);
              const width = Math.abs(currentX - startX);
              const height = Math.abs(currentY - startY);
              if (width < 10 || height < 10) return;
              requestAnimationFrame(() => {
                selection.style.left = left + 'px';
                selection.style.top = top + 'px';
                selection.style.width = width + 'px';
                selection.style.height = height + 'px';
              });
            }, 16);
            const endSelection = debounce(async (e) => {
              if (!isSelecting || !selection) return;
              e.preventDefault();
              isSelecting = false;
              try {
                this.translator.ui.showProcessingStatus("Capturing screenshot...");
                const rect = selection.getBoundingClientRect();
                if (rect.width < 10 || rect.height < 10) {
                  selection.remove();
                  return;
                }
                const video = document.createElement('video');
                video.style.cssText = 'position: fixed; top: -9999px; left: -9999px;';
                document.body.appendChild(video);
                const stream = await navigator.mediaDevices.getDisplayMedia({
                  preferCurrentTab: true,
                  video: {
                    width: window.innerWidth,
                    height: window.innerHeight
                  }
                });
                video.srcObject = stream;
                await video.play();
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = rect.width;
                canvas.height = rect.height;
                ctx.drawImage(video,
                  rect.left, rect.top, rect.width, rect.height,
                  0, 0, rect.width, rect.height
                );
                stream.getTracks().forEach(track => track.stop());
                video.remove();
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const pixels = imageData.data;
                let isMonochrome = true;
                const firstPixel = {
                  r: pixels[0],
                  g: pixels[1],
                  b: pixels[2],
                  a: pixels[3]
                };
                for (let i = 4; i < pixels.length; i += 4) {
                  if (pixels[i] !== firstPixel.r ||
                    pixels[i + 1] !== firstPixel.g ||
                    pixels[i + 2] !== firstPixel.b ||
                    pixels[i + 3] !== firstPixel.a) {
                    isMonochrome = false;
                    break;
                  }
                }
                const isWhiteOrTransparent = (
                  (firstPixel.r === 255 && firstPixel.g === 255 && firstPixel.b === 255) ||
                  firstPixel.a === 0
                );
                if (isMonochrome && isWhiteOrTransparent) {
                  throw new Error(this._("notifications.no_content_in_selection"));
                }
                const blob = await new Promise(resolve => {
                  canvas.toBlob(resolve, 'image/png', 1.0);
                });
                if (!blob || blob.size < 100) {
                  throw new Error(this._("notifications.invalid_image_file"));
                }
                const file = new File([blob], "screenshot.png", { type: "image/png" });
                resolve(file);
              } catch (error) {
                console.log("Primary method failed, switching to backup:", error);
                try {
                  const rect = selection.getBoundingClientRect();
                  const elements = document.elementsFromPoint(
                    rect.left + rect.width / 2,
                    rect.top + rect.height / 2
                  );
                  const targetElement = elements.find(el => {
                    const classList = el.classList ? Array.from(el.classList) : [];
                    const id = el.id || '';
                    return !id.includes('translator') &&
                      !classList.some(c => c.includes('translator')) &&
                      !classList.some(c => c.includes('screenshot'));
                  });
                  if (!targetElement) {
                    throw new Error(this._("notifications.cannot_identify_region"));
                  }
                  if (targetElement.tagName === 'IMG' || targetElement.tagName === 'CANVAS') {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    canvas.width = rect.width;
                    canvas.height = rect.height;
                    if (targetElement.tagName === 'IMG') {
                      const originalCrossOrigin = targetElement.crossOrigin;
                      targetElement.crossOrigin = 'anonymous';
                      await new Promise((resolve, reject) => {
                        const loadHandler = () => {
                          targetElement.removeEventListener('load', loadHandler);
                          targetElement.removeEventListener('error', errorHandler);
                          resolve();
                        };
                        const errorHandler = () => {
                          targetElement.removeEventListener('load', loadHandler);
                          targetElement.removeEventListener('error', errorHandler);
                          targetElement.crossOrigin = originalCrossOrigin;
                          reject(new Error(this._("notifications.image_load_error")));
                        };
                        if (targetElement.complete) {
                          resolve();
                        } else {
                          targetElement.addEventListener('load', loadHandler);
                          targetElement.addEventListener('error', errorHandler);
                        }
                      });
                      const elementRect = targetElement.getBoundingClientRect();
                      const sourceX = rect.left - elementRect.left;
                      const sourceY = rect.top - elementRect.top;
                      const scaleX = targetElement.naturalWidth / elementRect.width;
                      const scaleY = targetElement.naturalHeight / elementRect.height;
                      ctx.drawImage(
                        targetElement,
                        sourceX * scaleX,
                        sourceY * scaleY,
                        rect.width * scaleX,
                        rect.height * scaleY,
                        0,
                        0,
                        rect.width,
                        rect.height
                      );
                      targetElement.crossOrigin = originalCrossOrigin;
                    } else if (targetElement.tagName === 'CANVAS') {
                      const sourceCtx = targetElement.getContext('2d', { willReadFrequently: true });
                      const elementRect = targetElement.getBoundingClientRect();
                      const sourceX = rect.left - elementRect.left;
                      const sourceY = rect.top - elementRect.top;
                      const scaleX = targetElement.width / elementRect.width;
                      const scaleY = targetElement.height / elementRect.height;
                      try {
                        const imageData = sourceCtx.getImageData(
                          sourceX * scaleX,
                          sourceY * scaleY,
                          rect.width * scaleX,
                          rect.height * scaleY
                        );
                        canvas.width = imageData.width;
                        canvas.height = imageData.height;
                        ctx.putImageData(imageData, 0, 0);
                      } catch (error) {
                        if (error.name === 'SecurityError') {
                          throw new Error(this._("notifications.canvas_security_error"));
                        }
                        throw error;
                      }
                    }
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const hasContent = imageData.data.some(pixel => pixel !== 0);
                    if (!hasContent) {
                      throw new Error(this._("notifications.cannot_capture_element"));
                    }
                    const file = await new Promise((resolve, reject) => {
                      canvas.toBlob(blob => {
                        if (!blob || blob.size < 100) {
                          reject(new Error(this._("notifications.cannot_generate_valid")));
                          return;
                        }
                        resolve(new File([blob], "screenshot.png", { type: "image/png" }));
                      }, 'image/png', 1.0);
                    });
                    resolve(file);
                  } else {
                    const screenshotCanvas = await html2canvas(targetElement, {
                      width: rect.width,
                      height: rect.height,
                      x: rect.left - targetElement.getBoundingClientRect().left,
                      y: rect.top - targetElement.getBoundingClientRect().top,
                      scale: 2,
                      logging: false,
                      useCORS: true,
                      allowTaint: true,
                      backgroundColor: '#ffffff',
                      foreignObjectRendering: true,
                      removeContainer: true,
                      ignoreElements: (element) => {
                        const classList = element.classList ? Array.from(element.classList) : [];
                        const id = element.id || '';
                        return id.includes('translator') ||
                          classList.some(c => c.includes('translator')) ||
                          classList.some(c => c.includes('screenshot'));
                      },
                      onclone: (clonedDoc) => {
                        const elements = clonedDoc.querySelectorAll('[id*="translator"], [class*="translator"], [class*="screenshot"]');
                        elements.forEach(el => el.remove());
                      }
                    });
                    const file = await new Promise((resolve, reject) => {
                      screenshotCanvas.toBlob(blob => {
                        if (!blob || blob.size < 100) {
                          reject(new Error(this._("notifications.invalid_screenshot")));
                          return;
                        }
                        resolve(new File([blob], "screenshot.png", { type: "image/png" }));
                      }, 'image/png', 1.0);
                    });
                    resolve(file);
                  }
                } catch (backupError) {
                  console.error("Backup method failed:", backupError);
                  reject(new Error(this._("notifications.cannot_capture_screen") + backupError.message));
                }
              } finally {
                cleanup();
              }
            }, 100);
            const cleanup = () => {
              setTimeout(() => this.translator.ui.removeProcessingStatus(), 1000);
              overlay.remove();
              guide.remove();
              cancelBtn.remove();
              if (selection) selection.remove();
              style.remove();
              elements.forEach(el => {
                if (el) el.style.visibility = "";
              });
              overlay.removeEventListener('mousedown', startSelection);
              document.removeEventListener('mousemove', updateSelection);
              document.removeEventListener('mouseup', endSelection);
              overlay.removeEventListener('touchstart', startSelection);
              document.removeEventListener('touchmove', updateSelection);
              document.removeEventListener('touchend', endSelection);
              document.removeEventListener('touchcancel', cleanup);
            };
            overlay.addEventListener('mousedown', startSelection);
            document.addEventListener('mousemove', updateSelection);
            document.addEventListener('mouseup', endSelection);
            overlay.addEventListener('touchstart', startSelection, { passive: false });
            document.addEventListener('touchmove', updateSelection, { passive: false });
            document.addEventListener('touchend', endSelection);
            document.addEventListener('touchcancel', cleanup);
            cancelBtn.addEventListener("click", () => {
              cleanup();
              reject(new Error('Đã hủy chọn vùng'));
            });
            document.addEventListener('keydown', (e) => {
              if (e.key === 'Escape') {
                cleanup();
                reject(new Error('Đã hủy chọn vùng'));
              }
            });
          });
        } catch (error) {
          console.error("Screen capture error:", error);
          const elements = this.translator.ui.$$(".translator-tools-container, .translator-notification, .center-translate-status");
          elements.forEach(el => {
            if (el) el.style.visibility = "";
          });
          throw error;
        }
      } catch (error) {
        console.error("Screen capture error:", error);
        const elements = this.translator.ui.$$(".translator-tools-container, .translator-notification, .center-translate-status");
        elements.forEach(el => {
          if (el) el.style.visibility = "";
        });
        throw error;
      }
    }
    async processImage(file, prompts) {
      try {
        const settings = this.translator.userSettings.settings;
        this.isProcessing = true;
        this.translator.ui.showProcessingStatus(this._("notifications.processing_image"));
        const optimizedFile = await this.optimizeImage(file);
        const base64Image = await this.fileToBase64(optimizedFile);
        this.translator.ui.updateProcessingStatus(this._("notifications.checking_cache"), 20);
        if (this.imageCache && settings.cacheOptions.image.enabled) {
          const cachedResult = await this.imageCache.get(base64Image);
          if (cachedResult) {
            this.translator.ui.updateProcessingStatus(this._("notifications.found_in_cache"), 100);
            return cachedResult;
          }
        }
        this.translator.ui.updateProcessingStatus(this._("notifications.detecting_text"), 40);
        const prompt = prompts ? prompts : this.translator.createPrompt("ocr", "ocr");
        const content = await this.translator.fileProcess.processFile(file, prompt);
        if (this.translator.userSettings.settings.apiProvider === 'puter') return content;
        const result = await this.translator.api.request(content.content, 'ocr', content.key);
        if (this.imageCache && settings.cacheOptions.image.enabled) {
          await this.imageCache.set(base64Image, result);
        }
        this.translator.ui.updateProcessingStatus(this._("notifications.completed"), 100);
        return result;
      } catch (error) {
        console.error("OCR processing error:", error);
        throw error;
      } finally {
        this.isProcessing = false;
        setTimeout(() => this.translator.ui.removeProcessingStatus(), 1000);
      }
    }
    async optimizeImage(file) {
      const img = await createImageBitmap(file);
      const maxDimension = 2560;
      let newWidth = img.width;
      let newHeight = img.height;
      if (img.width > maxDimension || img.height > maxDimension) {
        if (img.width > img.height) {
          newWidth = maxDimension;
          newHeight = Math.floor(img.height * (maxDimension / img.width));
        } else {
          newHeight = maxDimension;
          newWidth = Math.floor(img.width * (maxDimension / img.height));
        }
      }
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', {
        willReadFrequently: true,
        alpha: true
      });
      canvas.width = newWidth;
      canvas.height = newHeight;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium'; // 'high', 'medium'
      ctx.filter = 'contrast(1.1) brightness(1.05)';
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      try {
        const blob = await new Promise(resolve => {
          canvas.toBlob(resolve, 'image/webp', 0.92);
        });
        if (blob) {
          return new File([blob], file.name, {
            type: 'image/webp',
            lastModified: Date.now()
          });
        }
      } catch (e) {
        console.log('WebP not supported, falling back to JPEG');
      }
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.92);
      });
      return new File([blob], file.name, {
        type: 'image/jpeg',
        lastModified: Date.now()
      });
    }
    async reduceImageSize(file) {
      const img = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      canvas.width = Math.floor(img.width * 0.75);
      canvas.height = Math.floor(img.height * 0.75);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85);
      });
      return new File([blob], file.name, { type: 'image/jpeg' });
    }
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error((this._("notifications.failed_read_file"))));
        reader.readAsDataURL(file);
      });
    }
  }
  class MediaManager {
    constructor(translator) {
      this.translator = translator;
      this.isProcessing = false;
      this._ = this.translator.userSettings._;
      this.mediaCache = new FileCache(
        CONFIG.CACHE.media.maxSize,
        CONFIG.CACHE.media.expirationTime
      );
    }
    async processMediaFile(file) {
      try {
        if (!this.isValidFormat(file)) {
          throw new Error(this._("notifications.unsupported_file_format"));
        }
        if (!this.isValidSize(file)) {
          throw new Error(this._("notifications.file_too_large") + ` Kích thước tối đa: ${this.getMaxSizeInMB(file)}MB`);
        }
        this.isProcessing = true;
        this.translator.ui.showProcessingStatus(this._("notifications.processing_media"));
        const base64Media = await this.fileToBase64(file);
        this.translator.ui.updateProcessingStatus(this._("notifications.checking_cache"), 20);
        const cacheEnabled =
          this.translator.userSettings.settings.cacheOptions.media?.enabled;
        if (cacheEnabled && this.mediaCache) {
          const cachedResult = await this.mediaCache.get(base64Media);
          if (cachedResult) {
            this.translator.ui.updateProcessingStatus(this._("notifications.found_in_cache"), 100);
            this.translator.ui.displayPopup(cachedResult, '', "Bản dịch");
            return;
          }
        }
        this.translator.ui.updateProcessingStatus(this._("notifications.processing_audio_video"), 40);
        const prompt = this.translator.createPrompt("media", "media");
        const content = await this.translator.fileProcess.processFile(file, prompt);
        if (this.translator.userSettings.settings.apiProvider === 'puter') return content;
        this.translator.ui.updateProcessingStatus(this._("notifications.translating"), 60);
        const result = await this.translator.api.request(content.content, 'media', content.key);
        this.translator.ui.updateProcessingStatus(this._("notifications.finalizing"), 80);
        if (!result || result.length === 0) {
          throw new Error(this._("notifications.cannot_process_media"));
        }
        if (cacheEnabled && this.mediaCache) {
          await this.mediaCache.set(base64Media, result);
        }
        this.translator.ui.updateProcessingStatus(this._("notifications.completed"), 100);
        this.translator.ui.displayPopup(result, '', this._("notifications.translation_label"));
      } catch (error) {
        console.error("Media processing error:", error);
        throw new Error(this._("notifications.media_file_error") + ` ${error.message}`);
      } finally {
        this.isProcessing = false;
        setTimeout(() => this.translator.ui.removeProcessingStatus(), 1000);
      }
    }
    isValidFormat(file) {
      const extension = file.name.split(".").pop().toLowerCase();
      const mimeMapping = {
        mp3: "audio/mp3",
        wav: "audio/wav",
        ogg: "audio/ogg",
        m4a: "audio/m4a",
        aac: "audio/aac",
        flac: "audio/flac",
        wma: "audio/wma",
        opus: "audio/opus",
        amr: "audio/amr",
        midi: "audio/midi",
        mid: "audio/midi",
        mp4: "video/mp4",
        webm: "video/webm",
        ogv: "video/ogg",
        avi: "video/x-msvideo",
        mov: "video/quicktime",
        wmv: "video/x-ms-wmv",
        flv: "video/x-flv",
        "3gp": "video/3gpp",
        "3g2": "video/3gpp2",
        mkv: "video/x-matroska"
      };
      const mimeType = mimeMapping[extension];
      if (mimeType?.startsWith("audio/")) {
        return CONFIG.MEDIA.audio.supportedFormats.includes(mimeType);
      } else if (mimeType?.startsWith("video/")) {
        return CONFIG.MEDIA.video.supportedFormats.includes(mimeType);
      }
      return false;
    }
    isValidSize(file) {
      const maxSize = file.type.startsWith("audio/")
        ? CONFIG.MEDIA.audio.maxSize
        : CONFIG.MEDIA.video.maxSize;
      return file.size <= maxSize;
    }
    getMaxSizeInMB(file) {
      const maxSize = file.type.startsWith("audio/")
        ? CONFIG.MEDIA.audio.maxSize
        : CONFIG.MEDIA.video.maxSize;
      return Math.floor(maxSize / (1024 * 1024));
    }
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error((this._("notifications.failed_read_file"))));
        reader.readAsDataURL(file);
      });
    }
    cleanup() {
      try {
        if (this.audioCtx) {
          this.audioCtx.close();
          this.audioCtx = null;
        }
        if (this.processor) {
          this.processor.disconnect();
          this.processor = null;
        }
        if (this.container) {
          this.container.remove();
          this.container = null;
        }
        this.mediaElement = null;
        this.audioBuffer = null;
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }
  }
  class VideoStreamingTranslator {
    constructor(translator) {
      this.translator = translator;
      this.settings = this.translator.userSettings.settings;
      this._ = this.translator.userSettings._;
      this.defaultLang = this.settings.displayOptions.targetLanguage;
      this.isEnabled = false;
      this.isPlaying = false;
      this.hasCaptions = false;
      this.initialized = false;
      this.isFetchingTranscript = false;
      this.isTranslatingChunk = false;
      this.isSeeking = false;
      this.lastCurrentTime = -1;
      this.fullTranscriptTranslated = false;
      this.isNotify = false;
      this.activeVideoId = null;
      this.currentVideo = null;
      this.videoTrackingInterval = null;
      this.translatedTranscript = null;
      this.subtitleContainer = null;
      this.lastCaption = '';
      this.lastTranslatedIndex = -1;
      this.translatingIndexes = new Set();
      this.subtitleCache = new Map();
      this.keyIndex = null;
      this.rateLimitedKeys = new Map();
      this.retryDelay = 100;
      this.captionObserver = null;
      this.platformInfo = this.detectPlatform();
      if (this.settings.videoStreamingOptions?.enabled && this.platformInfo) {
        GM_addStyle(`
.caption-window {
  position: absolute !important;
  opacity: 0 !important;
  visibility: hidden !important;
  pointer-events: none !important;
  width: 1px !important;
  height: 1px !important;
  overflow: hidden !important;
  clip: rect(0 0 0 0) !important;
  margin: -1px !important;
  padding: 0 !important;
  border: 0 !important;
}`);
        this.start();
      }
    }
    detectPlatform() {
      this.platformConfigs = {
        youtube: {
          videoSelector: [
            'video',
            'video.html5-main-video',
            '.html5-video-container video',
            '#movie_player video',
          ],
          controlsContainer: [
            '.ytp-right-controls',
            '.player-controls-top',
          ],
          videoContainer: [
            '#movie_player',
            '#player',
            '.html5-video-container',
          ],
          captionSelector: ['.captions-text'],
          captionButton: {
            desktop: '.ytp-subtitles-button',
            mobile: '.ytmClosedCaptioningButtonButton'
          }
        },
      };
      const hostname = window.location.hostname;
      for (const [platform, config] of Object.entries(this.platformConfigs)) {
        if (hostname.includes(platform)) {
          return { platform, config };
        }
      }
      return null;
    }
    setupVideoListeners() {
      if (!this.currentVideo || this.initialized) return;
      this.activeVideoId = Math.random().toString(36).substring(7);
      this.currentVideo.dataset.translatorVideoId = this.activeVideoId;
      const videoEvents = ['play', 'playing', 'seeking', 'seeked', 'pause', 'ended'];
      videoEvents.forEach(eventName => {
        const handler = async () => {
          if (this.currentVideo?.dataset.translatorVideoId !== this.activeVideoId) return;
          switch (eventName) {
            case 'play':
            case 'playing':
              this.isPlaying = true;
              break;
            case 'seeking':
              this.isSeeking = true;
              break;
            case 'seeked':
              this.isSeeking = false;
              this.isTranslatingChunk = false;
              this.processVideoFrame();
              break;
            case 'pause':
              this.isPlaying = false;
              break;
            case 'ended':
              this.isPlaying = false;
              this.cleanupVideo();
              break;
          }
        };
        this.currentVideo.addEventListener(eventName, handler);
        this.currentVideo[`${eventName}Handler`] = handler;
      });
      if (this.currentVideo) {
        let previousWidth = 0;
        let translatedCaption = null;
        let originalText = null;
        let translatedText = null;
        const updateStyles = debounce((width) => {
          if (width === previousWidth) return;
          previousWidth = width;
          if (!translatedCaption) translatedCaption = document.querySelector('.translated-caption');
          if (!originalText) originalText = document.querySelector('.original-text') || null;
          if (!translatedText) translatedText = document.querySelector('.translated-text');
          if (translatedText) {
            let tranWidth, origSize, transSize;
            if (width <= 480) {
              tranWidth = '98%';
              origSize = '0.65em';
              transSize = '0.7em';
            } else if (width <= 962) {
              tranWidth = '95%';
              origSize = '0.75em';
              transSize = '0.8em';
            } else if (width <= 1366) {
              tranWidth = '90%';
              origSize = '0.85em';
              transSize = '0.9em';
            } else {
              tranWidth = '90%';
              origSize = '0.95em';
              transSize = '1em';
            }
            if (translatedCaption) translatedCaption.style.maxWidth = tranWidth;
            if (originalText) originalText.style.fontSize = origSize;
            translatedText.style.fontSize = transSize;
          }
        }, 100);
        const adjustContainer = debounce(() => {
          if (!this.subtitleContainer || !this.currentVideo) return;
          const videoRect = this.currentVideo.getBoundingClientRect();
          const containerRect = this.subtitleContainer.getBoundingClientRect();
          if (containerRect.bottom > videoRect.bottom) {
            this.subtitleContainer.style.bottom = '5%';
          }
          if (containerRect.width > videoRect.width * 0.9) {
            this.subtitleContainer.style.maxWidth = '90%';
          }
        }, 100);
        const resizeObserver = new ResizeObserver(entries => {
          const width = entries[0].contentRect.width;
          updateStyles(width);
          adjustContainer();
        });
        resizeObserver.observe(this.currentVideo);
      }
      this.initialized = true;
    }
    parseTimestampToSeconds(timestampStr) {
      if (!timestampStr) return 0;
      const parts = timestampStr.split(':').map(Number);
      let seconds = 0;
      if (parts.length === 3) { // HH:MM:SS
        seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) { // MM:SS
        seconds = parts[0] * 60 + parts[1];
      } else if (parts.length === 1) { // SS
        seconds = parts[0];
      }
      return seconds;
    }
    async getTranscriptFromDOM() {
      console.log('[King_DEBUG] Attempting to get transcript from DOM.');
      let cookieButtonElement;
      cookieButtonElement = document.querySelector("button[aria-label*=cookies]");
      if (cookieButtonElement) {
        cookieButtonElement.click();
      }
      await new Promise(resolve => {
        const findAndClickTranscriptButton = () => {
          const transcriptButton = document.querySelector("ytd-video-description-transcript-section-renderer button") || document.querySelector('button[title="Transcript"]');
          if (transcriptButton) {
            transcriptButton.click();
            resolve();
          } else {
            setTimeout(findAndClickTranscriptButton, 500);
          }
        };
        findAndClickTranscriptButton();
      });
      let segmentsContainer;
      segmentsContainer = await new Promise(resolve => {
        const waitForTranscriptContainer = () => {
          const container = document.querySelector("#segments-container") || document.querySelector('#transcript-scrollbox');
          if (container) {
            resolve(container);
          } else {
            setTimeout(waitForTranscriptContainer, 500);
          }
        };
        waitForTranscriptContainer();
      });
      const selectors = ['ytd-transcript-segment-renderer', '.caption-line'];
      for (const selector of selectors) {
        const segments = segmentsContainer.querySelectorAll(selector);
        if (segments && segments.length > 0) {
          console.log(segments);
          const transcriptData = [];
          for (let i = 0; i < segments.length; i++) {
            const segment = segments[i];
            const timeEl = segment.querySelector('.segment-timestamp') || segment.querySelector('.caption-line-time');
            const textEl = segment.querySelector('.segment-text') || segment.querySelector('.caption-line-text');
            if (timeEl && textEl) {
              const text = this.cleanTranscriptText(textEl.textContent || '');
              if (text) {
                const start = this.parseTimestampToSeconds(timeEl.textContent.trim());
                let duration = 5.0;
                if (i + 1 < segments.length) {
                  const nextTimeEl = segments[i + 1].querySelector('.segment-timestamp') || segments[i + 1].querySelector('.caption-line-time');
                  if (nextTimeEl) {
                    const nextStart = this.parseTimestampToSeconds(nextTimeEl.textContent.trim());
                    duration = nextStart - start;
                  }
                }
                transcriptData.push({ text, start, duration });
              }
            }
          }
          console.log(`[King_DEBUG] DOM method successful. Extracted ${transcriptData.length} timed captions.`);
          return transcriptData.length > 0 ? transcriptData : null;
        }
      }
    }
    async getVideoTranscript() {
      if (this.videoTranscript) return this.videoTranscript;
      if (this.isFetchingTranscript) return null;
      this.isFetchingTranscript = true;
      console.log("[KING_DEBUG] getVideoTranscript: Starting to fetch transcript...");
      const finalErrorMessage = this._("notifications.get_transcript_error_generic") + "\n\n" +
        this._("notifications.get_transcript_error_suggestion1") + "\n" +
        this._("notifications.get_transcript_error_suggestion2");
      try {
        const domTranscript = await this.getTranscriptFromDOM();
        if (domTranscript && domTranscript.length > 0) {
          this.videoTranscript = domTranscript;
          this.translatedTranscript = new Array(this.videoTranscript.length).fill(null);
          console.log("[KING_DEBUG] getVideoTranscript (DOM): Success! Parsed", this.videoTranscript.length, "captions.");
          this.translateFullTranscriptInBackground();
          return this.videoTranscript;
        }
        console.error("[King_DEBUG] All methods failed to get transcript.");
        if (!this.isNotify) this.translator.ui.showNotification(finalErrorMessage, "error");
        this.isNotify = true;
        throw new Error(finalErrorMessage);
      } catch (error) {
        console.error('[KING_DEBUG] Error in getVideoTranscript:', error);
        if (!this.isNotify) this.translator.ui.showNotification(error.message, "error");
        this.isNotify = true;
        return null;
      } finally {
        this.isFetchingTranscript = false;
      }
    }
    cleanTranscriptText(text) {
      return text
        .replace(/\n/g, " ")
        .replace(/♪|'|"|\.{2,}|\<[\s\S]*?\>|\{[\s\S]*?\}|\[[\s\S]*?\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    }
    formatMilliseconds(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      const paddedSeconds = String(seconds).padStart(2, "0");
      const paddedMinutes = String(minutes).padStart(2, "0");
      if (hours > 0) {
        const paddedHours = String(hours).padStart(2, "0");
        return `${paddedHours}:${paddedMinutes}:${paddedSeconds}`;
      } else {
        return `${paddedMinutes}:${paddedSeconds}`;
      }
    }
    async translateFullTranscriptInBackground() {
      if (!this.videoTranscript || this.fullTranscriptTranslated) return;
      console.log("[KING_DEBUG] Starting full transcript translation in background using JSON with IDs...");
      try {
        const originalTranscriptWithIDs = this.videoTranscript.map((caption, index) => ({
          id: index,
          text: caption.text
        }));
        const originalTranscriptJSON = JSON.stringify(originalTranscriptWithIDs, null, 2);
        const docTitle = document.title ? `từ video có tiêu đề "${document.title}"` : '';
        const targetLang = this.settings.displayOptions.targetLanguage;
        const fullPrompt = `You are an expert subtitle translator. Your task is to translate the 'text' field for each object in the following JSON array to '${targetLang}'.
- The video is titled: "${docTitle}". Use this context.
- You MUST return a valid JSON array.
- For EACH object you translate, you MUST include the original 'id' from the input.
- Each object in the output array must contain exactly two fields: "id" (the original integer ID) and "translation" (the translated text).
- Do NOT add, merge, or skip any objects. The output array should ideally have the same number of objects as the input.
- Do NOT add any extra text, comments, or markdown formatting (like \`\`\`json). The output must be raw, valid JSON.
Input JSON:
${originalTranscriptJSON}
Expected Output JSON format:
[
  { "id": 0, "translation": "Translated text for object with id 0..." },
  { "id": 1, "translation": "Translated text for object with id 1..." },
  ...
]
`;
        const rawResponse = await this.translator.api.request(fullPrompt, 'media');
        if (rawResponse) {
          let translatedData;
          try {
            const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (jsonMatch) {
              translatedData = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("No valid JSON array found in the response.");
            }
          } catch (e) {
            console.error("[KING_DEBUG] Failed to parse JSON response from AI:", e);
            console.error("[KING_DEBUG] Raw AI Response:", rawResponse);
            return;
          }
          if (Array.isArray(translatedData)) {
            let successfulTranslations = 0;
            translatedData.forEach(item => {
              if (item && typeof item.id === 'number' && item.translation && this.videoTranscript[item.id]) {
                this.translatedTranscript[item.id] = {
                  original: this.videoTranscript[item.id].text,
                  translation: item.translation
                };
                successfulTranslations++;
              }
            });
            console.log(`[KING_DEBUG] Successfully mapped ${successfulTranslations} translations using IDs.`);
            if (successfulTranslations / this.videoTranscript.length > 0.9) {
              this.fullTranscriptTranslated = true;
              console.log("[KING_DEBUG] Full transcript translation is considered complete!");
            } else {
              console.warn("[KING_DEBUG] Full transcript translation was partial. Fallback to chunk translation will continue for missing parts.");
            }
          } else {
            console.error("[KING_DEBUG] Translated data is not an array.");
          }
        }
      } catch (error) {
        console.error("[KING_DEBUG] Error during full transcript translation:", error);
      }
    }
    getCurrentCaption(transcript, currentTime) {
      if (!transcript || !Array.isArray(transcript)) return null;
      const caption = transcript.find(item => {
        const start = item.start;
        const end = start + (item.duration || 0);
        return currentTime >= start && currentTime < end;
      });
      return caption || null;
    }
    async processVideoFrame() {
      if (!this.isEnabled || !this.currentVideo || this.isSeeking) return;
      try {
        if (!this.videoTranscript && !this.isFetchingTranscript) {
          await this.getVideoTranscript();
        }
        if (!this.videoTranscript) return;
        const currentTime = this.currentVideo.currentTime;
        const currentIndex = this.videoTranscript.findIndex(caption => {
          const start = caption.start;
          const end = start + (caption.duration || 5);
          return currentTime >= start && currentTime < end;
        });
        if (currentIndex === -1) {
          if (this.subtitleContainer) this.subtitleContainer.innerText = '';
          this.lastCaption = '';
          return;
        }
        const currentDisplayMode = this.settings.displayOptions?.translationMode;
        let separator = '\n';
        if (currentDisplayMode === 'parallel' || (currentDisplayMode === 'language_learning' && this.settings.displayOptions.languageLearning?.showSource)) {
          separator = ' ';
        }
        const currentOriginal = this.videoTranscript[currentIndex];
        const currentTranslated = this.translatedTranscript[currentIndex];
        const nextOriginal = this.videoTranscript[currentIndex + 1];
        const nextTranslated = this.translatedTranscript[currentIndex + 1];
        let combinedOriginalText = currentOriginal.text;
        let combinedTranslatedText = currentTranslated ? currentTranslated.translation : '...';
        if (nextOriginal) {
          combinedOriginalText += `${separator}${nextOriginal.text}`;
          if (nextTranslated) {
            combinedTranslatedText += `${separator}${nextTranslated.translation}`;
          } else {
            combinedTranslatedText += `${separator}...`;
          }
        }
        const displayData = {
          original: combinedOriginalText,
          translation: combinedTranslatedText,
        };
        if (displayData.translation !== this.lastCaption) {
          this.lastCaption = displayData.translation;
          this.updateSubtitles(displayData);
        }
        if (!this.isTranslatingChunk && this.checkNeedsTranslation(currentIndex)) {
          this.translateUpcomingCaptions(currentIndex);
        }
      } catch (error) {
        console.error('[KING_DEBUG] Error in processVideoFrame:', error);
      }
    }
    checkNeedsTranslation(currentIndex) {
      const LOOK_AHEAD = 20;
      const endIndex = Math.min(currentIndex + LOOK_AHEAD, this.videoTranscript.length);
      for (let i = currentIndex + 1; i < endIndex; i++) {
        if (!this.translatedTranscript[i] && !this.translatingIndexes.has(i)) {
          return true;
        }
      }
      return false;
    }
    async translateUpcomingCaptions(currentIndex) {
      if (this.isTranslatingChunk || !this.videoTranscript || this.fullTranscriptTranslated) return;
      this.isTranslatingChunk = true;
      try {
        const CHUNK_SIZE = 5;
        const untranslatedCaptions = [];
        for (let i = currentIndex; i < this.videoTranscript.length && untranslatedCaptions.length < CHUNK_SIZE; i++) {
          if (!this.translatedTranscript[i]) {
            untranslatedCaptions.push({ text: this.videoTranscript[i].text, index: i });
          }
        }
        if (untranslatedCaptions.length === 0) return;
        console.log(`[KING_DEBUG] Translating temporary chunk of ${untranslatedCaptions.length} captions.`);
        const chunkText = untranslatedCaptions.map(c => c.text).join(' <-> ');
        const result = await this.translator.api.request(this.createLiveCaptionPrompt(chunkText), 'media');
        if (result) {
          const translations = result.split('<->');
          untranslatedCaptions.forEach((captionInfo, index) => {
            if (!this.fullTranscriptTranslated) {
              this.translatedTranscript[captionInfo.index] = {
                original: captionInfo.text,
                translation: translations[index]?.trim() || captionInfo.text
              };
            }
          });
        }
      } catch (error) {
        console.error(this._("notifications.upcoming_captions_error"), error);
      } finally {
        this.isTranslatingChunk = false;
      }
    }
    createLiveCaptionPrompt(text, isFast = false) {
      const docTitle = `Đây là video có tiêu đề "${document.title}", hãy` || 'Hãy';
      const targetLang = this.settings.displayOptions.targetLanguage;
      return `  ${isFast ? 'Hãy' : docTitle} dịch phụ đề từ video đó ở dưới đây sang "${targetLang}".
  Văn bản cần dịch:
\`\`\`
${text}
\`\`\`
  Lưu ý:
    - Nếu có <-> làm phân cách giữa các văn bản thì hãy chỉ dịch văn bản giữa <-> và không thay đổi vị trí sự phân cách của <-> ở bản dịch trả về.
    - Trả về bản dịch mà không có dấu Backtick ở đầu và cuối văn bản.
    - Chỉ trả về bản dịch theo yêu cầu trên và không giải thích gì thêm.
`;
    }
    startVideoTracking() {
      if (this.videoTrackingInterval) {
        clearInterval(this.videoTrackingInterval);
      }
      this.videoTrackingInterval = setInterval(() => {
        this.processVideoFrame();
      }, 250);
      console.log("[KING_DEBUG] Video tracking started with 250ms interval.");
    }
    async start() {
      if (this.isEnabled) {
        console.log("[KING_DEBUG] Feature is already enabled.");
        return;
      }
      this.isEnabled = true;
      console.log("[KING_DEBUG] start() called. Waiting for active video...");
      const findActiveVideo = () => {
        const videoSelectors = this.platformInfo.config.videoSelector;
        for (const selector of videoSelectors) {
          const videos = document.querySelectorAll(selector);
          for (const video of videos) {
            if (video.src && video.readyState > 2 && !video.paused && video.videoHeight > 0) {
              return video;
            }
          }
        }
        for (const selector of videoSelectors) {
          const videos = document.querySelectorAll(selector);
          for (const video of videos) {
            if (video.currentTime > 0.1) {
              return video;
            }
          }
        }
        return null;
      };
      let activeVideo = null;
      const maxAttempts = 5 * 300; // 5 minutes
      for (let i = 0; i < maxAttempts; i++) {
        if (!this.isEnabled) {
          console.log("[KING_DEBUG] Start process cancelled by user.");
          return;
        }
        activeVideo = findActiveVideo();
        if (activeVideo) {
          console.log("[KING_DEBUG] Active video found after", (i * 200) + "ms", activeVideo);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      if (!activeVideo) {
        console.error("[KING_DEBUG] Could not find an active video after 5 minutes. Aborting.");
        this.translator.ui.showNotification(this._("notifications.not_find_video"), "error");
        this.isEnabled = false;
        return;
      }
      this.currentVideo = activeVideo;
      this.setupVideoListeners();
      this.createVideoControls();
      this.startVideoTracking();
    }
    stop() {
      this.isEnabled = false;
      this.isPlaying = false;
      if (this.videoTrackingInterval) {
        clearInterval(this.videoTrackingInterval);
        this.videoTrackingInterval = null;
      }
      this.cleanupVideo();
      if (this.subtitleContainer) {
        this.subtitleContainer.remove();
        this.subtitleContainer = null;
      }
      this.isNotify = false;
      this.currentVideo = null;
      this.subtitleCache.clear();
      this.rateLimitedKeys.clear();
      this.keyIndex = null;
      this.videoTranscript = null;
      this.translatedTranscript = null;
      this.lastCaption = null;
      console.log(this._("notifications.stop_cap"));
    }
    cleanup() {
      if (this.videoTrackingInterval) {
        clearInterval(this.videoTrackingInterval);
      }
      this.stop();
      this.subtitleCache.clear();
    }
    cleanupVideo() {
      if (this.currentVideo) {
        delete this.currentVideo.dataset.translatorVideoId;
        const videoEvents = ['play', 'playing', 'seeking', 'seeked', 'pause', 'ended'];
        videoEvents.forEach(event => {
          const handler = this.currentVideo[`${event}Handler`];
          if (handler) {
            this.currentVideo.removeEventListener(event, handler);
            delete this.currentVideo[`${event}Handler`];
          }
        });
      }
      this.initialized = false;
      this.hasCaptions = false;
      this.lastCaption = '';
    }
    createVideoControls() {
      if (this.controlsContainer) return;
      console.log("[KING_DEBUG] Creating video controls.");
      const toggleButton = document.createElement('button');
      let controlsTarget = null;
      let anchorButton = null;
      const selectors = this.platformInfo.config.controlsContainer;
      for (const selector of selectors) {
        controlsTarget = document.querySelector(selector);
        if (controlsTarget) {
          console.log(`[KING_DEBUG] Found controls container with selector: ${selector}`);
          break;
        }
      }
      if (!controlsTarget) {
        anchorButton = document.querySelector('.ytp-subtitles-button') || document.querySelector('.ytp-settings-button');
        controlsTarget = anchorButton.parentElement;
        toggleButton.className = anchorButton.className;
      }
      if (!controlsTarget) {
        console.warn("[KING_DEBUG] Could not find controls container, attempting to append to video container.");
        controlsTarget = this.findVideoContainer();
        if (!controlsTarget) {
          console.error("[KING_DEBUG] Failed to find any suitable container for controls.");
          return;
        }
      }
      toggleButton.classList.add('video-translation-controls');
      toggleButton.title = this.isEnabled ? this._("notifications.live_caption_off") : this._("notifications.live_caption_on");
      toggleButton.setAttribute('role', 'button');
      toggleButton.setAttribute('tabindex', '6200');
      toggleButton.innerHTML = `<img src="https://raw.githubusercontent.com/king1x32/King-Translator-AI/refs/heads/main/icon/kings.jpg" style="width: 24px; height: 24px; vertical-align: middle;">`;
      toggleButton.onclick = (e) => {
        e.stopPropagation();
        if (this.isEnabled) {
          this.stop();
          this.translator.ui.showNotification(this._("notifications.live_caption_off2"), "info");
          this.controlsContainer.title = this._("notifications.live_caption_on");
        } else {
          this.start();
          this.translator.ui.showNotification(this._("notifications.live_caption_on2"), "success");
          this.controlsContainer.title = this._("notifications.live_caption_off");
        }
      };
      if (anchorButton) controlsTarget.insertBefore(toggleButton, anchorButton.nextSibling);
      else controlsTarget.prepend(toggleButton);
      console.log("[KING_DEBUG] Video translation button successfully inserted before the anchor button.");
      this.controlsContainer = toggleButton;
    }
    findVideoContainer() {
      const selectors = this.platformInfo.config.videoContainer;
      for (const selector of selectors) {
        const container = this.currentVideo.closest(selector);
        if (container) {
          console.log(`[KING_DEBUG] Found video container with selector: ${selector}`);
          return container;
        }
      }
      console.warn("[KING_DEBUG] Could not find specific video container, falling back to video's parent element.");
      return this.currentVideo.parentElement;
    }
    createSubtitleContainer() {
      if (this.subtitleContainer) return;
      this.subtitleContainer = document.createElement('div');
      this.subtitleContainer.className = 'live-caption-container translated-caption';
      const videoContainer = this.findVideoContainer() || this.currentVideo;
      console.log('videoContainer', videoContainer);
      if (videoContainer) {
        console.log(this._("notifications.found_video"), videoContainer);
        if (getComputedStyle(videoContainer).position === 'static') {
          videoContainer.style.position = 'relative';
        }
        const settings = this.settings.videoStreamingOptions;
        Object.assign(this.subtitleContainer.style, {
          zIndex: "2147483647",
          display: "block",
          visibility: "visible",
          opacity: "1",
          position: "absolute",
          left: "50%",
          bottom: "2%",
          transform: "translateX(-50%)",
          zIndex: "2147483647",
          fontSize: settings.fontSize,
          color: settings.textColor,
          backgroundColor: settings.backgroundColor,
          padding: "5px 10px",
          borderRadius: "4px",
          fontFamily: "'GoMono Nerd Font', 'Noto Sans', Arial",
          textAlign: "center",
          maxWidth: "90%",
          width: "auto",
          pointerEvents: "none",
          textShadow: "0px 1px 2px rgba(0, 0, 0, 0.8)",
          whiteSpace: "pre-wrap",
          lineHeight: '1.2'
        });
        videoContainer.appendChild(this.subtitleContainer);
        const originalCaption = document.querySelector('.caption-window-transform');
        if (originalCaption) {
          originalCaption.style.position = "absolute";
          originalCaption.style.opacity = "0";
          originalCaption.style.visibility = "hidden";
          originalCaption.style.pointerEvents = "none";
          originalCaption.style.width = "1px";
          originalCaption.style.height = "1px";
          originalCaption.style.overflow = "hidden";
          originalCaption.style.clip = "rect(0 0 0 0)";
          originalCaption.style.margin = "-1px";
          originalCaption.style.padding = "0";
          originalCaption.style.border = "0";
        }
      } else {
        console.error(this._("notifications.video_container_not_found"));
      }
    }
    updateSubtitles(captionData) {
      if (!this.subtitleContainer) this.createSubtitleContainer();
      if (!this.subtitleContainer) return;
      const mode = this.settings.displayOptions.translationMode;
      const { original, translation } = captionData;
      if (this.subtitleContainer) {
        this.subtitleContainer.innerText = '';
        const width = this.currentVideo.offsetWidth;
        let tranWidth, origSize, transSize;
        if (width <= 480) {
          tranWidth = '98%';
          origSize = '0.65em';
          transSize = '0.7em';
        } else if (width <= 962) {
          tranWidth = '95%';
          origSize = '0.75em';
          transSize = '0.8em';
        } else if (width <= 1366) {
          tranWidth = '90%';
          origSize = '0.85em';
          transSize = '0.9em';
        } else {
          tranWidth = '90%';
          origSize = '0.95em';
          transSize = '1em';
        }
        this.subtitleContainer.style.maxWidth = tranWidth;
        const createTextElement = (text, className, styles = {}) => {
          const element = document.createElement('span');
          element.className = className;
          element.innerText = text;
          Object.assign(element.style, styles, { display: 'block' });
          return element;
        }
        if (mode === 'parallel' || (mode === 'language_learning' && this.settings.displayOptions.languageLearning?.showSource)) {
          this.subtitleContainer.appendChild(
            createTextElement(original, 'original-text', { fontSize: origSize, color: '#eeeeee', opacity: '0.9', marginBottom: '6px' })
          );
        }
        this.subtitleContainer.appendChild(createTextElement(translation, 'translated-text', { fontSize: transSize, marginBottom: '2px' }));
      }
    }
  }
  class PageTranslator {
    constructor(translator) {
      this.translator = translator;
      this.settings = this.translator.userSettings.settings;
      this._ = this.translator.userSettings._;
      this.MIN_TEXT_LENGTH = 100;
      this.originalTexts = new Map();
      this.isTranslated = false;
      this.languageCode = this.detectLanguage().languageCode;
      this.pageCache = new Map();
      this.pdfLoaded = true;
    }
    getExcludeSelectors() {
      const settings = this.settings.pageTranslation;
      if (!settings.useCustomSelectors) {
        return settings.defaultSelectors;
      }
      return settings.combineWithDefault
        ? [
          ...new Set([
            ...settings.defaultSelectors,
            ...settings.customSelectors
          ])
        ]
        : settings.customSelectors;
    }
    async makeTranslationRequest(text) {
      const settings = this.settings;
      const apiKeys = settings.apiKey[settings.apiProvider];
      const key = apiKeys[Math.floor(Math.random() * apiKeys.length)];;
      const prompt =
        "Detect language of this text and return only ISO code (e.g. 'en', 'vi'): \n" +
        text;
      return await this.translator.api.makeApiRequest(key, prompt, 'page');
    }
    async detectLanguageBackup(text) {
      try {
        const response = await this.makeTranslationRequest(text);
        return response.trim().toLowerCase();
      } catch (error) {
        console.error("Backup language detection failed:", error);
        return 'auto';
      }
    }
    async detectLanguage() {
      try {
        let text = "";
        if (document.body.innerText) {
          text = document.body.innerText;
        }
        if (!text) {
          const paragraphs = document.querySelectorAll("p");
          paragraphs.forEach((p) => {
            text += p.textContent + " ";
          });
        }
        if (!text) {
          const headings = document.querySelectorAll("h1, h2, h3");
          headings.forEach((h) => {
            text += h.textContent + " ";
          });
        }
        if (!text) {
          text = document.title;
        }
        text = text.slice(0, 1000).trim();
        if (!text.trim()) {
          throw new Error(this._("notifications.no_content_for_lang_detect"));
        }
        const data = await new Promise((resolve, reject) => {
          GM_xmlhttpRequest({
            method: "GET",
            url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(text)}`,
            headers: {
              "Accept": "application/json"
            },
            onload: function(response) {
              try {
                const data = JSON.parse(response.responseText);
                resolve(data);
              } catch (error) {
                reject(new Error("Failed to parse response: " + error.message));
              }
            },
            onerror: function(error) {
              reject(new Error("Request failed: " + error.error));
            }
          });
        });
        const detectedCode = data[2] || data[8][0] || data[8][3];
        const confidence = data[6] || data[8][2] || 0;
        if (!detectedCode || confidence < 0.5) {
          return await this.detectLanguageBackup(text);
        }
        this.languageCode = detectedCode;
        console.log(`${this._("notifications.lang_detect")}: ${this.languageCode} (${this._("notifications.reliability")}: ${Math.round(confidence * 100)}%)`);
        const targetLanguage = this.settings.displayOptions.targetLanguage;
        if (this.languageCode === targetLanguage) {
          return {
            isTargetLanguage: true,
            languageCode: this.languageCode,
            confidence: confidence,
            message: `${this._("notifications.page_already_target_lang")}: ${targetLanguage} (${this._("notifications.reliability")}: ${Math.round(confidence * 100)}%)`
          };
        }
        return {
          isTargetLanguage: false,
          languageCode: this.languageCode,
          confidence: confidence,
          message: `${this._("notifications.lang_detect")}: ${this.languageCode} (${this._("notifications.reliability")}: ${Math.round(confidence * 100)}%)`
        };
      } catch (error) {
        console.error("Language detection error:", error);
        return await this.detectLanguageBackup(text);
      }
    }
    async checkAndTranslate() {
      try {
        const settings = this.settings;
        if (!settings.pageTranslation.autoTranslate) {
          return {
            success: false,
            message: this._("notifications.auto_translate_disabled")
          };
        }
        const languageCheck = await this.detectLanguage();
        if (languageCheck.isVietnamese) {
          return {
            success: false,
            message: languageCheck.message
          };
        }
        const result = await this.translatePage();
        if (result.success) {
          const toolsContainer = this.$(
            ".translator-tools-container"
          );
          if (toolsContainer) {
            const menuItem = toolsContainer.querySelector(
              '[data-type="pageTranslate"]'
            );
            if (menuItem) {
              const itemText = menuItem.querySelector(".item-text");
              if (itemText) {
                itemText.textContent = this.isTranslated
                  ? this._("notifications.original_label") : this._("notifications.page_translate_menu_label");
              }
            }
          }
          const floatingButton = this.$(
            ".page-translate-button"
          );
          if (floatingButton) {
            floatingButton.innerHTML = this.isTranslated
              ? `📄 ${this._("notifications.original_label")}` : `📄 ${this._("notifications.page_translate_menu_label")}`;
          }
          this.translator.ui.showNotification(result.message, "success");
        } else {
          this.translator.ui.showNotification(result.message, "warning");
        }
        return result;
      } catch (error) {
        console.error("Translation check error:", error);
        return {
          success: false,
          message: error.message
        };
      }
    }
    async translatePage() {
      try {
        if (!this.domObserver) {
          this.setupDOMObserver();
        }
        if (this.isTranslated) {
          await Promise.all(
            Array.from(this.originalTexts.entries()).map(async ([node, originalText]) => {
              if (node && (node.parentNode || document.contains(node))) {
                node.textContent = originalText;
              }
            })
          );
          this.originalTexts.clear();
          this.isTranslated = false;
          return {
            success: true,
            message: this._("notifications.page_reverted_to_original")
          };
        }
        const textNodes = this.collectTextNodes();
        if (textNodes.length === 0) {
          return {
            success: false,
            message: this._("notifications.no_content_to_translate")
          };
        }
        const chunks = this.createChunks(textNodes, 2000);
        const translationResults = await Promise.all(
          chunks.map(chunk => this.translateChunkWithRetries(chunk))
        );
        const failedNodesCount = translationResults
          .filter(result => !result.success)
          .reduce((count, result) => count + result.nodes.length, 0);
        this.isTranslated = true;
        if (failedNodesCount > 0) {
          return {
            success: true,
            message: this._("notifications.page_translated_partial").replace('{failed_count}', failedCount)
          };
        }
        return {
          success: true,
          message: this._("notifications.page_translated_success")
        };
      } catch (error) {
        console.error("Page translation error:", error);
        this.isTranslated = false;
        this.originalTexts.clear();
        return {
          success: false,
          message: error.message
        };
      }
    }
    async updateNode(node, translation) {
      if (!node || !node.parentNode || !document.contains(node)) {
        return false;
      }
      try {
        node.textContent = translation;
        return true;
      } catch (error) {
        console.error("Node update failed:", error);
        return false;
      }
    }
    createChunks(nodes, maxChunkSize = 2000) {
      const chunks = [];
      let currentChunk = [];
      let currentLength = 0;
      const isSentenceEnd = text => /[.!?。！？]$/.test(text.trim());
      const isPunctuationBreak = text => /[,;，；、]$/.test(text.trim());
      const isParagraphBreak = node => {
        const parentTag = node.parentElement?.tagName?.toLowerCase();
        return ['p', 'div', 'h1', 'h2', 'h3', 'li'].includes(parentTag);
      };
      for (const node of nodes) {
        const text = node.textContent.trim();
        if ((currentLength + text.length > maxChunkSize) && currentChunk.length > 0) {
          let splitIndex = currentChunk.length - 1;
          while (splitIndex > 0) {
            if (isParagraphBreak(currentChunk[splitIndex])) break;
            splitIndex--;
          }
          if (splitIndex === 0) {
            splitIndex = currentChunk.length - 1;
            while (splitIndex > 0) {
              if (isSentenceEnd(currentChunk[splitIndex].textContent)) break;
              splitIndex--;
            }
          }
          if (splitIndex === 0) {
            splitIndex = currentChunk.length - 1;
            while (splitIndex > 0) {
              if (isPunctuationBreak(currentChunk[splitIndex].textContent)) break;
              splitIndex--;
            }
          }
          const newChunk = currentChunk.splice(++splitIndex);
          chunks.push(currentChunk);
          currentChunk = newChunk;
          currentLength = currentChunk.reduce((len, n) => len + n.textContent.trim().length, 0);
        }
        currentChunk.push(node);
        currentLength += text.length;
        const isLastNode = nodes.indexOf(node) === nodes.length - 1;
        const isEndOfParagraph = isParagraphBreak(node);
        if ((isLastNode || isEndOfParagraph) && currentChunk.length > 0) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentLength = 0;
        }
      }
      if (currentChunk.length > 0) {
        chunks.push(currentChunk);
      }
      const finalChunks = [];
      let previousChunk = null;
      for (const chunk of chunks) {
        const chunkLength = chunk.reduce((len, node) => len + node.textContent.trim().length, 0);
        if (chunkLength < maxChunkSize * 0.3 && previousChunk) {
          const combinedLength = previousChunk.reduce((len, node) => len + node.textContent.trim().length, 0) + chunkLength;
          if (combinedLength <= maxChunkSize) {
            previousChunk.push(...chunk);
            continue;
          }
        }
        finalChunks.push(chunk);
        previousChunk = chunk;
      }
      return finalChunks;
    }
    async translateChunkWithRetries(chunk, maxRetries = 3, initialDelay = 1000) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const textsToTranslate = chunk
            .map(node => node.textContent.trim())
            .filter(text => text.length > 0)
            .join(' <-> ');
          if (!textsToTranslate) return { success: true, nodes: chunk };
          const prompt = this.translator.createPrompt(textsToTranslate, "page");
          const translatedText = await this.translator.api.request(prompt, 'page');
          if (!translatedText) {
            throw new Error("API returned empty response for chunk.");
          }
          const translations = translatedText.split('<->');
          await Promise.all(
            chunk.map(async (node, index) => {
              if (index >= translations.length) return;
              const text = node.textContent.trim();
              if (text.length > 0 && node.parentNode && document.contains(node)) {
                if (!this.originalTexts.has(node)) {
                  this.originalTexts.set(node, node.textContent);
                }
                const translated = translations[index];
                const mode = this.settings.displayOptions.translationMode;
                let output = this.formatTranslation(
                  text,
                  translated.trim(),
                  mode,
                  this.settings.displayOptions
                );
                await this.updateNode(node, output);
              }
            })
          );
          return { success: true, nodes: chunk };
        } catch (error) {
          console.warn(`Attempt ${attempt}/${maxRetries} for chunk failed:`, error.message);
          if (attempt === maxRetries) {
            console.error(`Chunk failed translation after ${maxRetries} attempts.`);
            return { success: false, nodes: chunk, error };
          }
          const delay = initialDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    async translateHTML(htmlContent) {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");
        const scripts = doc.getElementsByTagName("script");
        const styles = doc.getElementsByTagName("style");
        [...scripts, ...styles].forEach(element => element.remove());
        const translatableNodes = this.getTranslatableHTMLNodes(doc.body);
        const chunks = this.createChunks(translatableNodes, 2000);
        this.translator.ui.showTranslatingStatus();
        await Promise.all(
          chunks.map(async (chunk, index) => {
            try {
              const textsToTranslate = await Promise.all(
                chunk.map(node => node.textContent.trim())
              );
              const validTexts = textsToTranslate.filter(text => text.length > 0);
              if (validTexts.length === 0) return;
              const textToTranslate = validTexts.join(" <> ");
              const prompt = this.translator.createPrompt(textToTranslate, "page");
              const translatedText = await this.translator.api.request(prompt, 'page');
              if (!translatedText) return;
              const translations = translatedText.split(" <> ");
              await Promise.all(
                chunk.map(async (node, index) => {
                  if (index >= translations.length) return;
                  const text = node.textContent.trim();
                  if (text.length > 0 && node.parentNode) {
                    try {
                      if (node.isAttribute) {
                        node.ownerElement.setAttribute(
                          node.attributeName,
                          translations[index].trim()
                        );
                      } else {
                        node.textContent = translations[index].trim();
                      }
                    } catch (error) {
                      console.error("DOM update error:", error);
                    }
                  }
                })
              );
              this.translator.ui.updateProcessingStatus(
                this._("notifications.translating_part") + `${index + 1}/${chunks.length}`,
                Math.round(((index + 1) / chunks.length) * 100)
              );
            } catch (error) {
              console.error("Chunk translation error:", error);
            }
          })
        );
        return doc.documentElement.outerHTML;
      } catch (error) {
        console.error("HTML translation error:", error);
        throw error;
      } finally {
        this.translator.ui.removeTranslatingStatus();
      }
    }
    getTranslatableHTMLNodes(element) {
      const translatableNodes = [];
      const excludeSelectors = this.getExcludeSelectors();
      const walker = document.createTreeWalker(
        element,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (excludeSelectors.some((selector) => parent.matches?.(selector))) {
              return NodeFilter.FILTER_REJECT;
            }
            return node.textContent.trim()
              ? NodeFilter.FILTER_ACCEPT
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      let node;
      while ((node = walker.nextNode())) {
        translatableNodes.push(node);
      }
      const elements = element.getElementsByTagName("*");
      const translatableAttributes = ["title", "alt", "placeholder"];
      for (const el of elements) {
        for (const attr of translatableAttributes) {
          if (el.hasAttribute(attr)) {
            const value = el.getAttribute(attr);
            if (value && value.trim()) {
              const node = document.createTextNode(value);
              node.isAttribute = true;
              node.attributeName = attr;
              node.ownerElement = el;
              translatableNodes.push(node);
            }
          }
        }
      }
      return translatableNodes;
    }
    async loadPDFJS() {
      if (!this.pdfLoaded) {
        pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
        this.pdfLoaded = true;
      }
    }
    async translatePDF(file) {
      try {
        await this.loadPDFJS();
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let translatedContent = [];
        const totalPages = pdf.numPages;
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const { translationMode: mode } = this.settings.displayOptions;
        const showSource = mode === "language_learning" &&
          this.settings.displayOptions.languageLearning.showSource;
        for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const viewport = page.getViewport({ scale: 2.0 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
          const imageBlob = await new Promise((resolve) =>
            canvas.toBlob(resolve, "image/png")
          );
          const imageFile = new File([imageBlob], "page.png", {
            type: "image/png"
          });
          try {
            const ocrResult = await this.translator.ocr.processImage(imageFile);
            if (!ocrResult) {
              throw new Error(`Failed to process page ${pageNum}`);
            }
            let processedTranslations;
            const settings = this.settings;
            if (settings.displayOptions.translationMode === "translation_only") {
              processedTranslations = [this.formatTranslationPDF(ocrResult, mode, showSource)];
            } else {
              processedTranslations = ocrResult.toString().split('\n').map(trans =>
                this.formatTranslationPDF(trans, mode, showSource)
              );
            }
            translatedContent.push({
              pageNum,
              original: ocrResult,
              translations: processedTranslations,
              displayMode: mode,
              showSource
            });
          } catch (error) {
            console.error(`Error processing page ${pageNum}:`, error);
            translatedContent.push({
              pageNum,
              original: `[Error on page ${pageNum}: ${error.message}]`,
              translations: [{
                original: "",
                translation: `[Translation Error: ${error.message}]`
              }],
              displayMode: mode,
              showSource
            });
          }
          this.translator.ui.updateProgress(this._("notifications.processing_pdf"), Math.round((pageNum / totalPages) * 100));
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        canvas.remove();
        return this.generateEnhancedTranslatedPDF(translatedContent);
      } catch (error) {
        console.error("PDF translation error:", error);
        throw error;
      }
    }
    formatTranslationPDF(text, mode, showSource) {
      if (!text) return '';
      switch (mode) {
        case "translation_only":
          return text.split("<|>")[0]?.trim() || text;
        case "parallel":
          return `${this._("notifications.original")}: ${text.split("<|>")[0]?.trim() || ''}  ${this._("notifications.translation")}: ${text.split("<|>")[2]?.trim() || text}`;
        case "language_learning":
          let parts = [];
          if (showSource) {
            parts.push(`${this._("notifications.original")}: ${text.split("<|>")[0]?.trim() || ''}`);
          }
          const pinyin = text.split("<|>")[1]?.trim();
          if (pinyin) {
            parts.push(`${this._("notifications.ipa")}: ${pinyin}`);
          }
          const translation = text.split("<|>")[2]?.trim() || text;
          parts.push(`${this._("notifications.translation")}: ${translation}`);
          return parts.join("  ");
        default:
          return text;
      }
    }
    generateEnhancedTranslatedPDF(translatedContent) {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: "GoMono Nerd Font", "Noto Sans", Arial;
      line-height: 1.6;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
    }
    .page {
      margin-bottom: 40px;
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 8px;
      page-break-after: always;
    }
    .page-number {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
      color: #666;
    }
    .content {
      margin-bottom: 20px;
    }
    .section {
      margin-bottom: 15px;
      padding: 15px;
      background-color: #fff;
      border: 1px solid #eee;
      border-radius: 8px;
      white-space: pre-wrap;
    }
    .section-title {
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
    }
    .section-content {
      white-space: pre-wrap;
      line-height: 1.5;
    }
    h3 {
      color: #333;
      margin: 10px 0;
    }
    @media print {
      .page {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  ${translatedContent.map(page => `
    <div class="page">
      <div class="page-number">${page.pageNum}</div>
      <div class="content">
        ${page.displayMode === "translation_only" ? `
          <div class="section">
            <div class="section-title">${this._("notifications.original_label")}:</div>
            <div class="section-content">${this.formatTranslationContent(page.translations.join('\n'))}</div>
          </div>
        ` : page.displayMode === "parallel" ? `
          <div class="section">
            <div class="section-content">${this.formatTranslationContent(page.translations.join('\n'))}</div>
          </div>
        ` : `
          ${page.showSource ? `
            <div class="section">
              <div class="section-title">${this._("notifications.original_label")}:</div>
              <div class="section-content">${this.formatTranslationContent(page.original)}</div>
            </div>
          ` : ''}
          ${page.translations.some(t => t.includes(`${this._("notifications.ipa")}:`)) ? `
            <div class="section">
              <div class="section-title">${this._("notifications.ipa")}:</div>
              <div class="section-content">${this.formatTranslationContent(
        page.translations
          .map(t => t.split(`${this._("notifications.ipa")}:`)[1]?.split(`${this._("notifications.translation_label")}:`)[0]?.trim())
          .filter(Boolean)
          .join('\n')
      )}</div>
            </div>
          ` : ''}
          <div class="section">
            <div class="section-title">${this._("notifications.translation_label")}:</div>
            <div class="section-content">${this.formatTranslationContent(
        page.translations
          .map(t => t.split(`${this._("notifications.translation_label")}:`)[1]?.trim())
          .filter(Boolean)
          .join('\n')
      )}</div>
          </div>
        `}
      </div>
    </div>
  `).join('')}
</body>
</html>
`;
      return new Blob([htmlContent], { type: "text/html" });
    }
    formatTranslationContent(content) {
      if (!content) return '';
      return content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;')
        .replace(/\n/g, '<br>');
    }
    collectTextNodes() {
      const excludeSelectors = this.getExcludeSelectors();
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            if (!node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!node.parentNode) {
              return NodeFilter.FILTER_REJECT;
            }
            let parent = node.parentElement;
            while (parent) {
              for (const selector of excludeSelectors) {
                try {
                  if (parent.matches && parent.matches(selector)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                } catch (e) {
                  console.warn(`Invalid selector: ${selector}`, e);
                }
              }
              if (
                parent.getAttribute("translate") === "no" ||
                parent.getAttribute("class")?.includes("notranslate") ||
                parent.getAttribute("class")?.includes("no-translate")
              ) {
                return NodeFilter.FILTER_REJECT;
              }
              parent = parent.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) {
        nodes.push(node);
      }
      return nodes;
    }
    setupDOMObserver() {
      if (this.domObserver) {
        this.domObserver.disconnect();
        this.domObserver = null;
      }
      this.domObserver = new MutationObserver((mutations) => {
        const newTextNodes = [];
        for (const mutation of mutations) {
          if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
            const nodes = this.getTextNodesFromNodeList(mutation.addedNodes);
            if (nodes.length > 0) {
              newTextNodes.push(...nodes);
            }
          }
        }
        if (newTextNodes.length > 0) {
          const chunks = this.createChunks(newTextNodes);
          Promise.all(
            chunks.map((chunk) =>
              this.translateChunkParallel(chunk).catch((error) => {
                console.error("Translation error for chunk:", error);
              })
            )
          );
        }
      });
      this.domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
    getTextNodesFromNodeList(nodeList) {
      const excludeSelectors = this.getExcludeSelectors();
      const textNodes = [];
      const shouldExclude = (node) => {
        if (!node) return true;
        let current = node;
        while (current) {
          if (
            current.getAttribute &&
            (current.getAttribute("translate") === "no" ||
              current.getAttribute("data-notranslate") ||
              current.classList?.contains("notranslate") ||
              current.classList?.contains("no-translate"))
          ) {
            return true;
          }
          for (const selector of excludeSelectors) {
            try {
              if (current.matches && current.matches(selector)) {
                return true;
              }
            } catch (e) {
              console.warn(`Invalid selector: ${selector}`, e);
            }
          }
          current = current.parentElement;
        }
        return false;
      };
      nodeList.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (node.textContent.trim() && !shouldExclude(node.parentElement)) {
            textNodes.push(node);
          }
        } else if (
          node.nodeType === Node.ELEMENT_NODE &&
          !shouldExclude(node)
        ) {
          const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, {
            acceptNode: (textNode) => {
              if (
                textNode.textContent.trim() &&
                !shouldExclude(textNode.parentElement)
              ) {
                return NodeFilter.FILTER_ACCEPT;
              }
              return NodeFilter.FILTER_REJECT;
            }
          });
          let textNode;
          while ((textNode = walker.nextNode())) {
            textNodes.push(textNode);
          }
        }
      });
      return textNodes;
    }
    async translateChunkParallel(chunk) {
      try {
        const textsToTranslate = chunk
          .map((node) => node.textContent.trim())
          .filter((text) => text.length > 0)
          .join(" <-> ");
        if (!textsToTranslate) return;
        const prompt = this.translator.createPrompt(textsToTranslate, "page");
        const translatedText = await this.translator.api.request(prompt, 'page');
        if (translatedText) {
          const translations = translatedText.split("<->");
          await Promise.all(chunk.map(async (node, index) => {
            const text = node.textContent.trim();
            if (text.length > 0 && node.parentNode && document.contains(node)) {
              try {
                this.originalTexts.set(node, node.textContent);
                if (index < translations.length) {
                  const translated = translations[index];
                  const mode = this.settings.displayOptions.translationMode;
                  let output = this.formatTranslation(text, translated.trim(), mode, this.settings.displayOptions);
                  node.textContent = output;
                }
              } catch (error) {
                console.error("DOM update error:", error);
              }
            }
          }));
        }
      } catch (error) {
        console.error("Chunk translation error:", error);
        throw error;
      }
    }
    formatTranslation(originalText, translatedText, mode, settings) {
      const showSource = settings.languageLearning.showSource;
      switch (mode) {
        case "translation_only":
          return translatedText;
        case "parallel":
          return `${this._("notifications.original")}: ${originalText}  ${this._("notifications.translation")}: ${translatedText.split("<|>")[2]?.trim() || translatedText}   `;
        case "language_learning":
          let parts = [];
          if (showSource) {
            parts.push(`${this._("notifications.original")}: ${originalText}`);
          }
          const pinyin = translatedText.split("<|>")[1]?.trim();
          if (pinyin) {
            parts.push(`${this._("notifications.ipa")}: ${pinyin}`);
          }
          const translation =
            translatedText.split("<|>")[2]?.trim() || translatedText;
          parts.push(`${this._("notifications.translation")}: ${translation}   `);
          return parts.join("  ");
        default:
          return translatedText;
      }
    }
  }
  class FileCache {
    constructor(maxSize, expirationTime) {
      this.maxSize = maxSize;
      this.expirationTime = expirationTime;
      this.cache = new Map();
      this.accessOrder = [];
    }
    async generateKey(fileData) {
      const hashBuffer = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(fileData)
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    async set(fileData, result) {
      const key = await this.generateKey(fileData);
      if (this.cache.has(key)) {
        const index = this.accessOrder.indexOf(key);
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      } else {
        if (this.cache.size >= this.maxSize) {
          const oldestKey = this.accessOrder.shift();
          this.cache.delete(oldestKey);
        }
        this.accessOrder.push(key);
      }
      const compressedData = LZString.compressToUTF16(JSON.stringify({
        result,
        timestamp: Date.now()
      }));
      this.cache.set(key, compressedData);
    }
    async get(fileData) {
      const key = await this.generateKey(fileData);
      const compressedData = this.cache.get(key);
      if (!compressedData) return null;
      const data = JSON.parse(LZString.decompressFromUTF16(compressedData));
      if (Date.now() - data.timestamp > this.expirationTime) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        this.accessOrder.splice(index, 1);
        return null;
      }
      const index = this.accessOrder.indexOf(key);
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
      return data.result;
    }
    clear() {
      this.cache.clear();
      this.accessOrder = [];
    }
  }
  class TranslationCache {
    constructor(maxSize, expirationTime) {
      this.maxSize = maxSize;
      this.expirationTime = expirationTime;
      this.cache = new Map();
      this.accessOrder = [];
    }
    generateKey(text, isAdvanced, targetLanguage) {
      return `${text}_${isAdvanced}_${targetLanguage}`;
    }
    set(text, translation, isAdvanced, targetLanguage) {
      const key = this.generateKey(text, isAdvanced, targetLanguage);
      if (this.cache.has(key)) {
        const index = this.accessOrder.indexOf(key);
        this.accessOrder.splice(index, 1);
        this.accessOrder.push(key);
      } else {
        if (this.cache.size >= this.maxSize) {
          const oldestKey = this.accessOrder.shift();
          this.cache.delete(oldestKey);
        }
        this.accessOrder.push(key);
      }
      const compressedData = LZString.compressToUTF16(JSON.stringify({
        translation,
        timestamp: Date.now()
      }));
      this.cache.set(key, compressedData);
      this.saveToIndexedDB(key, compressedData);
    }
    get(text, isAdvanced, targetLanguage) {
      const key = this.generateKey(text, isAdvanced, targetLanguage);
      const compressedData = this.cache.get(key);
      if (!compressedData) return null;
      const data = JSON.parse(LZString.decompressFromUTF16(compressedData));
      if (Date.now() - data.timestamp > this.expirationTime) {
        this.cache.delete(key);
        const index = this.accessOrder.indexOf(key);
        this.accessOrder.splice(index, 1);
        return null;
      }
      const index = this.accessOrder.indexOf(key);
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
      return data.translation;
    }
    clear() {
      this.cache.clear();
      this.accessOrder = [];
    }
    optimizeStorage() {
      if (this.cache.size > this.maxSize * 0.9) {
        const itemsToKeep = Math.floor(this.maxSize * 0.7);
        const sortedItems = [...this.accessOrder].slice(-itemsToKeep);
        const tempCache = new Map();
        sortedItems.forEach((key) => {
          if (this.cache.has(key)) {
            tempCache.set(key, this.cache.get(key));
          }
        });
        this.cache = tempCache;
        this.accessOrder = sortedItems;
      }
    }
    async initDB() {
      if (!window.indexedDB) {
        console.warn("IndexedDB not supported");
        return;
      }
      return new Promise((resolve, reject) => {
        const request = indexedDB.open("translatorCache", 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains("translations")) {
            db.createObjectStore("translations", { keyPath: "id" });
          }
        };
      });
    }
    async saveToIndexedDB(key, value) {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["translations"], "readwrite");
        const store = transaction.objectStore("translations");
        const request = store.put({ id: key, value, timestamp: Date.now() });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    async loadFromIndexedDB(key) {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(["translations"], "readonly");
        const store = transaction.objectStore("translations");
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result?.value);
        request.onerror = () => reject(request.error);
      });
    }
  }
  class FileUploader {
    constructor(settings) {
      this.settings = settings.settings;
      this._ = settings._;
    }
    async getUploadUrl(file) {
      const apiKeys = this.settings.apiKey[this.settings.apiProvider];
      const errors = [];
      let startIndex = Math.floor(Math.random() * apiKeys.length);
      for (let i = 0; i < apiKeys.length; i++) {
        const currentIndex = (startIndex + i) % apiKeys.length;
        const key = apiKeys[currentIndex];
        try {
          return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: 'POST',
              url: `${CONFIG.API.providers.gemini.uploadUrl}?key=${key}`,
              headers: {
                'X-Goog-Upload-Protocol': 'resumable',
                'X-Goog-Upload-Command': 'start',
                'X-Goog-Upload-Header-Content-Length': file.size,
                'X-Goog-Upload-Header-Content-Type': file.type,
                'Content-Type': 'application/json'
              },
              data: JSON.stringify({
                file: {
                  display_name: file.name
                }
              }),
              onload: (response) => {
                const uploadUrl = response.responseHeaders.match(/x-goog-upload-url: (.*)/i)?.[1];
                if (!uploadUrl) reject(new Error(this._("notifications.upl_url")));
                resolve({
                  url: uploadUrl,
                  key: key,
                });
              },
              onerror: (error) => reject(error)
            });
          });
        } catch (error) {
          errors.push(`Key ${key.slice(0, 8)}... : ${error.message}`);
          await new Promise(resolve => setTimeout(resolve, 100));
          continue;
        }
      }
      if (errors.length > 0) {
        throw new Error(this._("notifications.all_keys_failed") + `${errors.join('\n')}`);
      }
    }
    async uploadFile(uploadUrl, file) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'POST',
          url: uploadUrl.url,
          headers: {
            'Content-Length': file.size,
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize'
          },
          data: file,
          onload: (response) => {
            const result = JSON.parse(response.responseText);
            if (!result.file?.uri) reject(new Error(this._("notifications.upl_uri")));
            resolve({
              uri: result.file.uri,
              key: uploadUrl.key,
            });
          },
          onerror: (error) => reject(error)
        });
      });
    }
    async uploadLargeFile(file) {
      try {
        const uploadUrl = await this.getUploadUrl(file);
        return await this.uploadFile(uploadUrl, file);
      } catch (error) {
        console.error('Upload failed:', error);
        throw new Error(this._("notifications.upl_fail"));
      }
    }
  }
  class FileProcessor {
    constructor(translator) {
      this.translator = translator;
      this.uploader = new FileUploader(this.translator.userSettings);
      this.settings = this.translator.userSettings.settings;
      this._ = this.translator.userSettings._;
    }
    checkFileSizeLimit(file, fileType) {
      let type = 'document';
      if (fileType.startsWith('image/')) type = 'image';
      else if (fileType.startsWith('video/')) type = 'video';
      else if (fileType.startsWith('audio/')) type = 'audio';
      const maxSize = CONFIG.API.providers.gemini.limits.maxUploadSize[type];
      if (file.size > maxSize) {
        throw new Error(this._("notifications.file_too_large") + ` ${type}: ${maxSize / (1024 * 1024)}MB`);
      }
    }
    async fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = () => reject(new Error((this._("notifications.failed_read_file"))));
        reader.readAsDataURL(file);
      });
    }
    async fetchUrlAsFile(url, mimeType, filename = 'king1x32_file_from_url') {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url: url,
          responseType: 'arraybuffer',
          anonymous: true,
          onload: (response) => {
            if (response.status >= 200 && response.status < 300) {
              const blob = new Blob([response.response], { type: mimeType });
              resolve(new File([blob], filename, { type: mimeType, lastModified: Date.now() }));
            } else {
              reject(new Error(`${this._("notifications.request_failed")} ${response.status} ${response.statusText}`));
            }
          },
          onerror: (error) => {
            reject(new Error(`${this._("notifications.network_error")}: ${error.message || 'Unknown network error'}`));
          }
        });
      });
    }
    async processFile(fileOrUrl, prompt) {
      const apiProvider = this.settings.apiProvider;
      const apiConfig = CONFIG.API.providers[apiProvider];
      let actualFile = null;
      let filename = 'king1x32_file';
      if (typeof fileOrUrl === 'string') {
        const url = fileOrUrl;
        let mimeType = 'application/octet-stream';
        try {
          const headResponse = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: 'HEAD',
              url: url,
              onload: resp => resolve(resp),
              onerror: err => reject(err),
              anonymous: true,
              nocache: true
            });
          });
          const contentTypeHeader = headResponse.responseHeaders.match(/content-type: (.*?)(?:\r\n|$)/i);
          if (contentTypeHeader) {
            mimeType = contentTypeHeader[1].split(';')[0].trim();
          }
          const urlParts = url.split('/');
          filename = urlParts[urlParts.length - 1].split('?')[0].split('#')[0] || 'file_from_url';
        } catch (e) {
          console.warn(`Không thể lấy MIME type cho URL ${url}, đang suy luận từ phần mở rộng. Lỗi:`, e);
          const urlParts = url.split('.');
          if (urlParts.length > 1) {
            const ext = urlParts.pop().toLowerCase();
            const mimeMap = {
              'jpg': 'image/jpeg', 'jpeg': 'image/jpeg', 'png': 'image/png', 'gif': 'image/gif', 'webp': 'image/webp',
              'mp4': 'video/mp4', 'webm': 'video/webm', 'mov': 'video/quicktime',
              'mp3': 'audio/mp3', 'wav': 'audio/wav', 'ogg': 'audio/ogg', 'm4a': 'audio/mp4',
              'pdf': 'application/pdf', 'txt': 'text/plain', 'html': 'text/html', 'json': 'application/json',
              'xml': 'application/xml', 'csv': 'text/csv', 'md': 'text/markdown',
              'doc': 'application/msword', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'xls': 'application/vnd.ms-excel', 'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'ppt': 'application/vnd.ms-powerpoint', 'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            };
            mimeType = mimeMap[ext] || 'application/octet-stream';
          }
        }
        if (apiProvider === 'puter') {
          const result = await apiConfig.vision(prompt, url, false, { model: this.translator.api.getModel() });
          return apiConfig.responseParser(result);
        } else {
          this.translator.ui.showProcessingStatus(this._("notifications.processing_url"));
          try {
            actualFile = await this.fetchUrlAsFile(url, mimeType, filename);
          } catch (fetchError) {
            throw new Error(`${this._("notifications.failed_read_file")}: ${fetchError.message}`);
          } finally {
            setTimeout(() => this.translator.ui.removeProcessingStatus(), 1000);
          }
        }
      } else {
        actualFile = fileOrUrl;
        filename = fileOrUrl.name;
      }
      if (!actualFile) {
        throw new Error("Không có nội dung file để xử lý sau khi đọc.");
      }
      const fileType = actualFile.type;
      if (apiProvider === 'gemini') {
        this.checkFileSizeLimit(actualFile, fileType);
        if (actualFile.size <= apiConfig.limits.maxDirectSize) {
          const base64 = await this.fileToBase64(actualFile);
          return {
            content: [
              { text: prompt },
              { inline_data: { mime_type: fileType, data: base64 } }
            ],
          };
        } else {
          const fileUriInfo = await this.uploader.uploadLargeFile(actualFile);
          return {
            content: [
              { text: prompt },
              { file_data: { mime_type: fileType, file_uri: fileUriInfo.uri } }
            ],
            key: fileUriInfo.key
          };
        }
      } else {
        const base64 = await this.fileToBase64(actualFile);
        return {
          content: apiConfig.createBinaryParts(prompt, fileType, base64),
        };
      }
    }
  }
  const RELIABLE_FORMATS = {
    text: {
      maxSize: 10 * 1024 * 1024,
      formats: [
        { ext: 'txt', mime: 'text/plain' },
        { ext: 'srt', mime: 'application/x-subrip' },
        { ext: 'vtt', mime: 'text/vtt' }, // Phụ đề web
        { ext: 'pdf', mime: 'application/pdf' },
        { ext: 'html', mime: 'text/html' },
        { ext: 'md', mime: 'text/markdown' },
        { ext: 'json', mime: 'application/json' }
      ]
    }
  };
  class FileManager {
    constructor(translator) {
      this.translator = translator;
      this._ = translator.userSettings._;
      this.supportedFormats = RELIABLE_FORMATS;
    }
    isValidFormat(file) {
      const extension = file.name.split('.').pop().toLowerCase();
      const mimeType = file.type;
      return RELIABLE_FORMATS.text.formats.some(format =>
        format.ext === extension || format.mime === mimeType
      );
    }
    isValidSize(file) {
      return file.size <= RELIABLE_FORMATS.text.maxSize;
    }
    async processFile(file) {
      try {
        const content = await this.readFileContent(file);
        const extension = file.name.split('.').pop().toLowerCase();
        switch (extension) {
          case 'txt':
          case 'md':
            return await this.translator.translate(content);
          case 'json':
            return await this.processJSON(content);
          case 'html':
            return await this.translator.page.translateHTML(content);
          case 'pdf':
            return await this.translator.page.translatePDF(file);
          case 'srt':
          case 'vtt':
            return await this.processSubtitle(content);
          default:
            throw new Error(this._("notifications.uns_format"));
        }
      } catch (error) {
        throw new Error(this._("notifications.file_processing_error") + `: ${error.message}`);
      }
    }
    async processJSON(content) {
      try {
        const json = JSON.parse(content);
        const translated = await this.translateObject(json);
        return JSON.stringify(translated, null, 2);
      } catch (error) {
        throw new Error(this._("notifications.json_processing_error"));
      }
    }
    async processSubtitle(content) {
      try {
        const parts = content.split('\n\n');
        const translated = [];
        for (const part of parts) {
          const lines = part.split('\n');
          if (lines.length >= 3) {
            const [index, timing, ...text] = lines;
            const translatedText = await this.translator.translate(text.join(' '));
            translated.push([index, timing, translatedText].join('\n'));
          }
        }
        return translated.join('\n\n');
      } catch (error) {
        throw new Error(this._("notifications.subtitle_processing_error"));
      }
    }
    async translateObject(obj) {
      const translated = {};
      for (const key in obj) {
        if (typeof obj[key] === 'string') {
          translated[key] = await this.translator.translate(obj[key]);
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          translated[key] = await this.translateObject(obj[key]);
        } else {
          translated[key] = obj[key];
        }
      }
      return translated;
    }
    readFileContent(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error((this._("notifications.failed_read_file"))));
        reader.readAsText(file);
      });
    }
  }
  class UIManager {
    constructor(translator) {
      if (!translator) {
        throw new Error("Translator instance is required");
      }
      this.translator = translator;
      this.settings = this.translator.userSettings.settings;
      this._ = this.translator.userSettings._;
      const themeMode = this.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      const isDark = themeMode === "dark";
      let existingContainer = document.getElementById('king-translator-root');
      if (existingContainer) {
        existingContainer.remove();
      }
      this.container = document.createElement('div');
      this.container.id = 'king-translator-root';
      this.container.style.cssText = `z-index: 2147483647;`;
      let root;
      try {
        root = this.container.attachShadow({ mode: 'closed' });
      } catch (e) {
        root = this.container;
      }
      this.shadowRoot = root;
      const style = document.createElement('style');
      style.textContent = `
.translator-settings-container {
  z-index: 2147483647;
  position: fixed;
  background-color: ${theme.background};
  color: ${theme.text};
  padding: 20px;
  border-radius: 15px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  width: auto;
  min-width: 320px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  top: ${window.innerHeight / 2}px;
  left: ${window.innerWidth / 2}px;
  transform: translate(-50%, -50%);
  display: block;
  visibility: visible;
  opacity: 1;
  font-size: 14px;
  line-height: 1.4;
}
.translator-settings-container * {
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  box-sizing: border-box;
}
.translator-settings-container input[type="checkbox"],
.translator-settings-container input[type="radio"] {
  appearance: auto;
  -webkit-appearance: auto;
  -moz-appearance: auto;
  position: relative;
  width: 16px;
  height: 16px;
  margin: 3px 5px;
  padding: 0;
  accent-color: #0000aa;
  border: 1px solid ${theme.border};
  opacity: 1;
  visibility: visible;
  cursor: pointer;
}
.radio-group {
  display: flex;
  gap: 15px;
  align-items: center;
}
.radio-group label {
  align-items: center;
  justify-content: center;
  padding: 5px;
  gap: 5px;
}
.radio-group input[type="radio"] {
  margin: 0;
  position: relative;
  top: 0;
}
.translator-settings-container input[type="radio"] {
  border-radius: 50%;
}
.translator-settings-container input[type="checkbox"] {
  display: flex;
  position: relative;
  margin: 5px 50% 5px 50%;
  align-items: center;
  justify-content: center;
}
.settings-grid input[type="text"],
.settings-grid input[type="number"],
.settings-grid select {
  appearance: auto;
  -webkit-appearance: auto;
  -moz-appearance: auto;
  background-color: ${isDark ? "#202020" : "#eeeeee"};
  color: ${theme.text};
  border: 1px solid ${theme.border};
  border-radius: 8px;
  padding: 7px 10px;
  margin: 5px;
  font-size: 14px;
  line-height: normal;
  height: auto;
  width: auto;
  min-width: 100px;
  display: inline-block;
  visibility: visible;
  opacity: 1;
}
.settings-grid select {
  padding-right: 20px;
}
.settings-grid label {
  display: inline-flex;
  align-items: center;
  margin: 3px 10px;
  color: ${theme.text};
  cursor: pointer;
  user-select: none;
}
.settings-grid input:not([type="hidden"]),
.settings-grid select,
.settings-grid textarea {
  display: inline-block;
  opacity: 1;
  visibility: visible;
  position: static;
}
.settings-grid input:disabled,
.settings-grid select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.translator-settings-container input[type="checkbox"]:hover,
.translator-settings-container input[type="radio"]:hover {
  border-color: ${theme.mode === "dark" ? "#777" : "#444"};
}
.settings-grid input:focus,
.settings-grid select:focus {
  outline: 2px solid rgba(74, 144, 226, 0.5);
  outline-offset: 1px;
}
.settings-grid input::before,
.settings-grid input::after {
  content: none;
  display: none;
}
.translator-settings-container button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  line-height: 1;
}
.translator-settings-container .api-key-entry input[type="text"] {
  padding: 8px 10px;
  margin: 0px 3px 3px 15px;
  appearance: auto;
  -webkit-appearance: auto;
  -moz-appearance: auto;
  font-size: 14px;
  line-height: normal;
  width: auto;
  min-width: 100px;
  display: inline-block;
  visibility: visible;
  opacity: 1;
  border: 1px solid ${theme.border};
  border-radius: 10px;
  box-sizing: border-box;
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  text-align: left;
  vertical-align: middle;
  background-color: ${isDark ? "#202020" : "#eeeeee"};
  color: ${theme.text};
}
.translator-settings-container .api-key-entry input[type="text"]:focus {
  outline: 3px solid rgba(74, 144, 226, 0.5);
  outline-offset: 1px;
  box-shadow: none;
}
.translator-settings-container .api-key-entry {
  display: flex;
  gap: 10px;
  align-items: center;
}
.remove-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  line-height: 1;
}
.translator-settings-container::-webkit-scrollbar {
  width: 8px;
}
.translator-settings-container::-webkit-scrollbar-track {
  background-color: ${theme.mode === "dark" ? "#222" : "#eeeeee"};
  border-radius: 8px;
}
.translator-settings-container::-webkit-scrollbar-thumb {
  background-color: ${theme.mode === "dark" ? "#666" : "#888"};
  border-radius: 8px;
}
.translator-tools-container {
  position: fixed;
  bottom: 40px;
  right: 20px;
  color: ${theme.text};
  border-radius: 10px;
  z-index: 2147483647;
  display: block;
  visibility: visible;
  opacity: 1;
}
.translator-tools-container * {
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  box-sizing: border-box;
}
.translator-tools-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 11px;
  border: none;
  border-radius: 9px;
  background-color: rgba(74,144,226,0.3);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  font-size: 15px;
  line-height: 1;
  visibility: visible;
  opacity: 1;
}
.translator-tools-dropdown {
  display: none;
  position: absolute;
  bottom: 100%;
  right: 0;
  margin-bottom: 10px;
  background-color: ${theme.background};
  color: ${theme.text};
  border-radius: 15px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
  padding: 15px 12px 9px 12px;
  min-width: 225px;
  overflow-y: auto;
  z-index: 2147483647;
  visibility: visible;
  opacity: 1;
}
.translator-tools-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  margin-bottom: 5px;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 10px;
  background-color: ${theme.backgroundShadow};
  color: ${theme.text};
  border: 1px solid ${theme.border};
  visibility: visible;
  opacity: 1;
}
.item-icon, .item-text {
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  visibility: visible;
  opacity: 1;
}
.item-icon {
  font-size: 18px;
}
.item-text {
  font-size: 14px;
}
.translator-tools-item:hover {
  background-color: ${theme.button.translate.background};
  color: ${theme.button.translate.text};
}
.translator-tools-item:active {
  transform: scale(0.98);
}
.translator-tools-button:hover {
  transform: translateY(-2px);
  background-color: #357abd;
}
.translator-tools-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.translator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.3);
  z-index: 2147483647;
  cursor: crosshair;
}
.translator-guide {
  position: fixed;
  top: 20px;
  left: ${window.innerWidth / 2}px;
  transform: translateX(-50%);
  background-color: rgba(0,0,0,0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2147483647;
}
.translator-cancel {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  transition: all 0.3s ease;
}
.translator-cancel:hover {
  background-color: #ff0000;
  transform: scale(1.1);
}
/* Animation */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.translator-tools-container {
  animation: fadeIn 0.3s ease;
}
.translator-tools-dropdown {
  animation: fadeIn 0.2s ease;
}
.translator-tools-container.hidden,
.translator-notification.hidden,
.center-translate-status.hidden {
  visibility: hidden;
}
.settings-label,
.settings-section-title,
.shortcut-prefix,
.item-text,
.translator-settings-container label {
  color: ${theme.text};
  margin: 2px 10px;
}
.translator-settings-container input[type="text"],
.translator-settings-container input[type="number"],
.translator-settings-container select {
  background-color: ${isDark ? "#202020" : "#eeeeee"};
  color: ${theme.text};
}
/* Đảm bảo input không ghi đè lên label */
.translator-settings-container input {
  color: inherit;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.processing-spinner {
  width: 30px;
  height: 30px;
  color: white;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
  margin: 0 auto 10px auto;
}
.processing-message {
  margin-bottom: 10px;
  font-size: 14px;
}
.processing-progress {
  font-size: 12px;
  opacity: 0.8;
}
.translator-content p {
  margin: 5px 0;
}
.translator-content strong {
  font-weight: bold;
}
.translator-context-menu {
  position: fixed;
  color: ${theme.text};
  background-color: ${theme.background};
  border-radius: 8px;
  padding: 8px 8px 5px 8px;
  min-width: 150px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 2147483647;
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  font-size: 14px;
  opacity: 0;
  transform: scale(0.95);
  transition: all 0.1s ease-out;
  animation: menuAppear 0.15s ease-out forwards;
}
@keyframes menuAppear {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
.translator-context-menu-item {
  padding: 5px;
  margin-bottom: 3px;
  cursor: pointer;
  color: ${theme.text};
  background-color: ${theme.backgroundShadow};
  border: 1px solid ${theme.border};
  border-radius: 7px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  z-index: 2147483647;
}
.translator-context-menu-item:hover {
  background-color: ${theme.button.translate.background};
  color: ${theme.button.translate.text};
}
.translator-context-menu-item:active {
  transform: scale(0.98);
}
.input-translate-button-container {
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
}
.input-translate-button {
  font-family: inherit;
}
.translator-notification {
  position: fixed;
  top: 20px;
  left: ${window.innerWidth / 2}px;
  transform: translateX(-50%);
  z-index: 2147483647;
  animation: fadeInOut 2s ease;
}
/* Styles cho loading/processing status */
.center-translate-status {
  position: fixed;
  top: ${window.innerHeight / 2}px;
  left: ${window.innerWidth / 2}px;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 2147483647;
}
/* Styles cho translate button */
.translator-button {
  position: fixed;
  border: none;
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
  z-index: 2147483647;
  font-size: 14px;
}
/* Styles cho popup */
.draggable {
  position: fixed;
  background-color: ${theme.background};
  color: ${theme.text};
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0,0,0,0.3);
  z-index: 2147483647;
}
.tts-controls {
  visibility: hidden;
  opacity: 0;
  transition: all 0.2s ease;
}
.tts-button:hover .tts-controls,
.tts-controls:hover {
  visibility: visible;
  opacity: 1;
}
.tts-controls input[type="range"] {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
  border-radius: 2px;
  outline: none;
}
.tts-controls input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  background: ${theme.button.translate.background};
  border-radius: 50%;
  cursor: pointer;
}
/* Styles cho manga translation */
.manga-translation-container {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 2147483647;
}
/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
  10% { opacity: 1; transform: translateX(-50%) translateY(0); }
  90% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
      this.shadowRoot.appendChild(style);
      document.body.appendChild(this.container);
      this.translatingStatus = null;
      this.ignoreNextSelectionChange = false;
      this.touchCount = 0;
      this.currentTranslateButton = null;
      this.isProcessing = false;
      this.touchEndProcessed = false;
      this.currentOverlay = null;
      this.currentSelectionBox = null;
      this.currentStatusContainer = null;
      this.currentGuide = null;
      this.currentCancelBtn = null;
      this.currentStyle = null;
      this.voiceStorage = {};
      this.selectSource = null;
      this.selectVoice = null;
      this.translationButtonEnabled = true;
      this.translationTapEnabled = true;
      this.mediaElement = null;
      this.googleTranslateActive = false;
      this.googleTranslateAttempts = 0;
      if (this.settings.translatorTools?.enabled && localStorage.getItem("translatorToolsEnabled") === null) {
        localStorage.setItem("translatorToolsEnabled", "true");
      }
      this.mobileOptimizer = new MobileOptimizer(this);
      this.page = this.translator.page;
      this.ocr = new OCRManager(translator);
      this.media = new MediaManager(translator);
      this.handleSettingsShortcut = this.handleSettingsShortcut.bind(this);
      this.handleTranslationShortcuts =
        this.handleTranslationShortcuts.bind(this);
      this.handleTranslateButtonClick =
        this.handleTranslateButtonClick.bind(this);
      this.setupClickHandlers = this.setupClickHandlers.bind(this);
      this.setupSelectionHandlers = this.setupSelectionHandlers.bind(this);
      this.showTranslatingStatus = this.showTranslatingStatus.bind(this);
      this.removeTranslatingStatus = this.removeTranslatingStatus.bind(this);
      this.resetState = this.resetState.bind(this);
      this.settingsShortcutListener = this.handleSettingsShortcut;
      this.translationShortcutListener = this.handleTranslationShortcuts;
      this.handleGeminiFileOrUrlTranslation = this.handleGeminiFileOrUrlTranslation.bind(this);
      this.setupEventListeners();
      if (document.readyState === "complete") {
        if (
          this.settings.pageTranslation.autoTranslate
        ) {
          this.page.checkAndTranslate();
        }
        if (
          this.settings.pageTranslation
            .showInitialButton
        ) {
          this.setupQuickTranslateButton();
        }
      } else {
        window.addEventListener("load", () => {
          if (
            this.settings.pageTranslation.autoTranslate
          ) {
            this.page.checkAndTranslate();
          }
          if (
            this.settings.pageTranslation
              .showInitialButton
          ) {
            this.setupQuickTranslateButton();
          }
        });
      }
      setTimeout(() => {
        if (!this.$(".translator-tools-container")) {
          const isEnabled =
            localStorage.getItem("translatorToolsEnabled") === "true";
          if (this.settings.translatorTools?.enabled && isEnabled) {
            this.setupTranslatorTools();
          }
        }
      }, 5000);
      this.debouncedCreateButton = debounce((selection, x, y) => {
        this.createTranslateButton(selection, x, y);
      }, 100);
    }
    $(selector) {
      return this.shadowRoot.querySelector(selector);
    }
    $$(selector) {
      return this.shadowRoot.querySelectorAll(selector);
    }
    createCloseButton() {
      const button = document.createElement("span");
      button.textContent = "x";
      Object.assign(button.style, {
        position: "absolute",
        top: "0px" /* Đẩy lên trên một chút */,
        right: "0px" /* Đẩy sang phải một chút */,
        cursor: "pointer",
        color: "black",
        fontSize: "14px",
        fontWeight: "bold",
        padding: "4px 8px" /* Tăng kích thước */,
        lineHeight: "14px"
      });
      button.onclick = () => button.parentElement.remove();
      return button;
    }
    showTranslationBelow(translatedText, targetElement, text) {
      if (
        targetElement.nextElementSibling?.classList.contains(
          "translator-content"
        )
      ) {
        return;
      }
      const settings = this.settings.displayOptions;
      const mode = settings.translationMode;
      const showSource = settings.languageLearning.showSource;
      let formattedTranslation = "";
      if (mode === "translation_only") {
        formattedTranslation = translatedText;
      } else if (mode === "parallel") {
        formattedTranslation = `<div style="margin-bottom: 8px">${this._("original_label")}: ${text}</div>
<div>${this._("translation_label")}: ${translatedText.split("<|>")[2].trim() || translatedText}</div>`;
      } else if (mode === "language_learning") {
        let sourceHTML = "";
        if (showSource) {
          sourceHTML = `<div style="margin-bottom: 8px">[${this._("original_label")}]: ${text}</div>`;
        }
        formattedTranslation = `${sourceHTML}
<div>[${this._("pinyin_label")}]: ${translatedText.split("<|>")[1].trim() || ""}</div>
<div>[${this._("translation_label")}]: ${translatedText.split("<|>")[2].trim() || translatedText}</div>`;
      }
      const translationDiv = document.createElement("div");
      translationDiv.classList.add("translator-content");
      Object.assign(translationDiv.style, {
        ...CONFIG.STYLES.translation,
        fontSize: settings.fontSize
      });
      translationDiv.innerHTML = formattedTranslation;
      const themeMode = this.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      translationDiv.appendChild(this.createCloseButton());
      targetElement.insertAdjacentElement('afterend', translationDiv);
      translationDiv.style.cssText = `
display: block; /* Giữ cho phần dịch không bị kéo dài hết chiều ngang */
max-width: fit-content; /* Giới hạn chiều rộng */
width: auto; /* Để nó co giãn theo nội dung */
min-width: 150px;
color: ${theme.text};
background-color: ${theme.background};
padding: 10px 20px 10px 10px;
margin-top: 10px;
border-radius: 8px;
position: relative;
z-index: 2147483647;
border: 1px solid ${theme.border};
white-space: normal; /* Cho phép xuống dòng nếu quá dài */
overflow-wrap: break-word; /* Ngắt từ nếu quá dài */
`;
    }
    displayPopup(translatedText, originalText, title = "Bản dịch", pinyin = "") {
      console.log('ori:' + originalText, '\nipa:' + pinyin, '\ntrans:' + translatedText);
      this.removeTranslateButton();
      const settings = this.settings;
      const themeMode = settings.theme;
      const theme = CONFIG.THEME[themeMode];
      const isDark = themeMode === "dark";
      const displayOptions = settings.displayOptions;
      const sourceLang = displayOptions.sourceLanguage === 'auto' ? this.page.languageCode : displayOptions.sourceLanguage;
      const baseFontSize = displayOptions.fontSize || "14px";
      const minWidth = displayOptions.minPopupWidth || "300px";
      const maxWidth = displayOptions.maxPopupWidth || "90vw";
      const isParallelMode = displayOptions.translationMode === "parallel";
      const convertToPixels = (value, isFont = false) => {
        if (typeof value === 'number') return value;
        if (typeof value !== 'string') return isFont ? 14 : 300;
        const numValue = parseFloat(value);
        const unit = value.replace(numValue.toString(), '').trim().toLowerCase();
        const tempElement = document.createElement('div');
        tempElement.style.position = 'absolute';
        tempElement.style.visibility = 'hidden';
        tempElement.style.top = '-9999px';
        document.body.appendChild(tempElement);
        let pixelValue;
        try {
          switch (unit) {
            case 'px':
              pixelValue = numValue;
              break;
            case '%':
              if (isFont) {
                pixelValue = (numValue / 100) * 16;
              } else {
                pixelValue = (numValue / 100) * window.innerWidth;
              }
              break;
            case 'vw':
              pixelValue = (numValue / 100) * window.innerWidth;
              break;
            case 'vh':
              pixelValue = (numValue / 100) * window.innerHeight;
              break;
            case 'vmin':
              pixelValue = (numValue / 100) * Math.min(window.innerWidth, window.innerHeight);
              break;
            case 'vmax':
              pixelValue = (numValue / 100) * Math.max(window.innerWidth, window.innerHeight);
              break;
            case 'rem':
              tempElement.style.fontSize = '1rem';
              const rootFontSize = parseFloat(getComputedStyle(tempElement).fontSize);
              pixelValue = numValue * rootFontSize;
              break;
            case 'em':
              tempElement.style.fontSize = '1em';
              const parentFontSize = parseFloat(getComputedStyle(tempElement).fontSize);
              pixelValue = numValue * parentFontSize;
              break;
            case 'pt':
              pixelValue = numValue * 1.333;
              break;
            case 'pc':
              pixelValue = numValue * 16;
              break;
            case 'in':
              pixelValue = numValue * 96;
              break;
            case 'cm':
              pixelValue = numValue * 37.8;
              break;
            case 'mm':
              pixelValue = numValue * 3.78;
              break;
            case 'ex':
              tempElement.style.height = '1ex';
              pixelValue = numValue * parseFloat(getComputedStyle(tempElement).height);
              break;
            case 'ch':
              tempElement.style.width = '1ch';
              tempElement.textContent = '0';
              pixelValue = numValue * parseFloat(getComputedStyle(tempElement).width);
              break;
            default:
              pixelValue = numValue || (isFont ? 14 : 300);
          }
        } catch (error) {
          console.warn(`Cannot convert ${value} to pixels:`, error);
          pixelValue = isFont ? 14 : 300;
        } finally {
          document.body.removeChild(tempElement);
        }
        return Math.max(pixelValue, isFont ? 8 : 100);
      };
      const baseFontSizePx = convertToPixels(baseFontSize, true);
      const minWidthPx = convertToPixels(minWidth);
      const maxWidthPx = convertToPixels(maxWidth);
      const style = document.createElement('style');
      style.textContent = `
@keyframes popupEntrance {
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8) rotateY(-15deg);
  }
  100% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1) rotateY(0deg);
  }
}
@keyframes ripple {
  to {
    transform: scale(4);
    opacity: 0;
  }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-2px); }
}
.translator-popup {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  background: ${isDark ? 'linear-gradient(135deg, rgba(26,32,46,0.95) 0%, rgba(31,41,55,0.95) 50%, rgba(17,24,39,0.95) 100%)' : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 50%, rgba(241,245,249,0.95) 100%)'};
  border: 1px solid ${isDark ? 'rgba(99,102,241,0.4)' : 'rgba(59,130,246,0.4)'};
  box-shadow: ${isDark ? '0 25px 60px rgba(0,0,0,0.6)' : '0 25px 60px rgba(0,0,0,0.25)'}, inset 0 1px 0 ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'};
  animation: popupEntrance 0.4s cubic-bezier(0.34, 1.2, 0.64, 1);
  font-size: ${baseFontSize};
  min-width: ${isParallelMode ? `max(${minWidthPx}px, 700px)` : minWidth};
  max-width: ${isParallelMode ? `min(${maxWidthPx}px, 90vw)` : maxWidth};
}
.translator-content::-webkit-scrollbar {
  width: 6px;
}
.translator-content::-webkit-scrollbar-track {
  background: transparent;
}
.translator-content::-webkit-scrollbar-thumb {
  background: ${isDark ? 'rgba(99,102,241,0.3)' : 'rgba(59,130,246,0.3)'};
  border-radius: 3px;
  transition: all 0.3s ease;
}
.translator-content::-webkit-scrollbar-thumb:hover {
  background: ${isDark ? 'rgba(99,102,241,0.5)' : 'rgba(59,130,246,0.5)'};
}
.container-hover {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
}
.container-hover::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg,
    transparent,
    ${isDark ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.1)'},
    transparent
  );
  transition: left 0.5s ease;
}
.container-hover:hover::before {
  left: 100%;
}
.container-hover:hover {
  transform: translateY(-3px);
  box-shadow:
    ${isDark ? '0 15px 35px rgba(99,102,241,0.2)' : '0 15px 35px rgba(59,130,246,0.2)'},
    ${isDark ? '0 5px 15px rgba(0,0,0,0.3)' : '0 5px 15px rgba(0,0,0,0.1)'};
  border-color: ${isDark ? 'rgba(99,102,241,0.4)' : 'rgba(59,130,246,0.4)'};
}
.drag-handle {
  background: ${isDark ?
          'linear-gradient(135deg, rgba(99,102,241,0.8) 0%, rgba(139,92,246,0.8) 100%)' :
          'linear-gradient(135deg, rgba(59,130,246,0.9) 0%, rgba(99,102,241,0.9) 100%)'
        };
  position: relative;
  overflow: hidden;
}
.drag-handle::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 3s infinite;
}
.glass-button {
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  background: ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'};
  border: 1px solid ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.glass-button:hover {
  background: ${isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)'};
  transform: translateY(-1px);
  box-shadow: 0 8px 25px ${isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.15)'};
}
.glass-button:active {
  transform: translateY(0px);
}
.floating-icon {
  animation: float 3s ease-in-out infinite;
}
.section-divider {
  height: 1px;
  background: ${isDark ?
          'linear-gradient(90deg, transparent, rgba(99,102,241,0.5), transparent)' :
          'linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)'
        };
  margin: 16px 0;
}
/* Responsive design */
@media (max-width: 768px) {
  .translator-popup {
    min-width: min(${minWidthPx}px, 90vw) !important;
    max-width: min(${maxWidthPx}px, 95vw) !important;
    max-height: 90vh !important;
  }
}
@media (max-width: 480px) {
  .translator-popup {
    min-width: min(${minWidthPx}px, 95vw) !important;
    max-width: min(${maxWidthPx}px, 98vw) !important;
    font-size: max(${baseFontSizePx - 2}px, 12px) !important;
  }
}
/* Parallel Layout Styles */
.parallel-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  height: 100%;
  position: relative;
  max-height: calc(60vh - 40px);
  padding-bottom: 8px;
}
.parallel-section {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.parallel-section:first-child { animation: slideInLeft 0.5s ease; }
.parallel-section:last-child { animation: slideInRight 0.5s ease; }
@keyframes slideInLeft {
  0% { opacity: 0; transform: translateX(-30px); }
  100% { opacity: 1; transform: translateX(0); }
}
@keyframes slideInRight {
  0% { opacity: 0; transform: translateX(30px); }
  100% { opacity: 1; transform: translateX(0); }
}
.vertical-divider {
  position: absolute;
  left: 50%;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: ${isDark ? 'linear-gradient(180deg, transparent, rgba(99,102,241,0.5), transparent)' : 'linear-gradient(180deg, transparent, rgba(59,130,246,0.5), transparent)'};
  transform: translateX(-50%);
  z-index: 1;
}
.parallel-content {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 8px;
  padding-bottom: 16px;
  min-height: 0;
  max-height: calc(50vh - 60px);
}
.translator-content {
  padding-bottom: 20px !important;
  margin-bottom: 4px;
}
.vertical-layout {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
`;
      this.shadowRoot.appendChild(style);
      const popup = document.createElement("div");
      popup.className = "draggable translator-popup";
      Object.assign(popup.style, {
        position: "fixed",
        borderRadius: "20px",
        minWidth: isParallelMode ? `max(${minWidth}, 700px)` : minWidth,
        maxWidth: isParallelMode ? `min(${maxWidth}, 90vw)` : maxWidth,
        fontSize: baseFontSize,
        padding: "0",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 2147483647,
        userSelect: "text"
      });
      const adjustPopupSize = () => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const currentMinWidthPx = convertToPixels(minWidth);
        const currentMaxWidthPx = convertToPixels(maxWidth);
        const currentFontSizePx = convertToPixels(baseFontSize, true);
        if (isParallelMode) {
          const parallelMinWidth = Math.max(currentMinWidthPx, 700);
          const parallelMaxWidth = Math.min(currentMaxWidthPx, viewportWidth * 0.9);
          popup.style.minWidth = Math.min(parallelMinWidth, viewportWidth * 0.9) + "px";
          popup.style.maxWidth = parallelMaxWidth + "px";
          if (viewportWidth <= 1024) {
            popup.style.maxHeight = Math.min(viewportHeight * 0.8, 700) + "px";
          } else {
            popup.style.maxHeight = Math.min(viewportHeight * 0.75, 650) + "px";
          }
        } else {
          if (viewportWidth <= 768) {
            popup.style.minWidth = Math.min(currentMinWidthPx, viewportWidth * 0.9) + "px";
            popup.style.maxWidth = Math.min(currentMaxWidthPx, viewportWidth * 0.95) + "px";
            if (viewportWidth <= 480) {
              popup.style.fontSize = Math.max(currentFontSizePx - 2, 12) + "px";
            }
          } else {
            popup.style.minWidth = minWidth;
            popup.style.maxWidth = maxWidth;
            popup.style.fontSize = baseFontSize;
          }
          popup.style.maxHeight = Math.min(viewportHeight * 0.9, 800) + "px";
        }
      };
      adjustPopupSize();
      const resizeHandler = () => adjustPopupSize();
      window.addEventListener('resize', resizeHandler);
      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      Object.assign(dragHandle.style, {
        color: "#ffffff",
        padding: "20px 24px",
        borderTopLeftRadius: "19px",
        borderTopRightRadius: "19px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "move",
        userSelect: "none",
        minHeight: "60px"
      });
      const titleSpan = document.createElement("span");
      titleSpan.innerHTML = `
<svg width="18" height="18" style="margin-right: 8px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/>
</svg>
<span style="font-size: calc(${baseFontSize} + 2px); font-weight: 600; letter-spacing: 0.5px;">${title}</span>
`;
      Object.assign(titleSpan.style, {
        display: "flex",
        alignItems: "center"
      });
      const layoutToggle = document.createElement("button");
      if (isParallelMode) {
        layoutToggle.className = "glass-button";
        layoutToggle.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="7" height="18"/>
  <rect x="14" y="3" width="7" height="18"/>
</svg>
`;
        Object.assign(layoutToggle.style, {
          border: "none",
          color: "#fff",
          cursor: "pointer",
          borderRadius: "8px",
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginRight: "10px"
        });
        layoutToggle.title = this._("notifications.switch_layout");
        this.addRippleEffect(layoutToggle);
      }
      const closeButton = document.createElement("button");
      closeButton.className = "glass-button";
      closeButton.innerHTML = `
<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
`;
      Object.assign(closeButton.style, {
        border: "none",
        color: "#fff",
        cursor: "pointer",
        borderRadius: "12px",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      });
      closeButton.title = this._("notifications.close_popup");
      this.addRippleEffect(closeButton);
      const headerControls = document.createElement("div");
      headerControls.style.display = "flex";
      headerControls.style.alignItems = "center";
      if (isParallelMode) headerControls.appendChild(layoutToggle);
      headerControls.appendChild(closeButton);
      dragHandle.appendChild(titleSpan);
      dragHandle.appendChild(headerControls);
      const contentContainer = document.createElement("div");
      contentContainer.className = "translator-content";
      Object.assign(contentContainer.style, {
        padding: isParallelMode ? "16px" : "24px",
        maxHeight: isParallelMode ? "calc(75vh - 120px)" : "calc(90vh - 120px)",
        overflowX: "hidden",
        overflowY: "auto",
        fontSize: baseFontSize,
        position: "relative",
        paddingBottom: isParallelMode ? "20px" : "24px"
      });
      const textContainer = document.createElement("div");
      Object.assign(textContainer.style, {
        display: "flex",
        flexDirection: "column",
        gap: "20px"
      });
      const createContentSection = (title, content, icon, lang = null) => {
        const container = document.createElement("div");
        container.className = "container-hover";
        Object.assign(container.style, {
          background: isDark ?
            'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(51,65,85,0.4) 100%)' :
            'linear-gradient(135deg, rgba(248,250,252,0.6) 0%, rgba(255,255,255,0.6) 100%)',
          borderRadius: "16px",
          padding: "20px",
          border: `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(229,231,235,0.6)'}`,
          position: "relative",
          backdropFilter: "blur(10px)"
        });
        const header = document.createElement("div");
        Object.assign(header.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px"
        });
        const titleDiv = document.createElement("div");
        titleDiv.innerHTML = `${icon}<span style="margin-left: 8px; font-weight: 600; font-size: calc(${baseFontSize} + 1px);">${title}</span>`;
        Object.assign(titleDiv.style, {
          color: theme.title,
          display: "flex",
          alignItems: "center"
        });
        const buttonsContainer = document.createElement("div");
        Object.assign(buttonsContainer.style, {
          display: "flex",
          gap: "10px",
          alignItems: "center"
        });
        const ttsButton = this.createTTSButton(theme, isDark, content, lang);
        const copyButton = this.createCopyButton(theme, isDark, content, baseFontSize);
        if (ttsButton) {
          buttonsContainer.appendChild(ttsButton);
        }
        buttonsContainer.appendChild(copyButton);
        header.appendChild(titleDiv);
        header.appendChild(buttonsContainer);
        const contentDiv = document.createElement("div");
        Object.assign(contentDiv.style, {
          lineHeight: "1.7",
          color: theme.text,
          fontSize: baseFontSize,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word"
        });
        const cleanedText = title === this._("notifications.translation_label") ? content.replace(
          /(\*\*)(.*?)\1/g,
          `<span style="color: ${isDark ? '#60A5FA' : '#2563EB'}; font-weight: 600; background: ${isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.1)'}; padding: 2px 6px; border-radius: 6px;">$2</span>`
        ) : content;
        contentDiv.innerHTML = this.formatTranslation(cleanedText, theme, baseFontSize);
        container.appendChild(header);
        const divider = document.createElement("div");
        divider.className = "section-divider";
        container.appendChild(divider);
        container.appendChild(contentDiv);
        return { container };
      };
      const createParallelSection = (title, content, icon, lang = null) => {
        const container = document.createElement("div");
        container.className = `container-hover parallel-section`;
        Object.assign(container.style, {
          background: isDark ? 'linear-gradient(135deg, rgba(30,41,59,0.4) 0%, rgba(51,65,85,0.4) 100%)' : 'linear-gradient(135deg, rgba(248,250,252,0.6) 0%, rgba(255,255,255,0.6) 100%)',
          borderRadius: "12px",
          padding: "12px",
          paddingBottom: "5px",
          border: `1px solid ${isDark ? 'rgba(75,85,99,0.3)' : 'rgba(229,231,235,0.6)'}`,
          position: "relative",
          backdropFilter: "blur(10px)",
          height: "100%",
          minHeight: "0",
          marginBottom: "4px"
        });
        const header = document.createElement("div");
        Object.assign(header.style, {
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
          flexShrink: "0"
        });
        const titleDiv = document.createElement("div");
        titleDiv.innerHTML = `${icon}<span style="margin-left: 8px; font-weight: 600; font-size: calc(${baseFontSize} + 1px);">${title}</span>`;
        Object.assign(titleDiv.style, {
          color: theme.title,
          display: "flex",
          alignItems: "center"
        });
        const buttonsContainer = document.createElement("div");
        Object.assign(buttonsContainer.style, {
          display: "flex",
          gap: "8px",
          alignItems: "center"
        });
        const ttsButton = this.createTTSButton(theme, isDark, content, lang);
        const copyButton = this.createCopyButton(theme, isDark, content, baseFontSize);
        if (ttsButton) {
          buttonsContainer.appendChild(ttsButton);
        }
        buttonsContainer.appendChild(copyButton);
        header.appendChild(titleDiv);
        header.appendChild(buttonsContainer);
        const contentDiv = document.createElement("div");
        contentDiv.className = "parallel-content";
        Object.assign(contentDiv.style, {
          lineHeight: "1.6",
          color: theme.text,
          fontSize: baseFontSize,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          flex: "1",
          overflowX: "hidden",
          overflowY: "auto",
          paddingRight: "8px"
        });
        const cleanedText = title === this._("notifications.translation_label") ? content.replace(
          /(\*\*)(.*?)\1/g,
          `<span style="color: ${isDark ? '#60A5FA' : '#2563EB'}; font-weight: 600; background: ${isDark ? 'rgba(96,165,250,0.1)' : 'rgba(37,99,235,0.1)'}; padding: 2px 6px; border-radius: 6px;">$2</span>`
        ) : content;
        contentDiv.innerHTML = this.formatTranslation(cleanedText, theme, baseFontSize);
        container.appendChild(header);
        const divider = document.createElement("div");
        divider.className = "section-divider";
        container.appendChild(divider);
        container.appendChild(contentDiv);
        return container;
      };
      const buildParallelLayout = () => {
        const parallelContainer = document.createElement("div");
        parallelContainer.className = "parallel-layout";
        const divider = document.createElement("div");
        divider.className = "vertical-divider";
        parallelContainer.appendChild(divider);
        const leftSection = createParallelSection(
          this._("notifications.original_label"), originalText,
          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
          sourceLang
        );
        const rightSection = createParallelSection(
          this._("notifications.translation_label"), translatedText,
          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/></svg>`,
          displayOptions.targetLanguage
        );
        parallelContainer.appendChild(leftSection);
        parallelContainer.appendChild(rightSection);
        return parallelContainer;
      };
      const buildVerticalLayout = () => {
        const textContainer = document.createElement("div");
        Object.assign(textContainer.style, {
          display: "flex",
          flexDirection: "column",
          gap: "20px"
        });
        if (isParallelMode || displayOptions.translationMode === "language_learning" && displayOptions.languageLearning.showSource === true) {
          const { container: originalContainer } = createContentSection(
            this._("notifications.original_label"), originalText,
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>`,
            sourceLang
          );
          textContainer.appendChild(originalContainer);
        }
        if (displayOptions.translationMode === "language_learning" && pinyin) {
          const { container: pinyinContainer } = createContentSection(
            this._("notifications.ipa_label"), pinyin,
            `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
            </svg>`,
            sourceLang
          );
          textContainer.appendChild(pinyinContainer);
        }
        const { container: translationContainer } = createContentSection(
          this._("notifications.translation_label"), translatedText,
          `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
          </svg>`,
          displayOptions.targetLanguage
        );
        textContainer.appendChild(translationContainer);
        return textContainer;
      };
      if (isParallelMode) {
        let currentLayout = window.innerWidth <= 1024 ? 'vertical' : 'parallel';
        const updateToggleButton = () => {
          if (currentLayout === 'parallel') {
            layoutToggle.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="7" height="18"/>
  <rect x="14" y="3" width="7" height="18"/>
</svg>
`;
            layoutToggle.title = this._("notifications.switch_layout_ver");
          } else {
            layoutToggle.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <rect x="3" y="3" width="18" height="7"/>
  <rect x="3" y="14" width="18" height="7"/>
</svg>
`;
            layoutToggle.title = this._("notifications.switch_layout_hor");
          }
        };
        updateToggleButton();
        const cleanupContainer = () => {
          while (contentContainer.firstChild) {
            contentContainer.removeChild(contentContainer.firstChild);
          }
          Object.assign(contentContainer.style, {
            padding: currentLayout === 'parallel' ? "16px" : "24px",
            maxHeight: "calc(75vh - 120px)",
            overflowY: "auto",
            overflowX: "hidden",
            fontSize: baseFontSize,
            position: "relative",
            paddingBottom: currentLayout === 'parallel' ? "20px" : "24px"
          });
        };
        const rebuildLayout = () => {
          cleanupContainer();
          requestAnimationFrame(() => {
            if (currentLayout === 'vertical') {
              contentContainer.appendChild(buildVerticalLayout());
            } else {
              contentContainer.appendChild(buildParallelLayout());
            }
            updateToggleButton();
            adjustPopupSize();
          });
        };
        layoutToggle.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          layoutToggle.disabled = true;
          layoutToggle.style.opacity = "0.6";
          currentLayout = currentLayout === 'parallel' ? 'vertical' : 'parallel';
          rebuildLayout();
          setTimeout(() => {
            layoutToggle.disabled = false;
            layoutToggle.style.opacity = "1";
          }, 300);
        };
        // const handleResize = () => {
        //   const newViewportWidth = window.innerWidth;
        //   // Tự động chuyển về vertical trên mobile
        //   if (newViewportWidth <= 1024 && currentLayout === 'parallel') {
        //     currentLayout = 'vertical';
        //     rebuildLayout();
        //   }
        //   // Tự động chuyển về parallel trên desktop (nếu muốn)
        //   else if (newViewportWidth > 1024 && currentLayout === 'vertical') {
        //     currentLayout = 'parallel';
        //     rebuildLayout();
        //   }
        // };
        // window.addEventListener('resize', handleResize);
      }
      const buildResponsiveLayout = () => {
        const viewportWidth = window.innerWidth;
        if (isParallelMode) {
          if (viewportWidth <= 1024) {
            return buildVerticalLayout();
          } else {
            return buildParallelLayout();
          }
        } else {
          return buildVerticalLayout();
        }
      };
      contentContainer.appendChild(buildResponsiveLayout());
      popup.appendChild(dragHandle);
      popup.appendChild(contentContainer);
      this.shadowRoot.appendChild(popup);
      const cleanup = () => {
        speechSynthesis.cancel();
        this.voiceStorage = {};
        this.selectSource = null;
        this.selectVoice = null;
        window.removeEventListener('resize', resizeHandler);
        popup.style.opacity = "0";
        popup.style.transform = "translate(-50%, -50%) scale(0.8)";
        popup.style.animation = "popupEntrance 0.3s cubic-bezier(0.4, 0, 0.6, 1) reverse";
        setTimeout(() => popup.remove(), 300);
      };
      closeButton.onclick = cleanup;
      this.makeDraggable(popup, dragHandle);
      popup.addEventListener("click", (e) => e.stopPropagation());
      document.addEventListener("click", this.handleClickOutside);
      const handleEscape = (e) => {
        if (e.key === "Escape") {
          document.removeEventListener("keydown", handleEscape);
          cleanup();
        }
      };
      document.addEventListener("keydown", handleEscape);
    }
    createTTSButton(theme, isDark, text, lang) {
      if (!this.settings.ttsOptions?.enabled) return null;
      const buttonContainer = document.createElement('div');
      Object.assign(buttonContainer.style, {
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px'
      });
      const settingsButton = document.createElement('button');
      Object.assign(settingsButton.style, {
        background: "none",
        border: "none",
        padding: "8px",
        cursor: "pointer",
        color: theme.text,
        opacity: "0",
        visibility: "hidden",
        borderRadius: "50%",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "scale(0.8)",
        marginRight: "-8px"
      });
      settingsButton.innerHTML = `
<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"/>
  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
</svg>
`;
      settingsButton.title = this._("notifications.tts_settings");
      const playButton = document.createElement("button");
      let isPlaying = false;
      let currentAudio = null;
      Object.assign(playButton.style, {
        background: "none",
        border: "none",
        padding: "8px",
        cursor: "pointer",
        color: theme.text,
        opacity: "0.7",
        borderRadius: "50%",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      });
      const settingsPanel = document.createElement('div');
      Object.assign(settingsPanel.style, {
        position: 'absolute',
        top: '100%',
        right: '0',
        background: theme.background,
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        display: 'none',
        gap: '10px',
        flexDirection: 'column',
        zIndex: '2147483648',
        marginTop: '8px',
        border: `1px solid ${theme.border}`,
        minWidth: '250px',
        fontSize: '13px'
      });
      const sourceLabel = document.createElement('div');
      sourceLabel.textContent = this._("settings.tts_source");
      sourceLabel.style.color = theme.text;
      sourceLabel.style.marginBottom = '4px';
      const sourceSelect = document.createElement('select');
      Object.assign(sourceSelect.style, {
        width: '100%',
        padding: '6px',
        borderRadius: '4px',
        border: `1px solid ${theme.border}`,
        background: isDark ? '#444' : '#fff',
        color: theme.text,
        marginTop: '4px'
      });
      this.selectSource = this.settings.ttsOptions?.defaultProvider || 'google';
      if (this.selectSource === 'openai') {
        this.selectVoice = this.settings.ttsOptions?.defaultVoice?.[this.selectSource]?.voice || 'sage';
        this.selectVoice = { name: this.selectVoice }
      } else if (this.selectSource === 'google') {
        this.selectVoice = this.settings.ttsOptions?.defaultVoice?.[this.selectSource]?.[lang] || null;
      } else {
        this.selectVoice = null;
      }
      this.voiceStorage[this.selectSource] = { voice: this.selectVoice };
      const sources = [
        { value: 'google', text: 'Google Cloud TTS' },
        { value: 'google_translate', text: 'Google Translate TTS' },
        { value: 'gemini', text: 'Gemini AI TTS' },
        { value: 'openai', text: 'OpenAI TTS' },
        { value: 'local', text: this._("notifications.device_tts") },
      ];
      sources.forEach(source => {
        const option = document.createElement('option');
        option.value = source.value;
        option.text = source.text;
        option.selected = this.selectSource === source.value;
        sourceSelect.appendChild(option);
      });
      const voiceLabel = document.createElement('div');
      voiceLabel.textContent = this._("settings.voice");
      voiceLabel.style.color = theme.text;
      voiceLabel.style.marginBottom = '4px';
      voiceLabel.style.marginTop = '8px';
      const voiceSelect = document.createElement('select');
      Object.assign(voiceSelect.style, {
        width: '100%',
        padding: '6px',
        borderRadius: '4px',
        border: `1px solid ${theme.border}`,
        background: isDark ? '#444' : '#fff',
        color: theme.text,
        marginTop: '4px'
      });
      const updateVoices = async (source, getVoice = false) => {
        voiceSelect.innerHTML = '';
        switch (source) {
          case 'local':
            if (speechSynthesis.getVoices().length === 0) {
              await new Promise(resolve => {
                speechSynthesis.onvoiceschanged = resolve;
              });
            }
            const localVoices = getLocalVoices(lang);
            localVoices.forEach(voice => {
              const option = document.createElement('option');
              option.value = JSON.stringify({ name: voice.name, provider: 'local' });
              option.text = voice.display;
              if (this.voiceStorage[this.selectSource]?.voice) {
                option.selected = this.voiceStorage[this.selectSource].voice.name === voice.name;
                voiceSelect.appendChild(option);
              } else {
                voiceSelect.appendChild(option);
              }
            });
            break;
          case 'gemini':
            CONFIG.TTS.GEMINI.VOICES.forEach(voice => {
              const option = document.createElement('option');
              option.value = JSON.stringify({ name: voice, provider: 'gemini' });
              option.text = voice;
              if (this.voiceStorage[this.selectSource]?.voice) {
                option.selected = this.voiceStorage[this.selectSource].voice.name === voice;
              }
              voiceSelect.appendChild(option);
            });
            break;
          case 'openai':
            CONFIG.TTS.OPENAI.VOICES.forEach(voice => {
              const option = document.createElement('option');
              option.value = JSON.stringify({ name: voice, provider: 'openai' });
              option.text = voice;
              if (this.voiceStorage[this.selectSource]?.voice) {
                option.selected = this.voiceStorage[this.selectSource].voice.name === voice;
                voiceSelect.appendChild(option);
              } else {
                voiceSelect.appendChild(option);
              }
            });
            break;
          case 'google':
            const getAllVoices = () => {
              CONFIG.TTS.GOOGLE.VOICES?.[lang].forEach(voice => {
                const option = document.createElement('option');
                option.value = JSON.stringify({ name: voice.name, provider: 'google' });
                option.text = voice.display;
                if (this.voiceStorage[this.selectSource]?.voice) {
                  option.selected = this.voiceStorage[this.selectSource].voice.name === voice.name;
                  voiceSelect.appendChild(option);
                } else {
                  voiceSelect.appendChild(option);
                }
              });
            }
            if (this.selectVoice) {
              if (getVoice) {
                getAllVoices();
              } else {
                const option = document.createElement('option');
                option.value = JSON.stringify({ name: this.selectVoice.name, provider: 'google' });
                option.text = this.selectVoice.display;
                voiceSelect.appendChild(option);
              }
            } else {
              getAllVoices();
            }
            break;
          case 'google_translate':
            if (CONFIG.LANGUAGEDISPLAY[lang]) {
              const voice = CONFIG.LANGUAGEDISPLAY[lang];
              const option = document.createElement('option');
              option.value = JSON.stringify({ name: voice.name, provider: 'google_translate' });
              option.text = voice.display;
              voiceSelect.appendChild(option);
            }
            break;
        }
        if (!voiceSelect.options.length) {
          const option = document.createElement('option');
          option.value = '';
          option.text = this._("notifications.tts_lang_no_voice") + ` ${lang}`;
          option.disabled = true;
          voiceSelect.appendChild(option);
        }
      };
      const createControl = (label, min, max, value, step) => {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.innerHTML = `
<div style="color:${theme.text};margin-bottom:4px">${label}</div>
<div style="display:flex;align-items:center;gap:8px">
  <input type="range" min="${min}" max="${max}" value="${value}" step="${step}"
    style="flex:1;height:4px;-webkit-appearance:none;background:${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'};
      border-radius:2px;outline:none"/>
  <span style="color:${theme.text};min-width:36px;text-align:right">${value}</span>
</div>
`;
        const input = container.querySelector('input');
        const span = container.querySelector('span');
        input.oninput = () => span.textContent = input.value;
        return { container, input };
      };
      const speedControl = createControl(this._("settings.speed"), 0.1, 2, this.settings.ttsOptions.defaultSpeed, 0.1);
      const volumeControl = createControl(this._("settings.volume"), 0, 1, this.settings.ttsOptions.defaultVolume, 0.1);
      const pitchControl = createControl(this._("settings.pitch"), 0, 2, this.settings.ttsOptions.defaultPitch, 0.1);
      const playLocalTTS = async (text, voiceName) => {
        return new Promise((resolve, reject) => {
          if (!window.speechSynthesis) {
            reject(new Error(this._("notifications.browser_tts_not_supported")));
            return;
          }
          speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          const voices = speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === voiceName);
          if (voice) {
            utterance.voice = voice;
          }
          utterance.rate = parseFloat(speedControl.input.value);
          utterance.pitch = parseFloat(pitchControl.input.value);
          utterance.volume = parseFloat(volumeControl.input.value);
          utterance.onend = () => {
            isPlaying = false;
            updateButtonState();
            resolve();
          };
          utterance.onerror = (event) => {
            console.error('TTS Error:', event);
            isPlaying = false;
            updateButtonState();
            reject(new Error(this._("notifications.tts_playback_error")));
          };
          speechSynthesis.speak(utterance);
        });
      };
      const getLocalVoices = (lang) => {
        const voices = window.speechSynthesis.getVoices();
        return voices.filter(voice => {
          return voice.lang.toLowerCase().includes(lang.toLowerCase());
        }).map(voice => ({
          name: voice.name,
          display: `${voice.name} (${voice.lang})`
        }));
      };
      function createWavBlob(pcmData, sampleRate) {
        const numChannels = 1;
        const bitsPerSample = 16;
        const blockAlign = (numChannels * bitsPerSample) / 8;
        const byteRate = sampleRate * blockAlign;
        const dataSize = pcmData.byteLength;
        const chunkSize = 36 + dataSize;
        const buffer = new ArrayBuffer(44 + dataSize);
        const view = new DataView(buffer);
        view.setUint32(0, 0x52494646, false); // 'RIFF'
        view.setUint32(4, chunkSize, true);
        view.setUint32(8, 0x57415645, false); // 'WAVE'
        view.setUint32(12, 0x666d7420, false); // 'fmt '
        view.setUint32(16, 16, true); // 16 for PCM
        view.setUint16(20, 1, true); // PCM
        view.setUint16(22, numChannels, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, byteRate, true);
        view.setUint16(32, blockAlign, true);
        view.setUint16(34, bitsPerSample, true);
        view.setUint32(36, 0x64617461, false); // 'data'
        view.setUint32(40, dataSize, true);
        const pcm = new Uint8Array(pcmData);
        const wav = new Uint8Array(buffer);
        wav.set(pcm, 44);
        return new Blob([wav], { type: 'audio/wav' });
      }
      const playAudio = async (audioData) => {
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(audioData);
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          const gainNode = audioContext.createGain();
          gainNode.gain.value = parseFloat(volumeControl.input.value);
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          source.onended = () => {
            isPlaying = false;
            updateButtonState();
            audioContext.close();
          };
          source.start(0);
          return source;
        } catch (error) {
          console.error('Audio playback error:', error);
          throw error;
        }
      };
      const playGoogleTranslateTTS = async (text, lang) => {
        try {
          const chunks = text.match(/.{1,200}(?:\s|$)/g) || [];
          const audioChunks = [];
          for (const chunk of chunks) {
            await new Promise((resolve, reject) => {
              GM_xmlhttpRequest({
                method: 'GET',
                url: `https://translate.google.com/translate_tts?ie=UTF-8&tl=${lang}&client=tw-ob&q=${encodeURIComponent(chunk)}`,
                responseType: 'arraybuffer',
                headers: {
                  'Referer': 'https://translate.google.com/',
                  'User-Agent': 'Mozilla/5.0'
                },
                onload: function(response) {
                  if (response.status === 200) {
                    audioChunks.push(response.response);
                    resolve();
                  } else {
                    reject(new Error(`Google Translate TTS error: ${response.status}`));
                  }
                },
                onerror: reject
              });
            });
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
          const combinedBuffer = new ArrayBuffer(totalLength);
          const combinedView = new Uint8Array(combinedBuffer);
          let offset = 0;
          for (const chunk of audioChunks) {
            combinedView.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
          }
          return await playAudio(combinedBuffer);
        } catch (error) {
          console.error('Google Translate TTS error:', error);
          throw error;
        }
      };
      const playGoogleTTS = async (text, voiceName) => {
        try {
          const chunks = text.match(/.{1,200}(?:\s|$)/g) || [];
          const audioChunks = [];
          for (const chunk of chunks) {
            const audioContent = await new Promise((resolve, reject) => {
              GM_xmlhttpRequest({
                method: 'POST',
                url: 'https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw',
                headers: { 'Content-Type': 'application/json' },
                data: JSON.stringify({
                  audioConfig: {
                    audioEncoding: 'MP3',
                    pitch: parseFloat(pitchControl.input.value) - 1.0,
                    speakingRate: parseFloat(speedControl.input.value),
                    volumeGainDb: Math.log10(parseFloat(volumeControl.input.value)) * 20
                  },
                  input: { text: chunk },
                  voice: {
                    languageCode: lang,
                    name: voiceName
                  }
                }),
                responseType: 'json',
                onload: function(response) {
                  if (response.status === 200) {
                    resolve(response.response?.audioContent);
                  } else {
                    reject(new Error(`Google TTS API error: ${response.status}`));
                  }
                },
                onerror: reject
              });
            });
            if (audioContent) {
              const binaryString = atob(audioContent);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              audioChunks.push(bytes.buffer);
            }
          }
          if (audioChunks.length === 0) {
            throw new Error("No audio data received from Google TTS.");
          }
          const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
          const combinedBuffer = new ArrayBuffer(totalLength);
          const combinedView = new Uint8Array(combinedBuffer);
          let offset = 0;
          for (const chunk of audioChunks) {
            combinedView.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
          }
          return await playAudio(combinedBuffer);
        } catch (error) {
          console.error('Google TTS error:', error);
          throw error;
        }
      };
      const playGeminiTTS = async (text, voiceName) => {
        try {
          const API_KEYS = this.settings.apiKey.gemini;
          if (!API_KEYS || !API_KEYS[0]) {
            throw new Error(_("notifications.no_api_key_configured") + " for Gemini.");
          }
          const API_KEY = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
          const model = document.getElementById('tts-gemini-model')?.value || this.settings.ttsOptions.defaultGeminiModel;
          const requestBody = {
            contents: [{ parts: [{ "text": text }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: voiceName }
                }
              }
            },
            model: model
          };
          const response = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: "POST",
              url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
              headers: { "Content-Type": "application/json" },
              data: JSON.stringify(requestBody),
              responseType: 'json',
              onload: (res) => {
                if (res.status >= 200 && res.status < 300) {
                  resolve(res.response);
                } else {
                  reject(new Error(`Request failed with status ${res.status}: ${res.statusText || res.responseText}`));
                }
              },
              onerror: (error) => reject(error),
              ontimeout: () => reject(new Error('Request timed out.'))
            });
          });
          const part = response?.candidates?.[0]?.content?.parts?.[0];
          const audioBase64 = part?.inlineData?.data;
          if (!audioBase64) {
            const textResponse = part?.text;
            throw new Error(textResponse || "Invalid response structure from Gemini TTS.");
          }
          const binaryString = atob(audioBase64);
          const len = binaryString.length;
          const pcmData = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            pcmData[i] = binaryString.charCodeAt(i);
          }
          const mimeType = part.inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
          const sampleRateMatch = mimeType.match(/rate=(\d+)/);
          const sampleRate = sampleRateMatch ? parseInt(sampleRateMatch[1], 10) : 24000;
          const wavBlob = createWavBlob(pcmData.buffer, sampleRate);
          const audioBuffer = await wavBlob.arrayBuffer();
          return await playAudio(audioBuffer);
        } catch (error) {
          console.error('Gemini TTS error:', error);
          throw error;
        }
      };
      const playOpenAITTS = async (text, voiceName) => {
        try {
          const API_KEYS = this.settings.apiKey.openai;
          const API_KEY = API_KEYS[Math.floor(Math.random() * API_KEYS.length)];
          const model = this.settings.ttsOptions.defaultModel;
          const result = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
              method: "POST",
              url: "https://api.openai.com/v1/audio/speech",
              headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
              },
              data: JSON.stringify({
                model: model,
                input: text,
                voice: voiceName,
                speed: parseFloat(speedControl.input.value),
                response_format: 'wav'
              }),
              responseType: "arraybuffer",
              onload: (response) => {
                console.log(response);
                if (response.status === 200) {
                  resolve(response.response);
                } else {
                  reject(
                    new Error(`Request failed with status ${response.status}`),
                  );
                }
              },
              onerror: function(error) {
                reject(error);
              },
            });
          });
          return await playAudio(result);
        } catch (error) {
          console.error('OpenAI TTS error:', error);
          throw error;
        }
      };
      let hideSettingsTimeout;
      const showSettingsButton = () => {
        clearTimeout(hideSettingsTimeout);
        settingsButton.style.opacity = "1";
        settingsButton.style.visibility = "visible";
        settingsButton.style.transform = "scale(1)";
      };
      const hideSettingsButton = () => {
        if (settingsPanel.style.display === 'flex') return;
        hideSettingsTimeout = setTimeout(() => {
          settingsButton.style.opacity = "0";
          settingsButton.style.visibility = "hidden";
          settingsButton.style.transform = "scale(0.8)";
        }, 150);
      };
      buttonContainer.addEventListener('mouseenter', showSettingsButton);
      buttonContainer.addEventListener('mouseleave', hideSettingsButton);
      let touchTimeout;
      buttonContainer.addEventListener('touchstart', () => {
        touchTimeout = setTimeout(showSettingsButton, 300);
      });
      buttonContainer.addEventListener('touchend', () => {
        clearTimeout(touchTimeout);
        hideSettingsButton();
      });
      buttonContainer.addEventListener('touchcancel', () => {
        clearTimeout(touchTimeout);
        hideSettingsButton();
      });
      let isPanelVisible = false;
      const showSettingsPanel = () => {
        updateVoices(this.selectSource, true);
        settingsPanel.style.display = 'flex';
        isPanelVisible = true;
        showSettingsButton();
      };
      const hideSettingsPanel = () => {
        settingsPanel.style.display = 'none';
        isPanelVisible = false;
        if (!buttonContainer.matches(':hover')) {
          hideSettingsButton();
        }
      };
      settingsButton.addEventListener('click', (e) => {
        e.stopPropagation();
        if (isPanelVisible) {
          hideSettingsPanel();
        } else {
          showSettingsPanel();
        }
      });
      settingsButton.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isPanelVisible) {
          hideSettingsPanel();
        } else {
          showSettingsPanel();
        }
      });
      document.addEventListener('click', (e) => {
        if (isPanelVisible && !settingsPanel.contains(e.target) && !settingsButton.contains(e.target)) {
          hideSettingsPanel();
        }
      });
      const updateButtonState = () => {
        playButton.innerHTML = isPlaying ?
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>' :
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        playButton.title = isPlaying ? this._("notifications.stop_tts") : this._("notifications.play_tts");
        playButton.style.backgroundColor = isPlaying ? (isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)") : "transparent";
      };
      playButton.onclick = async () => {
        if (isPlaying) {
          if (currentAudio) {
            switch (this.selectSource) {
              case 'gemini':
              case 'openai':
              case 'google':
              case 'google_translate':
                currentAudio.stop();
                currentAudio.disconnect();
                currentAudio = null;
                break;
              case 'local':
                currentAudio.pause();
                currentAudio = null;
                break;
            }
          }
          speechSynthesis.cancel();
          isPlaying = false;
          updateButtonState();
          return;
        }
        try {
          isPlaying = true;
          updateButtonState();
          this.selectVoice = this.voiceStorage[this.selectSource]?.voice || JSON.parse(voiceSelect.value);
          switch (this.selectSource) {
            case 'local':
              currentAudio = await playLocalTTS(text, this.selectVoice.name);
              break;
            case 'gemini':
              currentAudio = await playGeminiTTS(text, this.selectVoice.name);
              break;
            case 'openai':
              currentAudio = await playOpenAITTS(text, this.selectVoice.name);
              break;
            case 'google':
              currentAudio = await playGoogleTTS(text, this.selectVoice.name);
              break;
            case 'google_translate':
              currentAudio = await playGoogleTranslateTTS(text, lang);
              break;
          }
        } catch (error) {
          console.error('TTS error:', error);
          isPlaying = false;
          updateButtonState();
        }
      };
      sourceSelect.addEventListener('change', () => {
        this.selectSource = sourceSelect.value;
        updateVoices(this.selectSource, true);
        this.selectVoice = JSON.parse(voiceSelect.value);
        this.voiceStorage[this.selectSource] = { voice: this.selectVoice };
      });
      let previousSource = sourceSelect.value;
      voiceSelect.addEventListener('change', async () => {
        this.selectVoice = JSON.parse(voiceSelect.value);
        this.voiceStorage[this.selectSource] = { voice: this.selectVoice };
        if (isPlaying) {
          try {
            if (currentAudio) {
              switch (previousSource) {
                case 'gemini':
                case 'openai':
                case 'google':
                case 'google_translate':
                  currentAudio.stop();
                  currentAudio.disconnect();
                  currentAudio = null;
                  break;
                case 'local':
                  currentAudio.pause();
                  currentAudio = null;
                  break;
              }
            }
            speechSynthesis.cancel();
            isPlaying = true;
            updateButtonState();
            previousSource = sourceSelect.value;
            switch (this.selectSource) {
              case 'local':
                currentAudio = await playLocalTTS(text, this.selectVoice.name);
                break;
              case 'gemini':
                currentAudio = await playGeminiTTS(text, this.selectVoice.name);
                break;
              case 'openai':
                currentAudio = await playOpenAITTS(text, this.selectVoice.name);
                break;
              case 'google':
                currentAudio = await playGoogleTTS(text, this.selectVoice.name);
                break;
              case 'google_translate':
                currentAudio = await playGoogleTranslateTTS(text, lang);
                break;
            }
          } catch (error) {
            console.error('TTS error:', error);
            isPlaying = false;
            updateButtonState();
          }
        }
      });
      updateVoices(this.selectSource);
      updateButtonState();
      buttonContainer.appendChild(settingsButton);
      buttonContainer.appendChild(playButton);
      buttonContainer.appendChild(settingsPanel);
      settingsPanel.appendChild(sourceLabel);
      settingsPanel.appendChild(sourceSelect);
      settingsPanel.appendChild(voiceLabel);
      settingsPanel.appendChild(voiceSelect);
      settingsPanel.appendChild(speedControl.container);
      settingsPanel.appendChild(volumeControl.container);
      settingsPanel.appendChild(pitchControl.container);
      return buttonContainer;
    };
    createCopyButton(theme, isDark, text, baseFontSize) {
      const button = document.createElement("button");
      button.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
</svg>
`;
      Object.assign(button.style, {
        display: "flex",
        alignItems: "center",
        padding: "8px 12px",
        border: "none",
        borderRadius: "8px",
        backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        color: theme.text,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        fontSize: `calc(${baseFontSize} - 1px)`
      });
      button.onmouseover = () => {
        button.style.backgroundColor = isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)";
        button.style.transform = "translateY(-1px)";
      };
      button.onmouseout = () => {
        button.style.backgroundColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
        button.style.transform = "translateY(0)";
      };
      button.onclick = async () => {
        try {
          await navigator.clipboard.writeText(text);
          button.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2">
  <path d="M20 6L9 17l-5-5"/>
</svg>
<span style="margin-left: 6px; color: #4CAF50;">Copied!</span>
`;
          button.style.backgroundColor = isDark ? "rgba(76,175,80,0.2)" : "rgba(76,175,80,0.1)";
          setTimeout(() => {
            button.innerHTML = `
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
</svg>
`;
            button.style.backgroundColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      };
      this.addRippleEffect(button);
      return button;
    };
    addRippleEffect(button) {
      button.style.position = 'relative';
      button.style.overflow = 'hidden';
      button.addEventListener('click', (e) => {
        const ripple = document.createElement('div');
        const rect = button.getBoundingClientRect();
        const size = Math.max(button.offsetWidth, button.offsetHeight);
        ripple.style.cssText = `
position: absolute;
background: rgba(255,255,255,0.3);
border-radius: 50%;
pointer-events: none;
width: ${size}px;
height: ${size}px;
top: ${e.clientY - rect.top - size / 2}px;
left: ${e.clientX - rect.left - size / 2}px;
animation: ripple 0.6s ease-out;
transform: scale(0);
`;
        button.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    }
    formatTranslation(text, theme, baseFontSize) {
      return text
        .split("<br>")
        .map((line, index) => {
          if (line.startsWith(`<b style="color: ${theme.text};">KEYWORD</b>:`)) {
            return `<div style="
margin: 12px 0 8px 0;
color: ${theme.text};
font-weight: 600;
font-size: calc(${baseFontSize} + 1px);
padding: 8px 12px;
background: ${theme.isDark ? 'rgba(99,102,241,0.1)' : 'rgba(59,130,246,0.1)'};
border-left: 3px solid ${theme.isDark ? '#6366F1' : '#3B82F6'};
border-radius: 0 8px 8px 0;
">${line}</div>`;
          }
          return `<p style="
  margin-bottom: ${index === 0 ? '8px' : '12px'};
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: justify;
  color: ${theme.text};
  line-height: 1.6;
  text-indent: ${line.length > 50 ? '1em' : '0'};
">${line}</p>`;
        })
        .join("");
    }
    makeDraggable(element, handle) {
      let pos1 = 0,
        pos2 = 0,
        pos3 = 0,
        pos4 = 0;
      handle.onmousedown = dragMouseDown;
      function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
      }
      function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = element.offsetTop - pos2 + "px";
        element.style.left = element.offsetLeft - pos1 + "px";
      }
      function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
      }
    }
    setupSelectionHandlers() {
      if (this._selectionMousedownHandler) {
        document.removeEventListener('mousedown', this._selectionMousedownHandler);
        document.removeEventListener('mousemove', this._selectionMousemoveHandler);
        document.removeEventListener('mouseup', this._selectionMouseupHandler);
        document.removeEventListener('touchend', this._selectionTouchendHandler);
      }
      if (!this.translationButtonEnabled) return;
      this._selectionMousedownHandler = (e) => {
        if (!e.target.classList.contains('translator-button')) {
          this.isSelecting = true;
          this.removeTranslateButton();
        }
      };
      this._selectionMousemoveHandler = (e) => {
        if (this.isSelecting) {
          const selection = window.getSelection();
          const selectedText = selection.toString().trim();
          if (selectedText) {
            this.removeTranslateButton();
            this.debouncedCreateButton(selection, e.clientX, e.clientY);
          }
        }
      };
      this._selectionMouseupHandler = (e) => {
        if (!e.target.classList.contains('translator-button')) {
          const selection = window.getSelection();
          const selectedText = selection.toString().trim();
          if (selectedText) {
            this.removeTranslateButton();
            this.createTranslateButton(selection, e.clientX, e.clientY);
          }
        }
        this.isSelecting = false;
      };
      this._selectionTouchendHandler = (e) => {
        if (!e.target.classList.contains('translator-button')) {
          const selection = window.getSelection();
          const selectedText = selection.toString().trim();
          if (selectedText && e.changedTouches?.[0]) {
            const touch = e.changedTouches[0];
            this.createTranslateButton(selection, touch.clientX, touch.clientY);
          }
        }
      };
      document.addEventListener('mousedown', this._selectionMousedownHandler);
      document.addEventListener('mousemove', this._selectionMousemoveHandler);
      document.addEventListener('mouseup', this._selectionMouseupHandler);
      document.addEventListener('touchend', this._selectionTouchendHandler);
    }
    createTranslateButton(selection, x, y) {
      this.removeTranslateButton();
      const button = document.createElement('button');
      button.className = 'translator-button';
      button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
  <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
</svg>`;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const buttonWidth = 60;
      const buttonHeight = 30;
      const padding = 10;
      let left = Math.min(x + padding, viewportWidth - buttonWidth - padding);
      let top = Math.min(y + 30, viewportHeight - buttonHeight - 30);
      left = Math.max(padding, left);
      top = Math.max(30, top);
      const themeMode = this.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      Object.assign(button.style, {
        ...CONFIG.STYLES.button,
        backgroundColor: theme.button.translate.background,
        color: theme.button.translate.text,
        position: 'fixed',
        left: `${left}px`,
        top: `${top}px`,
        zIndex: '2147483647',
        userSelect: 'none'
      });
      this.shadowRoot.appendChild(button);
      this.currentTranslateButton = button;
      this.setupClickHandlers(selection);
    }
    handleTranslateButtonClick = async (selection, translateType) => {
      try {
        const selectedText = selection.toString().trim();
        if (!selectedText) {
          this.showNotification(this._("notifications.no_text_selected"));
          return;
        }
        const targetElement = selection.anchorNode?.parentElement;
        if (!targetElement) {
          this.showNotification(this._("notifications.no_target_element"));
          return;
        }
        this.removeTranslateButton();
        this.showTranslatingStatus();
        if (!this.translator) {
          throw new Error(this._("notifications.translator_instance_not_found"));
        }
        switch (translateType) {
          case "quick":
            await this.translator.translate(selectedText, targetElement);
            break;
          case "popup":
            await this.translator.translate(
              selectedText,
              targetElement,
              false,
              true
            );
            break;
          case "advanced":
            await this.translator.translate(selectedText, targetElement, true);
            break;
          default:
            console.log("Unknown translation type:", translateType);
        }
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        if (this.isDouble) {
          const newSelection = window.getSelection();
          if (newSelection.toString().trim()) {
            this.resetState();
            this.setupSelectionHandlers();
          }
        } else {
          this.resetState();
          return;
        }
      }
    };
    showTranslatingStatus() {
      if (!this.shadowRoot.getElementById("translator-animation-style")) {
        const style = document.createElement("style");
        style.id = "translator-animation-style";
        style.textContent = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.center-translate-status {
  position: fixed;
  top: ${window.innerHeight / 2}px;
  left: ${window.innerWidth / 2}px;
  transform: translate(-50%, -50%);
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 15px 25px;
  border-radius: 8px;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: "GoMono Nerd Font", "Noto Sans", Arial;
  font-size: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
}
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,0.3);
  border-radius: 50%;
  border-top-color: #ddd;
  animation: spin 1s ease-in-out infinite;
}
`;
        this.shadowRoot.appendChild(style);
      }
      this.removeTranslatingStatus();
      const status = document.createElement("div");
      status.className = "center-translate-status";
      status.innerHTML = `
<div class="spinner" style="color: white"></div>
<span style="color: white">${this._("notifications.translating")}</span>
`;
      this.shadowRoot.appendChild(status);
      this.translatingStatus = status;
    }
    setupClickHandlers(selection) {
      this.pressTimer = null;
      this.isLongPress = false;
      this.isDown = false;
      this.isDouble = false;
      this.lastTime = 0;
      this.count = 0;
      this.timer = 0;
      const handleStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.ignoreNextSelectionChange = true;
        this.isDown = true;
        this.isLongPress = false;
        const currentTime = Date.now();
        if (currentTime - this.lastTime < 400) {
          this.count++;
          clearTimeout(this.pressTimer);
          clearTimeout(this.timer);
        } else {
          this.count = 1;
        }
        this.lastTime = currentTime;
        this.pressTimer = setTimeout(() => {
          if (!this.isDown) return;
          this.isLongPress = true;
          this.count = 0;
          const holdType =
            this.settings.clickOptions.hold
              .translateType;
          this.handleTranslateButtonClick(selection, holdType);
        }, 500);
      };
      const handleEnd = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!this.isDown) return;
        clearTimeout(this.pressTimer);
        if (this.isLongPress) return;
        if (this.count === 1) {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            if (this.count !== 1) return;
            const singleClickType =
              this.settings.clickOptions.singleClick
                .translateType;
            this.handleTranslateButtonClick(selection, singleClickType);
          }, 400);
        } else if (this.count >= 2) {
          this.isDouble = true;
          const doubleClickType =
            this.settings.clickOptions.doubleClick
              .translateType;
          this.handleTranslateButtonClick(selection, doubleClickType);
        }
        this.isDown = false;
      };
      this.currentTranslateButton.addEventListener("mousedown", handleStart);
      this.currentTranslateButton.addEventListener("mouseup", handleEnd);
      this.currentTranslateButton.addEventListener("mouseleave", () => {
        if (this.translateType) {
          this.resetState();
        }
      });
      this.currentTranslateButton.addEventListener("touchstart", handleStart);
      this.currentTranslateButton.addEventListener("touchend", handleEnd);
      this.currentTranslateButton.addEventListener("touchcancel", () => {
        if (this.translateType) {
          this.resetState();
        }
      });
    }
    setupDocumentTapHandler() {
      const touchOptions = this.settings.touchOptions;
      if (!touchOptions?.enabled) return;
      let touchCount = 0;
      let touchTimer = null;
      let isProcessingTouch = false;
      this._touchStartHandler = async (e) => {
        if (!touchOptions?.enabled) return;
        const target = e.target;
        if (
          target.closest(".translator-content") ||
          target.closest(".draggable") ||
          target.closest(".translator-tools-container")
        ) {
          return;
        }
        if (touchTimer) {
          clearTimeout(touchTimer);
        }
        touchCount = e.touches.length;
        touchTimer = setTimeout(async () => {
          switch (touchCount) {
            case 2:
              const twoFingersType = touchOptions.twoFingers?.translateType;
              if (twoFingersType) {
                const selection = window.getSelection();
                const selectedText = selection?.toString().trim();
                if (selectedText) {
                  e.preventDefault();
                  await this.handleTranslateButtonClick(
                    selection,
                    twoFingersType
                  );
                }
              }
              break;
            case 3:
              const threeFingersType = touchOptions.threeFingers?.translateType;
              if (threeFingersType) {
                const selection = window.getSelection();
                const selectedText = selection?.toString().trim();
                if (selectedText) {
                  e.preventDefault();
                  await this.handleTranslateButtonClick(
                    selection,
                    threeFingersType
                  );
                }
              }
              break;
            case 4:
              e.preventDefault();
              const settingsUI =
                this.translator.userSettings.createSettingsUI();
              this.shadowRoot.appendChild(settingsUI);
              break;
            case 5:
              e.preventDefault();
              if (isProcessingTouch) return;
              isProcessingTouch = true;
              this.toggleTranslatorTools();
              setTimeout(() => {
                isProcessingTouch = false;
              }, 350);
              break;
          }
          touchCount = 0;
          touchTimer = null;
        }, touchOptions.sensitivity || 100);
      };
      this._touchEndHandler = () => {
        if (touchTimer) {
          clearTimeout(touchTimer);
          touchTimer = null;
        }
        touchCount = 0;
      };
      document.addEventListener("touchstart", this._touchStartHandler, { passive: false });
      document.addEventListener("touchend", this._touchEndHandler);
      document.addEventListener("touchcancel", this._touchEndHandler);
    }
    toggleTranslatorTools() {
      if (this.isTogglingTools) return;
      this.isTogglingTools = true;
      try {
        const currentState =
          localStorage.getItem("translatorToolsEnabled") === "true";
        const newState = !currentState;
        localStorage.setItem("translatorToolsEnabled", newState.toString());
        const settings = this.settings;
        settings.showTranslatorTools.enabled = newState;
        this.translator.userSettings.saveSettings();
        this.removeToolsContainer();
        this.resetState();
        const overlays = this.$$(".translator-overlay");
        overlays.forEach((overlay) => overlay.remove());
        if (this.settings.translatorTools?.enabled && newState) {
          this.setupTranslatorTools();
        }
        this.showNotification(
          (this.settings.translatorTools?.enabled && newState) ? this._("notifications.translation_tool_on") : this._("notifications.translation_tool_off")
        );
      } finally {
        setTimeout(() => {
          this.isTogglingTools = false;
        }, 350);
      }
    }
    removeToolsContainer() {
      const container = this.$('.translator-tools-container');
      if (container) {
        const inputs = container.querySelectorAll('input');
        inputs.forEach(input => {
          input.removeEventListener('change', this.handleOCRInput);
          input.removeEventListener('change', this.handleMediaInput);
        });
        container.remove();
      }
    }
    async triggerGooglePageTranslate() {
      if (this.googleTranslateActive) {
        this.showNotification(this._("notifications.google_translate_already_active"), "info");
        return;
      }
      if (this.translator.page.isTranslated) {
        await this.translator.page.translatePage();
      }
      this.showNotification(this._("notifications.google_translate_enabled"), "success");
      this.googleTranslateActive = true;
      this.googleTranslateAttempts = 0;
      const targetLang = this.settings.displayOptions.targetLanguage;
      const layoutType = this.settings.pageTranslation.googleTranslateLayout;
      let gtDiv = document.getElementById('google_translate_element');
      if (!gtDiv) {
        gtDiv = document.createElement('div');
        gtDiv.id = 'google_translate_element';
        gtDiv.style.display = 'none';
        document.body.appendChild(gtDiv);
      }
      unsafeWindow.googleTranslateElementInit = () => {
        new unsafeWindow.google.translate.TranslateElement({
          pageLanguage: 'auto',
          includedLanguages: targetLang,
          layout: unsafeWindow.google.translate.TranslateElement.InlineLayout[layoutType],
          autoDisplay: false
        }, 'google_translate_element');
        const interval = setInterval(() => {
          const translateFrame = document.querySelector('.goog-te-combo');
          if (translateFrame && translateFrame.value !== targetLang) {
            translateFrame.value = targetLang;
            translateFrame.dispatchEvent(new Event('change'));
          }
          const topBar = document.querySelector('.goog-te-banner-frame');
          if (topBar) {
            topBar.style.display = 'none !important';
            topBar.style.visibility = 'hidden !important';
            topBar.style.height = '0px !important';
            topBar.style.border = 'none !important';
            topBar.style.boxShadow = 'none !important';
            topBar.style.opacity = '0 !important';
            clearInterval(interval);
            console.log("Google Translate top bar hidden.");
          } else {
            this.googleTranslateAttempts++;
            if (this.googleTranslateAttempts > 100) {
              clearInterval(interval);
              console.warn("Could not hide Google Translate top bar after multiple attempts.");
            }
          }
        }, 50);
      };
      const scriptId = 'google-translate-api-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'text/javascript';
        script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
        document.body.appendChild(script);
      }
    }
    removeGoogleTranslate() {
      if (this.googleTranslateActive) {
        this.googleTranslateActive = false;
        location.reload();
      }
    }
    async handlePageTranslation() {
      const settings = this.settings;
      if (!settings.pageTranslation?.enabled && !settings.shortcuts?.enabled) {
        this.showNotification(this._("notifications.page_translation_disabled"), "warning");
        return;
      }
      try {
        this.showTranslatingStatus();
        const result = await this.page.translatePage();
        if (result.success) {
          const toolsContainer = this.$(
            ".translator-tools-container"
          );
          if (toolsContainer) {
            const menuItem = toolsContainer.querySelector(
              '[data-type="pageTranslate"]'
            );
            if (menuItem) {
              const itemText = menuItem.querySelector(".item-text");
              if (itemText) {
                itemText.textContent = this.page.isTranslated
                  ? this._("notifications.original_label") : this._("notifications.page_translate_menu_label");
              }
            }
          }
          const floatingButton = this.$(
            ".page-translate-button"
          );
          if (floatingButton) {
            floatingButton.innerHTML = this.page.isTranslated
              ? `📄 ${this._("notifications.original_label")}` : `📄 ${this._("notifications.page_translate_menu_label")}`;
          }
          this.showNotification(result.message, "success");
        } else {
          this.showNotification(result.message, "warning");
        }
      } catch (error) {
        console.error("Page translation error:", error);
        this.showNotification(error.message, "error");
      } finally {
        this.removeTranslatingStatus();
      }
    }
    setupQuickTranslateButton() {
      const settings = this.settings;
      if (!settings.pageTranslation?.enabled && !settings.shortcuts?.enabled) {
        this.showNotification(this._("notifications.page_translation_disabled"), "warning");
        return;
      }
      const style = document.createElement("style");
      style.textContent = `
.page-translate-button {
  position: fixed;
  bottom: 20px;
  left: 20px;
  z-index: 2147483647;
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  transition: all 0.3s ease;
}
.page-translate-button:hover {
  background-color: #45a030;
  transform: translateY(-2px);
}
`;
      this.shadowRoot.appendChild(style);
      const button = document.createElement("button");
      button.className = "page-translate-button";
      button.innerHTML = this.page.isTranslated
        ? `📄 ${this._("notifications.original_label")}` : `📄 ${this._("notifications.page_translate_menu_label")}`;
      button.onclick = async () => {
        try {
          this.showTranslatingStatus();
          const result = await this.page.translatePage();
          if (result.success) {
            button.innerHTML = this.page.isTranslated
              ? `📄 ${this._("notifications.original_label")}` : `📄 ${this._("notifications.page_translate_menu_label")}`;
            const toolsContainer = this.$(
              ".translator-tools-container"
            );
            if (toolsContainer) {
              const menuItem = toolsContainer.querySelector(
                '[data-type="pageTranslate"]'
              );
              if (menuItem && menuItem.querySelector(".item-text")) {
                menuItem.querySelector(".item-text").textContent = this.page
                  .isTranslated
                  ? this._("notifications.original_label") : this._("notifications.page_translate_menu_label");
              }
            }
            this.showNotification(result.message, "success");
          } else {
            this.showNotification(result.message, "warning");
          }
        } catch (error) {
          console.error("Page translation error:", error);
          this.showNotification(error.message, "error");
        } finally {
          this.removeTranslatingStatus();
        }
      };
      this.shadowRoot.appendChild(button);
      setTimeout(() => {
        if (button && button.parentNode) {
          button.parentNode.removeChild(button);
        }
        if (style && style.parentNode) {
          style.parentNode.removeChild(style);
        }
      }, 10000);
    }
    setupTranslatorTools() {
      const isEnabled =
        localStorage.getItem("translatorToolsEnabled") === "true";
      if (!this.settings.translatorTools?.enabled || !isEnabled) return;
      if (this.$(".translator-tools-container")) return;
      // bypassCSP();
      this.createToolsContainer();
    }
    createToolsContainer() {
      const settings = this.settings;
      const container = document.createElement("div");
      container.className = "translator-tools-container";
      container.setAttribute("data-permanent", "true");
      container.setAttribute("data-translator-tool", "true");
      const closeButton = document.createElement("span");
      closeButton.innerHTML = "×";
      Object.assign(closeButton.style, {
        cursor: "pointer",
        fontSize: "16px",
        color: "#ffffff",
        backgroundColor: "rgba(85, 85, 85, 0.28)",
        padding: "0 3px",
        opacity: "0.8",
        transition: "all 0.2s ease",
        fontWeight: "bold",
        display: "flex",
        position: "absolute",
        top: "-8px",
        right: "-8px",
        alignItems: "center",
        justifyContent: "center",
        width: "20px",
        height: "20px",
        borderRadius: "50%"
      });
      closeButton.onmouseover = () => {
        Object.assign(closeButton.style, {
          opacity: "1",
          backgroundColor: "#ff4444"
        });
      };
      closeButton.onmouseout = () => {
        Object.assign(closeButton.style, {
          opacity: "0.8",
          backgroundColor: "transparent"
        });
      };
      closeButton.onclick = () => {
        this.removeToolsContainer();
      };
      this.handleOCRInput = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          this.showTranslatingStatus();
          const result = await this.ocr.processImage(file);
          this.removeTranslatingStatus();
          if (!result) {
            throw new Error(this._("notifications.un_pr_screen"));
          }
          this.formatTrans(result);
        } catch (error) {
          this.showNotification(error.message, "error");
        } finally {
          this.removeTranslatingStatus();
        }
      };
      this.handleMediaInput = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
          this.showTranslatingStatus();
          await this.media.processMediaFile(file);
          this.removeTranslatingStatus();
        } catch (error) {
          this.showNotification(error.message);
        } finally {
          this.removeTranslatingStatus();
        }
      };
      const ocrInput = document.createElement("input");
      ocrInput.type = "file";
      ocrInput.accept = "image/*";
      ocrInput.style.display = "none";
      ocrInput.id = "translator-ocr-input";
      ocrInput.addEventListener("change", this.handleOCRInput);
      const mediaInput = document.createElement("input");
      mediaInput.type = "file";
      mediaInput.accept = "audio/*, video/*";
      mediaInput.style.display = "none";
      mediaInput.id = "translator-media-input";
      mediaInput.addEventListener("change", this.handleMediaInput);
      const mainButton = document.createElement("button");
      mainButton.className = "translator-tools-button";
      mainButton.innerHTML = `<span class="tools-icon">⚙️</span>`;
      const dropdown = document.createElement("div");
      dropdown.className = "translator-tools-dropdown";
      const menuItems = [];
      if (settings.pageTranslation?.enabled) {
        menuItems.push({
          icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACPElEQVR4nN2S30uTURyHvekfiIIgUMypr24q8x2k9LqJbOuN3NTJTEUrl02tFUUIdmVkchS8qa6ypB/mkiW1qWEpQTjpD8k/wssnvkPltbLjZXTgge2c5/NcjBUV/TeneASzOEVQKLnJbMkNMrs827sX58jBqkHcxhCPq4bAwc7++xA7zreCO4hbGzYTKPMaId8AZ/aoT/DJTHJMkM/ON3Flow1bl1GNVzAO3PXRbvXzQWjqp835Jq5stOFQLyrcczAsx45zMtDDiV/vxZWNNtzWhYrFMKLd+Nq6uPM3xBFXNtpwdweqJ4YRj+Pq7aT1AF0EL3XS3JckIsT7KBVXNtpwIoJKtmIkolxMRHnlZCDK2Yk8wUebIEx+417BjRwhfOsCKhXGSJ0nlrLJOrltY73ZwH67DsL8BmPiykYbHg2h7ocxRoOUj4Zpd3K3hdObq9hbKyDklxkruKEjhB80o8YDGA/91IwHuOpkoonSHxmOb7/n+vYSye0lysWVjTY8baFmAhhTfmLTFlknU+ewZvx497/7iYkrG234aQPqSePv/+PDjriy0YovfKiX5uHh515ccyZrcz4yBUzWZKMNp+tQCybGQi3WfA2V72ppXfTSvViLR0h7sdNehtN1dCzW0yCubLThnBu17MHIuRnJVdOS9TCZ8zD70U1EyFVjZz0M5zy8Xq3m1K6rD3+pRH2uOPyn2KjAXq9keO+7uLLRhjfL6N8qY2XLReZP5F18zbv4vn9XxopstOF//vwEcbLHwTzAksEAAAAASUVORK5CYII=" alt="${this._("notifications.page_translate_menu_label")}">`,
          text: this.page.isTranslated ? this._("notifications.original_label") : this._("notifications.page_translate_menu_label"),
          "data-type": "pageTranslate",
          handler: async () => {
            try {
              dropdown.style.display = "none";
              this.showTranslatingStatus();
              const result = await this.page.translatePage();
              this.removeTranslatingStatus();
              if (result.success) {
                const menuItem = dropdown.querySelector(
                  '[data-type="pageTranslate"]'
                );
                if (menuItem) {
                  const itemText = menuItem.querySelector(".item-text");
                  if (itemText) {
                    itemText.textContent = this.page.isTranslated
                      ? this._("notifications.original_label") : this._("notifications.page_translate_menu_label");
                  }
                }
                this.showNotification(result.message, "success");
              } else {
                this.showNotification(result.message, "warning");
              }
            } catch (error) {
              console.error("Page translation error:", error);
              this.showNotification(error.message, "error");
            } finally {
              this.removeTranslatingStatus();
            }
          }
        });
      }
      if (settings.pageTranslation?.enableGoogleTranslate) {
        menuItems.push({
          icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAAD3UlEQVR4nK2Ub0wbdRjHO//E+MYYjS9MTIxv8IWJLyTq3gH9XdcS1jJtWKL9u8xJ2NJNNnZ3vVoKuD+tQClkyOTuBmVu6rIx3e5aaLuNoPTK7CSaDc0GCLrNuVg2HIzZXu8xd+CLVVo085t8X1x+z/P5fX/Pk5xKlUcJtbpMQOiggGE/CggtCBiWSWDYTUGjGYojtDup1T6br3dlYFlZcQLDLggIwXdGY+bazp1wgyDgam0tTG/bBpdMJimh0YhxhNKCWu2Pr137+KrQuFpdLSe7ZDKJf/h8sNjWpnje54NUfT3c8XqV74WWFvippgbkywWERsDjeagwFCG4Xle31NzaCjMOh/SNTpddBihOVlSk5eTfb9wop54XSktfLwR9RUBI/HUZmmpogIRGIwOnBIS2xzGsZBShohEMQwmEAgkMuytg2J2CUFln92mDY1Vv3Fvw++F3t/vvdI3HqqoeXnEPJSXPyWEKQqMf616N0Dr4+bx7/nobeW9Uo4G4Wl2velAN0tqOxHFTRkr1wcXo1sXhLVh/srj40QcGx9iKsWtjTQCpw3Dm0HoYpLXbc2vWk6F1lVTorIHih1bxOYOLq1KaIkz53bnJdsimgiCPRB5NLlhPcXYDxUN1x4UVXXNgDPDgFXhr7znR4OSbl8C0Tpyf6QTxZo8CDjPaF/OBm8O3C3pLezKjp/iDSlOUKZ+9dbkV5BkvJdZi+cD5/I5/VAGbvcN/GijOswSmy7+ajOMSzPbB8BEj9HUbG3PBG0i+SE9x7+ba4ORq9U4+S306rYArXSFJ7+TMSpO8rNihCpi7ykgdYe+ElcYXzd27Xvg3i9c7eUqGfRi6BU39N+T04gay/2nlcIBe99TR7jfHA0PMbW5iAHZ89oFoY4nztp4dTxaEkpzO4OLT5JEpJe0mv5AxUDx/X5GFxgObeykIT0UVb/3EI9oZ4gcbTZTmAh3tjscsLP6ecU9P1NY8oqR1f/4LGJxcVv9++KX7ik2HHU/YGXKSOOnLRqZjMDAVAzfXlrEyONhZ4qKVxnssNO61MfhRO0vO2lhS2hvplPZ8EZ/Dg5ezla4Q6J18w4pPs3STRTaG+K3u+D4xNBmByPQZOHUlBB/Fg9DABTJ4vze9P9qV7fv2GAxOxZTzwBAL5gO+8UrXl10qFazJO7e3mV3P21kyaWMJqfPrXomfGFQAuT4xfhqoUy2ilcGzFnp3vafQ/1i1rBKP5xErjVfbWXJGHsXmXirrPNmSaQp1ZPAT+9PypTLQxhCnrXTdy6sC/yFQrbHS+GvyouTlWmm8y8rgjVaaMG9inc/8d+D/pL8Aw3mxX2X1GHoAAAAASUVORK5CYII=" alt="${this._("notifications.google_translate_page_menu_label")}">`, // Icon cho Google Translate
          text: this._("notifications.google_translate_page_menu_label"),
          "data-type": "googlePageTranslate",
          handler: () => {
            dropdown.style.display = "none";
            this.triggerGooglePageTranslate();
          }
        });
      }
      if (settings.ocrOptions?.enabled) {
        menuItems.push(
          {
            icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAfUlEQVR4nGNgYGBgmHLwxn9kzIAHYFU7hVoGMJAAqGsA1UCm3v+DWXr//2fp/T+Oxv9fb/+fJVP3/29keUwDdP//hilEpnHJk2VAlt7//5l6/6+S7YJs/f8Ombr/v4SG/mfGZsB+qA3HkPnIYYDXC2SDKQOekKYMeGaiBAAAKXcJNrF/Bp0AAAAASUVORK5CYII=" alt="${this._("notifications.ocr_region_menu_label")}">`,
            text: this._("notifications.ocr_region_menu_label"),
            handler: async () => {
              try {
                dropdown.style.display = "none";
                await new Promise((resolve) => setTimeout(resolve, 100));
                const screenshot = await this.ocr.captureScreen();
                if (!screenshot) {
                  throw new Error("Không thể tạo ảnh chụp màn hình");
                }
                this.showTranslatingStatus();
                const result = await this.ocr.processImage(screenshot);
                this.removeTranslatingStatus();
                if (!result) {
                  throw new Error(this._("notifications.un_pr_screen"));
                }
                this.formatTrans(result);
              } catch (error) {
                console.error("Screen translation error:", error);
                this.showNotification(error.message, "error");
              } finally {
                this.removeTranslatingStatus();
              }
            }
          },
          {
            icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACQklEQVR4nO2T3UtTcRjHhSAmhUHRjTeNkSdoDjf0bO5Mmst5qFZo2LroRdeL0YQugg2NgsPxts2CIrZQxGAbrSydK6W9SS9CUHThfS9XQf/EJ06bbmtaehHd+IXvxfPleT78fg+/X13dlv6b9H6G9UNM7xsiuSH7eaIfIvxH6EEv242DfDBdZngzNg6yvP8aDeuCbT7GbQP02QZo3Yyt/cg2H8/WBbvPMrPRld14zd5bb7iovKXxr7MnT/F8o+CJLPMTWZjIslQze6YH07lerlT4U1Xdg++Sl91rgQtzPC6koZBmQavP91aArx5j0e/Bu66Pc8HvIbIW+Mskuq/THP7+iB0lVhkc6K69etBNU1Cmd1imRXGiC8p8DrqLe9SkONkZkLkZkBm53k79mizVVQsePYRp1IlP7cKugdVO3qkuMoqbRuUIDWonLxQXstqJR3Uxd7u7eOIqVkjiW8jB0zEHp7U6LHE/5GAm1IFQOp0u5CAx1oEhJJEJS7wck2hbmb8jYQ9LRXhYqgBHrSxHbfRFRUai1uLviYh0RUTuRq14J53oIiIJLX/QhiEikhuXymsp9dsjVuaiIq9Ww5iZXMJMIGbhYdyMEm/Bk2xlV6IF/ZTIHg0cNxfBv/rbMMQtZOKWanjMgj1m4cdqkDIWH/WsETVl5MRsM1OVA8l26lPNZbCmtAlDykhm5kAZnvSyLdXM/GpTXuBevolkromFnMBiXuCjVq84J5DOC7yvzEr9hbzAUkU2mxU4+vtD2FLdP9FPOyyiEx9ZF+gAAAAASUVORK5CYII=" alt="${this._("notifications.web_image_ocr_menu_label")}">`,
            text: this._("notifications.web_image_ocr_menu_label"),
            handler: () => {
              dropdown.style.display = "none";
              this.startWebImageOCR();
            }
          },
          {
            icon: `<img src="https://github.com/king1x32/King-Translator-AI/raw/main/icon/comic.png" alt="${this._("notifications.manga_web_menu_label")}">`,
            text: this._("notifications.manga_web_menu_label"),
            handler: () => {
              dropdown.style.display = "none";
              this.startMangaTranslation();
            }
          },
          {
            icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACKUlEQVR4nO2Sz0uTcRzHn6hTJ+tQHRTMyOmW5HCPxAbPk0zRLZyUPSxCkWfgLNzYKTZDarhVj1B7oovtuXSI7TAaj6VukIp5CD177RAE/R2vGGms/XhaHqM3vC6fz+f94nv4CsL/1KZjnkB7BO1v6ZgnJgicEJqlN8zH7jA99jlu28MordBzn4HeObL2OexNxS4V0xViyaWy4lLRWiLE2oBKUpyhv6lYmsaUptDlGTqbHjXoyNMkZSuxP4jpD6KPBhuL07tMPNmlpO3QXt25ESTpv2shViYxlUl0ZZJ7d8Y5X7svbfC6XIJymdGaTlJRLMRqADMUQA8FWFQDFEMBlh/LnDraf//A6W9FxNqOOk5yZsJCHB3DjPjQo2NsR3xoER+zUR/PmhYOO1EfyZjfQhwfxox70RNenie8BONeVuJejIURrlTfPRjCFh+mnPBS+I1hSvERpurEaQkzJaGnZRbSEkZKJrckcSsl8bDm7lVqiEuNHpeW2agbZtyYugdfxsO7jJtSxs3a4Ww946bwCw9fdZm2SufFNfoyHhLVjjpxVuSLIbKcHUSzwhA5eHOVNkPkpjFIzhDZzw7yqOIwxAbivJNPuX6UP+JkpyIu2Dmb68efd/Lybd/Pv513NhCbDq6vOni66kCz4r2Dg/U+zlQ663YuVHpHjlVHA3Gr2bIR27QR3bxMVzXbNtxb3RSF46YgcHKvk9n9i2jV7HWx+LmLc8cWC/9sfgCb97UQIppPcwAAAABJRU5ErkJggg==" alt="${this._("notifications.image_file_menu_label")}">`,
            text: this._("notifications.image_file_menu_label"),
            handler: () => ocrInput.click()
          }
        );
      }
      if (settings.mediaOptions?.enabled) {
        menuItems.push({
          icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAACLUlEQVR4nNWMz0sTcBjGd4gORXTqWEYx3ISZ25iy1ea23MzpNEpbBGITW2yoGJsNkblDsFUopZdSTMMtrDVnaGtlabsEdezkpZCCpOg/6PKJb7iG7ocyL/XAc3jf5/k8Esl/r7JuZEe6qZNfZ1k1xOeM5X4+HnZjFdlWC6boqNTNsXIXS7KrTLWO8HNsBTLufcivCjevZS78Wy0YwRYcNvYwbbnGmt3Pl+l5mHuZdSwJrYN8a+xndasFI9iCwxf6+PR+AUqxYAsON3XwtauH1VIs2ILDzQ7mJSWqKOs4X/pwUdbZvP3w5RYUTjsu4Y4WqnbEemzbD3tspN2NtLkbuOG24dsR67Pkhr56tD4Lc14Lz8TttbDmtRLzWol4bZQVY/8qYNocBk2cGzITHzRhDpgJZTrBNvYGjNQUYzcpbMiGN+s4GDaQDulxhPXMhPRYb5s4LjrBWvaE9azc0nEgH5ujUV02vKPDMaql/a6WVyM2PMOdfB928mPUwJuN/MrYSRrysTma0GTDiWr67ms4PaGhafIM72aT8DgJk/V8GK/h4r0aLOMaevOxOYoqeR5VMfBIiT+q5ElESaf4z5q4lDjLeqKF9dlTtEdVpCJqukTnT1fFQETJYsHhmUr2zytQCydOUB1XsLygZp/IYlUcSihoiFfyNF6JfU7Biuhk+oKV7FTJCswv5Cymyjkq7pSc/iUZtRs/o2Q3SkuRp6VMpaXEhN9KeSB+uxr9J/UbsfXQjgkgRpYAAAAASUVORK5CYII=" alt="${this._("notifications.media_file_menu_label")}">`,
          text: this._("notifications.media_file_menu_label"),
          handler: () => mediaInput.click()
        });
      }
      menuItems.push({
        icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAABxklEQVR4nNWUv0sbYRyHIwaEgn9AhzgYq6EeCXgpB0nT5ISUUHAIKEp+oNCAGilpaZAOUQdJa5eokw4KcUuCopcEJQaXZHHo/9GpHVpKx6ckWknIte+dm1/48HLH93neDzecxfLgx7bCri3J8VCS0n9SH01zYpmh37B4bIkz4c4iATXDL/d7aoblzgSnoh3XawIfdviRO+R3IMWlfwOrUKwsiMXP4oxG3vJ96xPfYu/4GVykIBSrUbG4Nb5ZbGoEuZVAjJoQCM0ZE5tmwtPmxYaYSNi82BCTmDIvNsSsvDIvNsSkg+bF6SAvhUtrqjHxhh/r+iSpdZXy2iTa7bn6JsSALvDxhVjckmZ9lLJ+lrHQd8f6mM/60Hb15DmPWJzzktr2sHz3/Jx4Bx/d9pLpgfYUsXhfodLZdF/p/nHtKVR7oLzMVV7GfuhmWC8HHgbz8s3lR27i+QnOjib42j5llm4dveWKLq4LTrb+GRfeoqu7cdHZ3bjg1GlcltjRJI7L45R0I/FZG2dVe8p8B9Nu2pqKRFiT2BR9Tt05H2Gg7kCrjxHtfF9zEL50cFGWeXQv8V958wmZpp1qYwStaafSsLP55fGN9A/mHCTEh8xvxQAAAABJRU5ErkJggg==" alt="${this._("notifications.generic_file_menu_label")}">`,
        text: this._("notifications.generic_file_menu_label"),
        handler: () => {
          dropdown.style.display = "none";
          const supportedFormats = RELIABLE_FORMATS.text.formats.map(f => `.${f.ext}`).join(',');
          const input = document.createElement("input");
          input.type = "file";
          input.accept = supportedFormats;
          input.style.display = "none";
          input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
              this.showTranslatingStatus();
              const result = await this.translator.translateFile(file);
              console.log(file.type);
              const blob = file.type.endsWith('pdf') ? result : new Blob([result], { type: file.type });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `king1x32_translated_${file.type.endsWith('pdf') ? file.name.replace(".pdf", ".html") : file.name}`;
              this.shadowRoot.appendChild(a);
              a.click();
              URL.revokeObjectURL(url);
              a.remove();
              this.removeTranslatingStatus();
              this.showNotification(this._("notifications.file_translated_success"), "success");
            } catch (error) {
              console.error(this._("notifications.file_translation_error"), error);
              this.showNotification(error.message, "error");
            } finally {
              this.removeTranslatingStatus();
            }
          };
          input.click();
        }
      }, {
        icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAAB8klEQVR4nNWRz2uScRzHPXSpXeq2Wz8gGxsKGpopmwh7LG09K0gYHQpm2xAdFel8IlbdErpoHWoeGil0WFSLhpJD/Rs67VJEQaf+gy6v+Mzk0X2fZ2ye2hve8OXzfr/ePPA4HAdexzOMnEwx6crR9D/kW9fuJb6cSBGVbKeF2XXUleLU2DybY3O8Sjzld7ENXS++5o9rgc3RefKK52gIazscSbOq3eG7nuNH+SO8aZiu1uHaA35dzrK108IIazs8c5uvzQ0YxMLaDus3+HkrzdYgFtZ2+EqCD44BtSs7c7U/nJriyPVLHOv1zWmO7oXtU1I3w+Q08Vmd+qzOSq+TOjW5JxIctmMVpeNmmIljLF4koHRiaJkY7zMx1u/2jPeyirKaGWajGEuT6vA9jaFclJe5KM2sRtqKVbQcMcPlCMajsDrclWTSsWIVPZkww8I4RiFMoDDOhcIE632WWyczrFhFpaAZFs9jlEKdL34WYKEUpCiW93Y3REA6Vqyiss8MV3wYZX9neNXH8ItzxMXy3u76CUjHilVU8bBR8XK/4iFf9VKvejvD7TCHqh4ei+UtN8mkI91/zCf7YTdDay7Oit+6ef7OZf/zJJNOty+sYy+qjZKvjdgPSyYdx37VchJqOWm0TrNm5baTz80zBPc9/N/qL/loyWQnG2fwAAAAAElFTkSuQmCC" alt="documents-folder">`,
        text: this._("notifications.generic_file_gemini_menu_label"),
        handler: () => {
          dropdown.style.display = "none";
          this.handleGeminiFileOrUrlTranslation();
        }
      },
        {
          icon: `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABYAAAAWCAYAAADEtGw7AAAACXBIWXMAAAsTAAALEwEAmpwYAAADR0lEQVR4nM2S30/bZRTGO83EOX8kLtlcRKeOFa1tkTXwLVOEDgztaNkmli2jWGK+dDgobK5bvEC/6LIEY6ZZ2cbKhM0xllFp+bZCR1taEGVXJuqlLtmNt/o3fMwZssREuoQs0ZM8yTnPeZ4nb973NRj+y9rWywvF3XwpkP6BBZcc5kppJ6UvqxilX1OIyc8zFpU+awBF5tL3eMKqMrOyt6hMV7bypPSiEa14CoY6gxRV+slUtbNL8XNR8aNXtpOofp9dx25RIpBeONkp7UTsfl6v9JMV76rBjnfZXuPj/MocTFF8/AcuhpZIHF/izN/QQ0sMHf6WZ1d04qk7xEsFT+06yGXXISzaIqaPvyfbt4DluSO8WtxFl+D5ICZtEau2SKZvgVcaWzCL5753/LaXwDtteAcWmDudYIulgyGLyohZZb/A0sGoWeW8lmbzwHdkW3w0i6dAJOt8Hl5s3cdsOE1POM8BRysfOXzLpmiUhzWNh6Tf3Uano5Xg4DwHv0jTJZ4De//lGwa8PNXhYVZ1Mxhws3NkjsnPr7KxpZmc7CMZaiI5/hzO8cfwHNXCeZvJi0a0aiO2Dg/nJCPoXP4xd6u7gfoeF90r8400eqCBrV17GJF5PM3E9QwIrqWZEO7IHkZFI9p7j+0k2OOk7l5wyMH2k2+hf1hHfdBJUTJFIuLmsf7a5f+r36Q3eRMSghRB4WR3xssG0YrnRD11kiFZ/7gOrQZzfy29/bUkstOczqaoOKcwfraKctnnk9TkpnlT+gsKtkE7w/lplLkZTmkOdG03RyVj1Sf87A0+Heuk6VYSPWZj60QZszfK2JcqoUgQLWO/cPEKNi0lSYwG8AxU84nhfhW2czKs4Pp5irZfphia9/J4bgcn8kZmBLkdhNI+Nsrupzi+cBWNZ6sIFQz9uoJNlyrQMbBO5tsxmm7HyfwW4+ivU1QLpL/LxXGLRrTiuWTn6VWDr5vZMvYayaiJR8bL8YyVEx1X+ODOFZp+/4Zjgjtf0SSc7K7txB2xsV48V61sLnjqSSsNk1YSMSunLm/j0biFvTHL8heTkl64qJ0Nopm0osesOA1rqZSJqR9trBfMmIgbHlQtGHHljSQF88Y1nu5/X38B2jUbWROlf8IAAAAASUVORK5CYII=" alt="settings--v1">`,
          text: this._("notifications.settings"),
          handler: () => {
            dropdown.style.display = "none";
            const settingsUI = this.translator.userSettings.createSettingsUI();
            this.shadowRoot.appendChild(settingsUI);
          }
        });
      menuItems.forEach((item) => {
        const menuItem = document.createElement("div");
        menuItem.className = "translator-tools-item";
        if (item["data-type"]) {
          menuItem.setAttribute("data-type", item["data-type"]);
        }
        menuItem.innerHTML = `
<span class="item-icon">${item.icon}</span>
<span class="item-text">${item.text}</span>
`;
        menuItem.handler = item.handler;
        menuItem.addEventListener("click", item.handler);
        dropdown.appendChild(menuItem);
      });
      this.handleButtonClick = (e) => {
        e.stopPropagation();
        dropdown.style.display =
          dropdown.style.display === "none" ? "block" : "none";
      };
      mainButton.addEventListener("click", this.handleButtonClick);
      this.handleClickOutside = () => {
        dropdown.style.display = "none";
      };
      document.addEventListener("click", this.handleClickOutside);
      container.appendChild(closeButton);
      container.appendChild(mainButton);
      container.appendChild(dropdown);
      container.appendChild(ocrInput);
      container.appendChild(mediaInput);
      this.shadowRoot.appendChild(container);
      if (!this.shadowRoot.contains(container)) {
        this.shadowRoot.appendChild(container);
      }
      container.style.zIndex = "2147483647";
    }
    showProcessingStatus(message) {
      this.removeProcessingStatus();
      const status = document.createElement("div");
      status.className = "processing-status";
      status.innerHTML = `
<div class="processing-spinner" style="color: white"></div>
<div class="processing-message" style="color: white">${message}</div>
<div class="processing-progress" style="color: white">0%</div>
`;
      Object.assign(status.style, {
        position: "fixed",
        top: `${window.innerHeight / 2}px`,
        left: `${window.innerWidth / 2}px`,
        transform: "translate(-50%, -50%)",
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        color: "white",
        padding: "20px",
        borderRadius: "8px",
        zIndex: "2147483647",
        textAlign: "center",
        minWidth: "200px"
      });
      this.shadowRoot.appendChild(status);
      this.processingStatus = status;
    }
    updateProcessingStatus(message, progress) {
      if (this.processingStatus) {
        const messageEl = this.processingStatus.querySelector(
          ".processing-message"
        );
        const progressEl = this.processingStatus.querySelector(
          ".processing-progress"
        );
        if (messageEl) messageEl.textContent = message;
        if (progressEl) progressEl.textContent = `${progress}%`;
      }
    }
    removeProcessingStatus() {
      if (this.processingStatus) {
        this.processingStatus.remove();
        this.processingStatus = null;
      }
      const status = this.$('.processing-status');
      if (status) status.remove();
    }
    readFileContent(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error((this._("notifications.failed_read_file"))));
        reader.readAsText(file);
      });
    }
    showLoadingStatus(message = this._("notifications.processing_pdf")) {
      const loading = document.createElement("div");
      loading.id = "pdf-loading-status";
      loading.style.cssText = `
position: fixed;
top: ${window.innerHeight / 2}px;
left: ${window.innerWidth / 2}px;
transform: translate(-50%, -50%);
background-color: rgba(0, 0, 0, 0.8);
color: white;
padding: 20px;
border-radius: 8px;
z-index: 2147483647;
`;
      loading.innerHTML = `
<div style="text-align: center;">
    <div class="spinner" style="color: white"></div>
    <div style="color: white">${message}</div>
</div>
`;
      this.shadowRoot.appendChild(loading);
    }
    removeLoadingStatus() {
      const loading = this.shadowRoot.getElementById("pdf-loading-status");
      if (loading) loading.remove();
    }
    updateProgress(message, percent) {
      const loading = this.shadowRoot.getElementById("pdf-loading-status");
      if (loading) {
        loading.innerHTML = `
<div style="text-align: center;">
    <div class="spinner" style="color: white"></div>
    <div style="color: white">${message}</div>
    <div style="color: white">${percent}%</div>
</div>
`;
      }
    }
    startWebImageOCR() {
      const style = document.createElement("style");
      style.textContent = `
.translator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.3);
  z-index: 2147483647;
  pointer-events: none;
}
.translator-overlay.translating-done {
  background-color: transparent;
}
.translator-guide {
  position: fixed;
  top: 20px;
  left: ${window.innerWidth / 2}px;
  transform: translateX(-50%);
  background-color: rgba(0,0,0,0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2147483647;
  pointer-events: none;
}
.translator-cancel {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  pointer-events: auto;
}
`;
      this.shadowRoot.appendChild(style);
      const globalStyle = document.createElement('style');
      globalStyle.textContent = `
img:hover, canvas:hover {
  outline: 3px solid #4a90e2;
  outline-offset: -3px;
  cursor: pointer;
  position: relative;
  z-index: 2147483647;
  pointer-events: auto;
}
`;
      document.head.appendChild(globalStyle);
      const overlay = document.createElement("div");
      overlay.className = "translator-overlay";
      const guide = document.createElement("div");
      guide.className = "translator-guide";
      guide.textContent = this._("notifications.ocr_click_guide");
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "translator-cancel";
      cancelBtn.textContent = "✕";
      this.shadowRoot.appendChild(overlay);
      this.shadowRoot.appendChild(guide);
      this.shadowRoot.appendChild(cancelBtn);
      const handleClick = async (e) => {
        if (e.target.tagName === "IMG" || e.target.tagName === "CANVAS") {
          e.preventDefault();
          e.stopPropagation();
          try {
            const settings = this.settings;
            if (settings.apiProvider === "puter") {
              const prompt = this.translator.createPrompt("ocr", "ocr");
              const ocrResult = CONFIG.API.providers.puter.vision(prompt, e.target.src, false, {
                model: this.translator.api.getModel(),
              });
              const result = CONFIG.API.providers.puter.responseParser(ocrResult);
              this.translator.ui.updateProcessingStatus(this._("notifications.completed"), 100);
              this.formatTrans(result);
            }
            this.showTranslatingStatus();
            const targetElement = e.target;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (targetElement.tagName === "IMG") {
              const imageUrl = new URL(targetElement.src);
              const referer = window.location.href;
              const loadImage = async (url) => {
                return new Promise((resolve, reject) => {
                  GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    headers: {
                      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
                      "Accept-Encoding": "gzip, deflate, br",
                      "Accept-Language": "en-US,en;q=0.9",
                      "Cache-Control": "no-cache",
                      "Pragma": "no-cache",
                      "Referer": referer,
                      "Origin": imageUrl.origin,
                      "Sec-Fetch-Dest": "image",
                      "Sec-Fetch-Mode": "no-cors",
                      "Sec-Fetch-Site": "cross-site",
                      "User-Agent": navigator.userAgent
                    },
                    responseType: "blob",
                    anonymous: true,
                    onload: function(response) {
                      if (response.status === 200) {
                        const blob = response.response;
                        const img = new Image();
                        img.onload = () => {
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          ctx.drawImage(img, 0, 0);
                          resolve();
                        };
                        img.onerror = () => reject(new Error(this._("notifications.image_load_error")));
                        img.src = URL.createObjectURL(blob);
                      } else {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        img.onload = () => {
                          canvas.width = img.naturalWidth;
                          canvas.height = img.naturalHeight;
                          ctx.drawImage(img, 0, 0);
                          resolve();
                        };
                        img.onerror = () => reject(new Error(this._("notifications.image_load_error")));
                        img.src = url;
                      }
                    },
                    onerror: function() {
                      const img = new Image();
                      img.crossOrigin = "anonymous";
                      img.onload = () => {
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        ctx.drawImage(img, 0, 0);
                        resolve();
                      };
                      img.onerror = () => reject(new Error(this._("notifications.image_load_error")));
                      img.src = url;
                    }
                  });
                });
              };
              await loadImage(targetElement.src);
            } else if (targetElement.tagName === "CANVAS") {
              try {
                canvas.width = targetElement.width;
                canvas.height = targetElement.height;
                const sourceCtx = targetElement.getContext("2d", { willReadFrequently: true });
                try {
                  const imageData = sourceCtx.getImageData(0, 0, targetElement.width, targetElement.height);
                  ctx.putImageData(imageData, 0, 0);
                } catch (error) {
                  if (error.name === "SecurityError") {
                    throw new Error(this._("notifications.canvas_security_error"));
                  }
                  throw error;
                }
              } catch (error) {
                throw new Error(`Error processing canvas: ${error.message}`);
              }
            }
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hasContent = imageData.data.some(pixel => pixel !== 0);
            if (!hasContent) {
              throw new Error(this._("notifications.cannot_capture_element"));
            }
            const blob = await new Promise((resolve, reject) => {
              canvas.toBlob(blob => {
                if (!blob || blob.size < 100) {
                  reject(new Error(this._("notifications.cannot_generate_valid")));
                  return;
                }
                resolve(blob);
              }, 'image/png', 1.0);
            });
            const file = new File([blob], "web-image.png", { type: "image/png" });
            const result = await this.ocr.processImage(file);
            if (!result) {
              throw new Error(this._("notifications.un_pr_screen"));
            }
            overlay.classList.add("translating-done");
            this.formatTrans(result);
          } catch (error) {
            console.error("OCR error:", error);
            this.showNotification(error.message, "error");
          } finally {
            this.removeTranslatingStatus();
          }
        }
      };
      document.addEventListener("click", handleClick, true);
      cancelBtn.addEventListener("click", () => {
        document.removeEventListener("click", handleClick, true);
        overlay.remove();
        guide.remove();
        cancelBtn.remove();
        style.remove();
        globalStyle.remove();
      });
      this.webImageListeners = {
        click: handleClick,
        overlay,
        guide,
        cancelBtn,
        style,
        globalStyle
      };
    }
    formatTrans(result) {
      if (this.settings.displayOptions.translationMode !== "translation_only") {
        const translations = result.split("\n");
        let fullTranslation = "";
        let pinyin = "";
        let text = "";
        for (const trans of translations) {
          const parts = trans.split("<|>");
          text += (parts[0]?.trim() || "") + "\n";
          pinyin += (parts[1]?.trim() || "") + "\n";
          fullTranslation += (parts[2]?.trim() || trans) + "\n";
        }
        this.displayPopup(
          fullTranslation.trim(),
          text.trim(),
          "King1x32 <3",
          pinyin.trim()
        );
      } else {
        this.displayPopup(result, '', "King1x32 <3");
      }
    }
    createMangaOverlay(region, targetElement) {
      const overlay = document.createElement("div");
      overlay.className = "manga-translation-overlay";
      const adjustSize = (position) => {
        const ratio = position.height / position.width;
        if (ratio > 3) {
          position.height = position.width * 3;
        }
        // if (ratio > 3 || ratio < 1 / 3) {
        //   const avgSize = Math.sqrt(position.width * position.height);
        //   position.width = avgSize;
        //   position.height = avgSize
        // }
        const EDGE_PADDING = 5;
        if (position.edge_detection) {
          switch (position.boundary_position) {
            case 'left': position.x -= EDGE_PADDING; position.width += EDGE_PADDING; break;
            case 'right': position.width += EDGE_PADDING; break;
            case 'top': position.y -= EDGE_PADDING; position.height += EDGE_PADDING; break;
            case 'bottom': position.height += EDGE_PADDING; break;
            case 'corner':
              position.x -= EDGE_PADDING; position.y -= EDGE_PADDING;
              position.width += EDGE_PADDING * 2; position.height += EDGE_PADDING * 2;
              break;
          }
        }
        return position;
      };
      region.position = adjustSize(region.position);
      const handlesDirections = ['top', 'bottom', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];
      handlesDirections.forEach(direction => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${direction}`;
        handle.dataset.direction = direction;
        overlay.appendChild(handle);
        setTimeout(() => {
          if (!overlay.contains(handle)) {
            overlay.appendChild(handle);
          }
        }, 100);
      });
      let relativePosition = {
        x: region.position.x / 100,
        y: region.position.y / 100,
        width: region.position.width / 100,
        height: region.position.height / 100,
        isCustom: false
      };
      let customOffset = { x: 0, y: 0 };
      const calculateFontSize = (width, height, region) => {
        const settingsWeb = this.settings.displayOptions.webImageTranslation.fontSize;
        const minConfigFontSize = DEFAULT_SETTINGS.displayOptions.webImageTranslation.minFontSize;
        const maxConfigFontSize = DEFAULT_SETTINGS.displayOptions.webImageTranslation.maxFontSize;
        const convertToPx = (value, defaultPx) => {
          if (typeof value === 'number') return value;
          if (typeof value !== 'string') return defaultPx;
          const num = parseFloat(value);
          if (value.endsWith('px')) return num;
          if (value.endsWith('rem')) {
            return num * (parseFloat(getComputedStyle(document.documentElement).fontSize) || 16);
          }
          return num || defaultPx;
        };
        const minAllowedPx = convertToPx(minConfigFontSize, 8);
        const maxAllowedPx = convertToPx(maxConfigFontSize, 24);
        const textContent = region.translation || region.text || '';
        if (!textContent.trim()) {
          return { fontSize: minAllowedPx, lineHeight: 1.3 };
        }
        const paddingX = 13;
        const paddingY = 9;
        const availableWidth = width - paddingX;
        const availableHeight = height - paddingY;
        if (availableWidth <= 1 || availableHeight <= 1) {
          return { fontSize: minAllowedPx, lineHeight: 1.3 };
        }
        const tempDiv = document.createElement('div');
        Object.assign(tempDiv.style, {
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          visibility: 'hidden',
          width: `${availableWidth}px`,
          fontFamily: "'Patrick Hand', 'Comic Neue', 'GoMono Nerd Font', 'Noto Sans', Arial",
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          padding: '0'
        });
        tempDiv.innerText = textContent;
        this.shadowRoot.appendChild(tempDiv);
        let optimalSize;
        let optimalLineHeight = 1.3;
        const isFit = (fontSize, lineHeight) => {
          tempDiv.style.fontSize = `${fontSize}px`;
          tempDiv.style.lineHeight = lineHeight;
          return tempDiv.scrollHeight <= availableHeight;
        };
        if (settingsWeb === 'auto') {
          let low = minAllowedPx;
          let high = Math.min(maxAllowedPx, availableHeight / (textContent.split('\n').length || 1));
          let bestFit = low;
          while (low <= high) {
            let mid = (low + high) / 2;
            if (isFit(mid, optimalLineHeight)) {
              bestFit = mid;
              low = mid + 0.1;
            } else {
              high = mid - 0.1;
            }
          }
          optimalSize = bestFit;
        } else {
          const userSpecifiedPx = convertToPx(settingsWeb, 14);
          if (isFit(userSpecifiedPx, optimalLineHeight)) {
            optimalSize = userSpecifiedPx;
          } else {
            let low = minAllowedPx;
            let high = userSpecifiedPx;
            let bestFit = low;
            while (low <= high) {
              let mid = (low + high) / 2;
              if (isFit(mid)) {
                bestFit = mid;
                low = mid + 0.1;
              } else {
                high = mid - 0.1;
              }
            }
            optimalSize = bestFit;
          }
        }
        const ratio = availableHeight / availableWidth;
        if (ratio > 1.5) {
          optimalLineHeight = 1.1;
          if (!isFit(optimalSize, optimalLineHeight)) {
            optimalSize *= 0.95;
          }
        } else if (ratio < 0.7) {
          optimalLineHeight = 1.5;
        }
        while (!isFit(optimalSize, optimalLineHeight) && optimalSize > minAllowedPx) {
          optimalSize -= 0.5;
        }
        tempDiv.remove();
        return {
          fontSize: Math.max(minAllowedPx, Math.min(maxAllowedPx, optimalSize)),
          lineHeight: optimalLineHeight
        };
      };
      const validatePosition = (pos) => {
        const imageRect = targetElement.getBoundingClientRect();
        return {
          x: Math.min(Math.max(pos.x, imageRect.left), imageRect.right - pos.width),
          y: Math.min(Math.max(pos.y, imageRect.top), imageRect.bottom - pos.height),
          width: pos.width,
          height: pos.height
        };
      };
      const calculateAbsolutePosition = () => {
        const imageRect = targetElement.getBoundingClientRect();
        let pos;
        if (relativePosition.isCustom) {
          const maxX = imageRect.width - (relativePosition.width * imageRect.width);
          const maxY = imageRect.height - (relativePosition.height * imageRect.height);
          pos = {
            x: imageRect.left + Math.min(maxX, Math.max(0, customOffset.x)),
            y: imageRect.top + Math.min(maxY, Math.max(0, customOffset.y)),
            width: relativePosition.width * imageRect.width,
            height: relativePosition.height * imageRect.height
          };
        } else {
          pos = {
            x: imageRect.left + (imageRect.width * relativePosition.x),
            y: imageRect.top + (imageRect.height * relativePosition.y),
            width: imageRect.width * relativePosition.width,
            height: imageRect.height * relativePosition.height
          };
        }
        return validatePosition(pos);
      };
      const adjustBubbleSize = () => {
        const pos = calculateAbsolutePosition();
        const ratio = pos.width / pos.height;
        const imageRect = targetElement.getBoundingClientRect();
        if (ratio > 3 || ratio < 1 / 3) {
          const avgSize = Math.sqrt(pos.width * pos.height);
          relativePosition.width = avgSize / imageRect.width;
          relativePosition.height = avgSize / imageRect.height;
          updateOverlayStyle();
        }
      };
      const updateOverlayStyle = () => {
        const pos = calculateAbsolutePosition();
        const { fontSize, lineHeight } = calculateFontSize(pos.width, pos.height, region);
        Object.assign(overlay.style, {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: `${pos.width}px`,
          height: `${pos.height}px`,
          fontSize: `${fontSize}px`,
          lineHeight: lineHeight,
          fontFamily: "'Patrick Hand', 'Comic Neue', 'GoMono Nerd Font', 'Noto Sans', Arial",
          fontWeight: region.position.text_style === 'bold' ? 'bold' : 'normal',
          fontStyle: region.position.text_style === 'italic' ? 'italic' : 'normal',
          writingMode: region.position.text_orientation === 'vertical' ? 'vertical-rl' : 'horizontal-tb',
        });
      };
      let isDragging = false, isResizing = false, isPinching = false;
      let initialMouseX, initialMouseY, initialRect;
      let initialPinchDistance = 0, initialPinchWidth = 0, initialPinchHeight = 0;
      let lastTapTime = 0, tapCount = 0;
      let tapTimer = null;
      const mouseDownHandler = (e) => {
        const handle = e.target;
        if (handle.classList.contains('resize-handle')) {
          e.preventDefault();
          e.stopPropagation();
          isResizing = true;
          initialRect = overlay.getBoundingClientRect();
          initialMouseX = e.clientX;
          initialMouseY = e.clientY;
          document.addEventListener('mousemove', mouseMoveHandler);
          document.addEventListener('mouseup', mouseUpHandler);
          mouseMoveHandler.direction = handle.dataset.direction;
        } else {
          isDragging = true;
          initialMouseX = e.clientX;
          initialMouseY = e.clientY;
          initialRect = {
            left: overlay.offsetLeft,
            top: overlay.offsetTop
          };
          overlay.style.cursor = "grabbing";
          document.addEventListener('mousemove', mouseMoveHandler);
          document.addEventListener('mouseup', mouseUpHandler);
        }
      };
      const mouseMoveHandler = (e) => {
        if (isResizing) {
          const deltaX = e.clientX - initialMouseX;
          const deltaY = e.clientY - initialMouseY;
          let { width, height, left, top } = initialRect;
          const direction = mouseMoveHandler.direction;
          if (direction.includes('right')) width += deltaX;
          if (direction.includes('left')) { width -= deltaX; left += deltaX; }
          if (direction.includes('bottom')) height += deltaY;
          if (direction.includes('top')) { height -= deltaY; top += deltaY; }
          const minSize = 20;
          if (width < minSize) { if (direction.includes('left')) left += width - minSize; width = minSize; }
          if (height < minSize) { if (direction.includes('top')) top += height - minSize; height = minSize; }
          overlay.style.width = `${width}px`;
          overlay.style.height = `${height}px`;
          overlay.style.left = `${left}px`;
          overlay.style.top = `${top}px`;
          const { newFontSize, newLineHeight } = calculateFontSize(width, height, region);
          overlay.style.fontSize = `${newFontSize}px`;
          overlay.style.lineHeight = newLineHeight;
        } else if (isDragging) {
          const dx = e.clientX - initialMouseX;
          const dy = e.clientY - initialMouseY;
          const newLeft = initialRect.left + dx;
          const newTop = initialRect.top + dy;
          overlay.style.left = `${newLeft}px`;
          overlay.style.top = `${newTop}px`;
        }
      };
      const mouseUpHandler = () => {
        if (isResizing || isDragging) {
          const imageRect = targetElement.getBoundingClientRect();
          relativePosition.width = overlay.offsetWidth / imageRect.width;
          relativePosition.height = overlay.offsetHeight / imageRect.height;
          customOffset.x = overlay.offsetLeft - imageRect.left;
          customOffset.y = overlay.offsetTop - imageRect.top;
          relativePosition.isCustom = true;
          adjustBubbleSize();
        }
        isDragging = false;
        isResizing = false;
        overlay.style.cursor = "grab";
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
      };
      overlay.addEventListener("mousedown", mouseDownHandler);
      const resetOverlayPosition = () => {
        relativePosition = {
          x: region.position.x / 100, y: region.position.y / 100,
          width: region.position.width / 100, height: region.position.height / 100,
          isCustom: false
        };
        customOffset = { x: 0, y: 0 };
        updateOverlayStyle();
      };
      const handleTap = (e) => {
        const currentTime = Date.now();
        const tapDelay = currentTime - lastTapTime;
        lastTapTime = currentTime;
        if (tapDelay < 300) {
          tapCount++;
          if (tapCount === 2) {
            e.preventDefault();
            e.stopPropagation();
            resetOverlayPosition();
            tapCount = 0;
            if (tapTimer) clearTimeout(tapTimer);
          }
        } else {
          tapCount = 1;
          if (tapTimer) clearTimeout(tapTimer);
          tapTimer = setTimeout(() => {
            tapCount = 0;
          }, 300);
        }
      };
      const touchStartHandler = (e) => {
        if (e.touches.length === 1 && !isPinching) {
          handleTap(e);
          isDragging = true;
          const touch = e.touches[0];
          initialMouseX = touch.clientX;
          initialMouseY = touch.clientY;
          initialRect = overlay.getBoundingClientRect();
        } else if (e.touches.length === 2) {
          isDragging = false;
          isPinching = true;
          const [t1, t2] = e.touches;
          initialPinchDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const imageRect = targetElement.getBoundingClientRect();
          initialPinchWidth = overlay.offsetWidth / imageRect.width;
          initialPinchHeight = overlay.offsetHeight / imageRect.height;
        }
      };
      const touchMoveHandler = (e) => {
        e.preventDefault();
        if (isPinching && e.touches.length === 2) {
          const [t1, t2] = e.touches;
          const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
          const scale = currentDist / initialPinchDistance;
          const imageRect = targetElement.getBoundingClientRect();
          const minSize = 30 / imageRect.width;
          relativePosition.width = Math.max(minSize, initialPinchWidth * scale);
          relativePosition.height = Math.max(minSize, initialPinchHeight * scale);
          relativePosition.isCustom = true;
          updateOverlayStyle();
        } else if (isDragging && e.touches.length === 1) {
          const touch = e.touches[0];
          const dx = touch.clientX - initialMouseX;
          const dy = touch.clientY - initialMouseY;
          overlay.style.left = `${initialRect.left + dx + window.scrollX}px`;
          overlay.style.top = `${initialRect.top + dy + window.scrollY}px`;
        }
      };
      const touchEndHandler = (e) => {
        if (e.touches.length < 2) isPinching = false;
        if (e.touches.length < 1) isDragging = false;
        if (!isPinching && !isDragging) {
          const imageRect = targetElement.getBoundingClientRect();
          customOffset.x = (overlay.offsetLeft - window.scrollX) - imageRect.left;
          customOffset.y = (overlay.offsetTop - window.scrollY) - imageRect.top;
          relativePosition.width = overlay.offsetWidth / imageRect.width;
          relativePosition.height = overlay.offsetHeight / imageRect.height;
          relativePosition.isCustom = true;
        }
      };
      overlay.addEventListener("touchstart", touchStartHandler, { passive: false });
      overlay.addEventListener("touchmove", touchMoveHandler, { passive: false });
      overlay.addEventListener("touchend", touchEndHandler);
      overlay.addEventListener("touchcancel", touchEndHandler);
      overlay.addEventListener("dblclick", (e) => {
        e.preventDefault(); e.stopPropagation();
        resetOverlayPosition();
      });
      overlay.addEventListener("wheel", (e) => {
        if (e.ctrlKey) {
          e.preventDefault();
          const currentOpacity = parseFloat(overlay.style.opacity) || 0.95;
          const newOpacity = Math.max(0.1, Math.min(1, currentOpacity + (e.deltaY > 0 ? -0.05 : 0.05)));
          overlay.style.opacity = newOpacity;
        }
      });
      overlay.innerText = region.translation;
      updateOverlayStyle();
      const handleScrollAndResize = () => requestAnimationFrame(updateOverlayStyle);
      window.addEventListener("scroll", handleScrollAndResize, { passive: true });
      window.addEventListener("resize", handleScrollAndResize, { passive: true });
      const cleanup = () => {
        window.removeEventListener("scroll", handleScrollAndResize);
        window.removeEventListener("resize", handleScrollAndResize);
        overlay.removeEventListener("mousedown", mouseDownHandler);
        document.removeEventListener("mousemove", mouseMoveHandler);
        document.removeEventListener("mouseup", mouseUpHandler);
        overlay.removeEventListener("touchstart", touchStartHandler);
        overlay.removeEventListener("touchmove", touchMoveHandler);
        overlay.removeEventListener("touchend", touchEndHandler);
        overlay.removeEventListener("touchcancel", touchEndHandler);
      };
      overlay.cleanup = cleanup;
      return overlay;
    }
    startMangaTranslation() {
      const themeMode = this.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      const style = document.createElement("style");
      style.textContent = `
@import url('https://fonts.googleapis.com/css2?family=Patrick+Hand&family=Comic+Neue:wght@400;700&display=swap');
.translator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0,0,0,0.3);
  z-index: 2147483647;
  pointer-events: none;
}
.translator-overlay.translating-done {
  background-color: transparent;
}
.translator-guide {
  position: fixed;
  top: 20px;
  left: ${window.innerWidth / 2}px;
  transform: translateX(-50%);
  background-color: rgba(0,0,0,0.8);
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  z-index: 2147483647;
  pointer-events: none;
}
.translator-cancel {
  position: fixed;
  top: 20px;
  right: 20px;
  background-color: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  width: 30px;
  height: 30px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483647;
  pointer-events: auto;
}
.manga-translation-overlay {
  position: absolute;
  background-color: ${theme.background};
  color: ${theme.text};
  border-radius: 8%;
  padding: 4px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-family: 'Patrick Hand', 'Comic Neue', 'GoMono Nerd Font', 'Noto Sans', Arial;
  z-index: 2147483647;
  opacity: 0.95;
  cursor: grab;
  user-select: none;
  transition: none;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
  pointer-events: all;
}
.manga-translation-overlay:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
}
.manga-translation-overlay:active {
  cursor: grabbing;
}
.manga-translation-overlay .resize-handle {
  position: absolute;
  background: transparent;
  z-index: 2147483647;
  transition: background-color 0.2s;
}
/* Handles ở các cạnh */
.manga-translation-overlay .resize-handle.top {
  top: -5px;
  left: 16px; /* Thêm khoảng đệm để không chạm vào góc */
  right: 16px;
  height: 10px;
  cursor: ns-resize;
}
.manga-translation-overlay .resize-handle.bottom {
  bottom: -5px;
  left: 16px;
  right: 16px;
  height: 10px;
  cursor: ns-resize;
}
.manga-translation-overlay .resize-handle.left {
  left: -5px;
  top: 16px;
  bottom: 16px;
  width: 10px;
  cursor: ew-resize;
}
.manga-translation-overlay .resize-handle.right {
  right: -5px;
  top: 16px;
  bottom: 16px;
  width: 10px;
  cursor: ew-resize;
}
/* Handles ở các góc */
.manga-translation-overlay .resize-handle.top-left {
  top: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  transform: translate(2px, 2px);
  border-radius: 50%; /* Bo tròn chính handle */
}
.manga-translation-overlay .resize-handle.top-right {
  top: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
  transform: translate(-2px, 2px);
  border-radius: 50%;
}
.manga-translation-overlay .resize-handle.bottom-left {
  bottom: 0;
  left: 0;
  width: 16px;
  height: 16px;
  cursor: nesw-resize;
  transform: translate(2px, -2px);
  border-radius: 50%;
}
.manga-translation-overlay .resize-handle.bottom-right {
  bottom: 0;
  right: 0;
  width: 16px;
  height: 16px;
  cursor: nwse-resize;
  transform: translate(-2px, -2px);
  border-radius: 50%;
}
.manga-translation-overlay .resize-handle:hover {
  background-color: rgba(74, 144, 226, 0.3);
}
.translating-done {
  background-color: transparent;
  pointer-events: none;
}
.translating-done * {
  pointer-events: auto;
}
`;
      this.shadowRoot.appendChild(style);
      const globalStyle = document.createElement('style');
      globalStyle.textContent = `
img:hover, canvas:hover {
  outline: 3px solid #4a90e2;
  outline-offset: -3px;
  cursor: pointer;
  position: relative;
  z-index: 2147483647;
  pointer-events: auto;
}
`;
      document.head.appendChild(globalStyle);
      const overlay = document.createElement("div");
      overlay.className = "translator-overlay";
      const guide = document.createElement("div");
      guide.className = "translator-guide";
      guide.textContent = this._("notifications.manga_click_guide");
      const cancelBtn = document.createElement("button");
      cancelBtn.className = "translator-cancel";
      cancelBtn.textContent = "✕";
      const overlayContainer = document.createElement("div");
      overlayContainer.style.cssText = `
position: fixed;
top: 0;
left: 0;
width: 100%;
height: 100%;
z-index: 2147483647;
pointer-events: none;
`;
      this.shadowRoot.appendChild(overlay);
      this.shadowRoot.appendChild(guide);
      this.shadowRoot.appendChild(cancelBtn);
      this.shadowRoot.appendChild(overlayContainer);
      let existingOverlays = [];
      let lastClickTime = 0;
      const handleClick = async (e) => {
        if (e.target.tagName === "IMG" || e.target.tagName === "CANVAS") {
          const currentTime = Date.now();
          if (currentTime - lastClickTime < 300) {
            lastClickTime = 0;
            return;
          }
          lastClickTime = currentTime;
          await new Promise(resolve => setTimeout(resolve, 300));
          if (lastClickTime !== currentTime) return;
          e.preventDefault();
          e.stopPropagation();
          try {
            const settings = this.settings;
            if (settings.apiProvider === "puter") {
              const prompt = this.translator.createPrompt("ocr", "ocr");
              const ocrResult = CONFIG.API.providers.puter.vision(prompt, e.target.src, false, {
                model: this.translator.api.getModel(),
              });
              const result = CONFIG.API.providers.puter.responseParser(ocrResult);
              this.translator.ui.updateProcessingStatus(this._("notifications.completed"), 100);
              this.formatTrans(result);
              return;
            }
            this.showTranslatingStatus();
            const targetElement = e.target;
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (targetElement.tagName === "IMG") {
              const imageUrl = new URL(targetElement.src);
              const referer = window.location.href;
              await this.loadImage(targetElement.src, canvas, ctx, imageUrl, referer);
            } else if (targetElement.tagName === "CANVAS") {
              await this.processCanvas(targetElement, canvas, ctx);
            }
            const blob = await new Promise((resolve, reject) => {
              canvas.toBlob((b) => {
                if (b) resolve(b);
                else reject(new Error("Could not create blob"));
              }, "image/png");
            });
            const file = new File([blob], "manga.png", { type: "image/png" });
            const result = await this.detectTextPositions(file);
            if (result?.regions) {
              overlay.classList.add("translating-done");
              const sortedRegions = this.sortRegions(result.regions);
              sortedRegions.forEach(region => {
                const overlay = this.createMangaOverlay(region, e.target);
                overlayContainer.appendChild(overlay);
                existingOverlays.push(overlay);
              });
            }
          } catch (error) {
            console.error("Translation error:", error);
            this.showNotification(error.message, "error");
          } finally {
            this.removeTranslatingStatus();
          }
        }
      };
      document.addEventListener("click", handleClick, true);
      cancelBtn.addEventListener("click", () => {
        this.cleanupManga(handleClick, existingOverlays, overlay, guide, cancelBtn, style, globalStyle, overlayContainer);
      });
      this.mangaListeners = {
        click: handleClick,
        overlay,
        guide,
        cancelBtn,
        style,
        globalStyle,
        overlayContainer,
        existingOverlays
      };
    }
    async loadImage(src, canvas, ctx, imageUrl, referer) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: "GET",
          url: src,
          headers: {
            "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Encoding": "gzip, deflate, br",
            "Accept-Language": "en-US,en;q=0.9",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
            "Referer": referer,
            "Origin": imageUrl.origin,
            "Sec-Fetch-Dest": "image",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site",
            "User-Agent": navigator.userAgent
          },
          responseType: "blob",
          anonymous: true,
          onload: (response) => {
            if (response.status === 200) {
              const blob = response.response;
              const img = new Image();
              img.onload = () => {
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);
                resolve();
              };
              img.onerror = () => reject(new Error(this._("notifications.image_load_error")));
              img.src = URL.createObjectURL(blob);
            } else {
              this.loadImageFallback(src, canvas, ctx, resolve, reject);
            }
          },
          onerror: () => {
            this.loadImageFallback(src, canvas, ctx, resolve, reject);
          }
        });
      });
    }
    loadImageFallback(src, canvas, ctx, resolve, reject) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        resolve();
      };
      img.onerror = () => reject(new Error(this._("notifications.image_load_error")));
      img.src = src;
    }
    async processCanvas(targetElement, canvas, ctx) {
      try {
        canvas.width = targetElement.width;
        canvas.height = targetElement.height;
        const sourceCtx = targetElement.getContext("2d", { willReadFrequently: true });
        try {
          const imageData = sourceCtx.getImageData(0, 0, targetElement.width, targetElement.height);
          ctx.putImageData(imageData, 0, 0);
        } catch (error) {
          if (error.name === "SecurityError") {
            throw new Error(this._("notifications.canvas_security_error"));
          }
          throw error;
        }
      } catch (error) {
        throw new Error(`Error processing canvas: ${error.message}`);
      }
    }
    sortRegions(regions) {
      const groupNearbyRegions = (regions) => {
        const DISTANCE_THRESHOLD = 20;
        const groups = [];
        const used = new Set();
        regions.forEach((region, i) => {
          if (used.has(i)) return;
          const group = [region];
          used.add(i);
          regions.forEach((otherRegion, j) => {
            if (i === j || used.has(j)) return;
            const distance = Math.sqrt(
              Math.pow(region.position.x - otherRegion.position.x, 2) +
              Math.pow(region.position.y - otherRegion.position.y, 2)
            );
            if (distance <= DISTANCE_THRESHOLD) {
              group.push(otherRegion);
              used.add(j);
            }
          });
          groups.push(group);
        });
        return groups;
      };
      const groupedRegions = groupNearbyRegions(regions);
      return groupedRegions
        .sort((a, b) => {
          const aAvgY = a.reduce((sum, r) => sum + r.position.y, 0) / a.length;
          const bAvgY = b.reduce((sum, r) => sum + r.position.y, 0) / b.length;
          const verticalThreshold = 20;
          if (Math.abs(aAvgY - bAvgY) < verticalThreshold) {
            console.log("phai sang trai");
            const aAvgX = a.reduce((sum, r) => sum + r.position.x, 0) / a.length;
            const bAvgX = b.reduce((sum, r) => sum + r.position.x, 0) / b.length;
            return bAvgX - aAvgX; // Phải sang trái
          }
          console.log("trai sang phai");
          return aAvgY - bAvgY; // Trên xuống dưới
        })
        .flat();
    }
    cleanupManga(handleClick, existingOverlays, ...elements) {
      document.removeEventListener("click", handleClick, true);
      existingOverlays.forEach(overlay => {
        if (overlay.cleanup) {
          overlay.cleanup();
        }
        overlay.remove();
      });
      elements.forEach(element => element.remove());
    }
    async detectTextPositions(file) {
      try {
        const settings = this.settings;
        const targetLanguage = settings.displayOptions.targetLanguage;
        const docTitle = document.title ? `from content titled "${document.title}"` : '';
        const prompt = `Analyze this comic/manga/manhua/manhwa image ${docTitle} with special attention to edge regions and partial text bubbles:
1. Text Detection (Enhanced Edge Detection):
  - Identify ALL text regions, especially focusing on:
    * Partial/cut-off speech bubbles at image edges
    * Text that touches or intersects image boundaries
    * Small or partially visible text elements
    * Overlapping or merged text regions
    * Semi-transparent or low-contrast text areas
  - Scan image edges with higher sensitivity
  - Consider incomplete speech bubbles as valid regions
  - Check corners and borders thoroughly
  - Detect text fragments and reconstruct possible complete phrases
2. Position Analysis (Edge-Aware):
  - x: percentage from left (0-100, allow partial <0 or >100 for edge cases)
  - y: percentage from top (0-100, allow partial <0 or >100 for edge cases)
  - width: percentage of image width (adjust for partial bubbles)
  - height: percentage of image height (adjust for partial bubbles)
  - edge_detection: true/false (indicates if text touches image boundary)
  - completion_status: complete/partial (indicates if bubble/text is cut off)
  - boundary_position: none/left/right/top/bottom/corner (where text touches edge)
3. Text Extraction Rules:
  - Extract text even if bubble is partially visible
  - Reconstruct cut-off characters if possible
  - Consider context for incomplete words
  - Maintain reading order even for partial text
  - Handle text that crosses multiple bubbles
  - Account for perspective and rotation
4. Translation Requirements:
  You are a professional comic/novel translator, specializing in creating accurate and natural translations. You need to translate the text ${docTitle} into the language with code '${targetLanguage}'. Ensure your translation:
    - Maintains original meaning and context
    - Fits the target language style
    - Considers cultural context and story background
  Important Translation Rules:
    - Target language: '${targetLanguage}'
    - Keep sentence meanings unchanged
    - Use appropriate slang or common phrases when needed
    - Ensure correct spelling and grammar
    - Add necessary language particles for '${targetLanguage}'
    - Use contextually appropriate pronouns
    - For adult content style reference: [truyensex.moe, truyensexvn.org, truyensex.vip, truyensextv69.com]
  Special handling for Vietnamese translations:
    - Keep Sino-Vietnamese forms for proper names/locations (e.g. "Diệp Trần, Long kiếm, Thiên kiếp")
    - Avoid direct translations (e.g. NOT "Lá Trần, Rồng kiếm, Trời kiếp")
  Other considerations:
    - Adapt names/terms for target language conventions
    - Respect text length and bubble space constraints
    - Maintain comic style and tone
    - Adapt sound effects appropriately
    - Keep cultural references understandable
    - Consider the context and theme ${docTitle}
5. Position Analysis (CRITICAL):
  - x: exact percentage from left (0-100)
  - y: exact percentage from top (0-100)
  - width: exact percentage of image width (0-100)
  - height: exact percentage of image height (0-100)
  - text_length: character count for spacing
  - text_lines: number of lines in region
  - text_type: dialogue/narration/sfx/note
  - container_type: bubble/caption/free/background
  - container_shape: round/square/jagged/custom
  - font_size: small/medium/large
  - layout_direction: horizontal/vertical/custom
Return JSON object with this structure:
{
  "regions": [{
    "text": "original text",
    "translation": "translated text",
    "position": {
      "x": 20.5,
      "y": 30.2,
      "width": 15.3,
      "height": 10.1,
      "text_length": 25,
      "text_lines": 2,
      "edge_detection": true,
      "completion_status": "partial",
      "boundary_position": "right",
      "text_type": "dialogue",
      "container_type": "bubble",
      "container_shape": "round",
      "font_size": "medium",
      "layout_direction": "horizontal",
      "text_style": "regular"
    }
  }]
}`;
        const response = await this.ocr.processImage(file, prompt);
        console.log("response: ", response);
        if (response) {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[0]);
            if (parsedJson && parsedJson.regions) {
              const processOverlappingRegions = (regions) => {
                const result = [];
                const processedIndices = new Set();
                const sortedRegions = [...regions].sort((a, b) => {
                  if (a.position.y !== b.position.y) {
                    return a.position.y - b.position.y;
                  }
                  return a.position.x - b.position.x;
                });
                const isOverlapping = (r1, r2) => {
                  return !(
                    r1.position.x + r1.position.width < r2.position.x ||
                    r2.position.x + r2.position.width < r1.position.x ||
                    r1.position.y + r1.position.height < r2.position.y ||
                    r2.position.y + r2.position.height < r1.position.y
                  );
                };
                for (let i = 0; i < sortedRegions.length; i++) {
                  if (processedIndices.has(i)) {
                    continue;
                  }
                  const currentGroup = [];
                  const queue = [i];
                  processedIndices.add(i);
                  while (queue.length > 0) {
                    const currentIndex = queue.shift();
                    const currentRegion = sortedRegions[currentIndex];
                    currentGroup.push(currentRegion);
                    for (let j = 0; j < sortedRegions.length; j++) {
                      if (!processedIndices.has(j) && isOverlapping(currentRegion, sortedRegions[j])) {
                        processedIndices.add(j);
                        queue.push(j);
                      }
                    }
                  }
                  currentGroup.sort((a, b) => {
                    if (a.position.y !== b.position.y) {
                      return a.position.y - b.position.y;
                    }
                    return a.position.x - b.position.x;
                  });
                  const mergedRegion = {
                    text: currentGroup.map(r => r.text).join(' '),
                    translation: currentGroup.map(r => r.translation).join(' '),
                    position: {
                      x: Math.min(...currentGroup.map(r => r.position.x)),
                      y: Math.min(...currentGroup.map(r => r.position.y)),
                      width: Math.max(...currentGroup.map(r => r.position.x + r.position.width)) - Math.min(...currentGroup.map(r => r.position.x)),
                      height: Math.max(...currentGroup.map(r => r.position.y + r.position.height)) - Math.min(...currentGroup.map(r => r.position.y)),
                      text_type: currentGroup[0].position.text_type,
                      container_type: currentGroup[0].position.container_type,
                      container_shape: currentGroup[0].position.container_shape,
                      font_size: currentGroup[0].position.font_size,
                      layout_direction: currentGroup[0].position.layout_direction,
                      text_style: currentGroup[0].position.text_style
                    }
                  };
                  result.push(mergedRegion);
                }
                return result;
              };
              parsedJson.regions = processOverlappingRegions(parsedJson.regions);
              return parsedJson;
            }
          }
          throw new Error("Invalid response format");
        }
        throw new Error("No response from API");
      } catch (error) {
        console.error("Text detection error:", error);
        throw error;
      }
    }
    getBrowserContextMenuSize() {
      const browser = navigator.userAgent;
      const sizes = {
        firefox: {
          width: 275,
          height: 340,
          itemHeight: 34
        },
        chrome: {
          width: 250,
          height: 320,
          itemHeight: 32
        },
        safari: {
          width: 240,
          height: 300,
          itemHeight: 30
        },
        edge: {
          width: 260,
          height: 330,
          itemHeight: 33
        }
      };
      let size;
      if (browser.includes("Firefox")) {
        size = sizes.firefox;
      } else if (browser.includes("Safari") && !browser.includes("Chrome")) {
        size = sizes.safari;
      } else if (browser.includes("Edge")) {
        size = sizes.edge;
      } else {
        size = sizes.chrome;
      }
      const dpi = window.devicePixelRatio || 1;
      return {
        width: Math.round(size.width * dpi),
        height: Math.round(size.height * dpi),
        itemHeight: Math.round(size.itemHeight * dpi)
      };
    }
    setupContextMenu() {
      if (!this.settings.contextMenu?.enabled) return;
      let isSpeaking = false;
      document.addEventListener("contextmenu", (e) => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        if (selectedText) {
          const oldMenus = this.$$(".translator-context-menu");
          oldMenus.forEach((menu) => menu.remove());
          const contextMenu = document.createElement("div");
          contextMenu.className = "translator-context-menu";
          const menuItems = [
            { text: this._("settings.quick_translate_shortcut"), action: "quick" },
            { text: this._("settings.popup_translate_shortcut"), action: "popup" },
            { text: this._("settings.advanced_translate_shortcut"), action: "advanced" },
            {
              text: this._("notifications.play_tts"),
              action: "tts",
              getLabel: () => isSpeaking ? this._("notifications.stop_tts") : this._("notifications.play_tts")
            }
          ];
          const range = selection.getRangeAt(0).cloneRange();
          menuItems.forEach((item) => {
            const menuItem = document.createElement("div");
            menuItem.className = "translator-context-menu-item";
            menuItem.textContent = item.getLabel ? item.getLabel() : item.text;
            menuItem.onclick = (e) => {
              e.preventDefault();
              e.stopPropagation();
              const newSelection = window.getSelection();
              newSelection.removeAllRanges();
              newSelection.addRange(range);
              if (item.action === "tts") {
                if (isSpeaking) {
                  speechSynthesis.cancel();
                  isSpeaking = false;
                } else {
                  speechSynthesis.cancel();
                  const utterance = new SpeechSynthesisUtterance(selectedText);
                  utterance.lang = this.settings.displayOptions.sourceLanguage;
                  utterance.onend = () => {
                    isSpeaking = false;
                    menuItem.textContent = this._("notifications.play_tts");
                  };
                  utterance.oncancel = () => {
                    isSpeaking = false;
                    menuItem.textContent = this._("notifications.play_tts");
                  };
                  speechSynthesis.speak(utterance);
                  isSpeaking = true;
                }
                menuItem.textContent = isSpeaking ? this._("notifications.stop_tts") : this._("notifications.play_tts")
              } else {
                this.handleTranslateButtonClick(newSelection, item.action);
                contextMenu.remove();
              }
            };
            contextMenu.appendChild(menuItem);
          });
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const menuWidth = 150;
          const menuHeight = (menuItems.length * 40);
          const browserMenu = this.getBrowserContextMenuSize();
          const browserMenuWidth = browserMenu.width;
          const browserMenuHeight = browserMenu.height;
          const spaceWidth = browserMenuWidth + menuWidth;
          const remainingWidth = viewportWidth - e.clientX;
          const rightEdge = viewportWidth - menuWidth;
          const bottomEdge = viewportHeight - menuHeight;
          const browserMenuWidthEdge = viewportWidth - browserMenuWidth;
          const browserMenuHeightEdge = viewportHeight - browserMenuHeight;
          let left, top;
          if (e.clientX < menuWidth && e.clientY < menuHeight) {
            left = e.clientX + browserMenuWidth + 10;
            top = e.clientY;
          } else if (
            e.clientX > browserMenuWidthEdge &&
            e.clientY < browserMenuHeight
          ) {
            left = e.clientX - spaceWidth + remainingWidth;
            top = e.clientY;
          } else if (
            e.clientX > browserMenuWidthEdge &&
            e.clientY > viewportHeight - browserMenuHeight
          ) {
            left = e.clientX - spaceWidth + remainingWidth;
            top = e.clientY - menuHeight;
          } else if (
            e.clientX < menuWidth &&
            e.clientY > viewportHeight - browserMenuHeight
          ) {
            left = e.clientX + browserMenuWidth + 10;
            top = e.clientY - menuHeight;
          } else if (e.clientY < menuHeight) {
            left = e.clientX - menuWidth;
            top = e.clientY;
          } else if (e.clientX > browserMenuWidthEdge) {
            left = e.clientX - spaceWidth + remainingWidth;
            top = e.clientY;
          } else if (e.clientY > browserMenuHeightEdge - menuHeight / 2) {
            left = e.clientX - menuWidth;
            top = e.clientY - menuHeight;
          } else {
            left = e.clientX;
            top = e.clientY - menuHeight;
          }
          left = Math.max(5, Math.min(left, rightEdge - 5));
          top = Math.max(5, Math.min(top, bottomEdge - 5));
          contextMenu.style.left = `${left}px`;
          contextMenu.style.top = `${top}px`;
          this.shadowRoot.appendChild(contextMenu);
          const closeMenu = (e) => {
            if (!contextMenu.contains(e.target)) {
              speechSynthesis.cancel();
              contextMenu.remove();
              document.removeEventListener("click", closeMenu);
            }
          };
          document.addEventListener("click", closeMenu);
          const handleScroll = debounce(() => {
            speechSynthesis.cancel();
            contextMenu.remove();
            window.removeEventListener("scroll", handleScroll);
          }, 150);
          window.addEventListener("scroll", handleScroll, { passive: true });
        }
      });
    }
    removeWebImageListeners() {
      if (this.webImageListeners) {
        document.removeEventListener(
          "mouseover",
          this.webImageListeners.hover,
          true
        );
        document.removeEventListener(
          "mouseout",
          this.webImageListeners.leave,
          true
        );
        document.removeEventListener(
          "click",
          this.webImageListeners.click,
          true
        );
        this.webImageListeners.overlay?.remove();
        this.webImageListeners.guide?.remove();
        this.webImageListeners.cancelBtn?.remove();
        this.webImageListeners.style?.remove();
        document
          .querySelectorAll(".translator-image-highlight")
          .forEach((el) => {
            el.classList.remove("translator-image-highlight");
          });
        this.webImageListeners = null;
      }
    }
    handleSettingsShortcut(e) {
      if (!this.settings.shortcuts?.settingsEnabled)
        return;
      if ((e.altKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        const settingsUI = this.translator.userSettings.createSettingsUI();
        this.shadowRoot.appendChild(settingsUI);
      }
    }
    async handleTranslationShortcuts(e) {
      if (!this.settings.shortcuts?.enabled) return;
      const shortcuts = this.settings.shortcuts;
      if (e.altKey || e.metaKey) {
        let translateType = null;
        if (e.key === shortcuts.pageTranslate.key) {
          e.preventDefault();
          await this.handlePageTranslation();
          return;
        } else if (e.key === shortcuts.inputTranslate.key) {
          e.preventDefault();
          const activeElement = document.activeElement;
          if (this.translator.input.isValidEditor(activeElement)) {
            const text = this.translator.input.getEditorContent(activeElement);
            if (text) {
              await this.translator.input.translateEditor(activeElement, true);
            }
          }
          return;
        }
        const selection = window.getSelection();
        const selectedText = selection?.toString().trim();
        if (!selectedText) return;
        const targetElement = selection.anchorNode?.parentElement;
        if (!targetElement) return;
        if (e.key === shortcuts.quickTranslate.key) {
          e.preventDefault();
          translateType = "quick";
        } else if (e.key === shortcuts.popupTranslate.key) {
          e.preventDefault();
          translateType = "popup";
        } else if (e.key === shortcuts.advancedTranslate.key) {
          e.preventDefault();
          translateType = "advanced";
        }
        if (translateType) {
          await this.handleTranslateButtonClick(selection, translateType);
        }
      }
    }
    async handleGeminiFileOrUrlTranslation() {
      const translator = this.translator;
      const _ = this._;
      if (this.settings.apiProvider !== 'gemini') {
        this.showNotification(_("notifications.only_gemini"), "warning");
        return;
      }
      const acceptedTypes = [
        'image/*',        // Tất cả các loại ảnh
        'audio/*',        // Tất cả các loại audio
        'video/*',        // Tất cả các loại video
        '.pdf',           // Tài liệu PDF
        '.txt', '.json', '.html', '.xml', '.csv', '.md', // Tài liệu văn bản
        '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', // Tài liệu văn phòng
      ].join(',');
      await createFileOrUrlInput(acceptedTypes, async (input) => {
        try {
          translator.ui.showTranslatingStatus();
          const promptText = translator.createPrompt("", "file_content");
          const processedContent = await translator.fileProcess.processFile(input, promptText);
          const result = await translator.api.request(processedContent.content, 'ocr', processedContent.key);
          translator.ui.removeTranslatingStatus();
          translator.ui.formatTrans(result);
        } catch (error) {
          console.error("Lỗi dịch file/URL bằng Gemini:", error);
          translator.ui.showNotification(_("notifications.generic_translation_error") + error.message, "error");
        } finally {
          translator.ui.removeTranslatingStatus();
        }
      });
    }
    updateSettingsListener(enabled) {
      if (enabled) {
        document.addEventListener("keydown", this.settingsShortcutListener);
      } else {
        document.removeEventListener("keydown", this.settingsShortcutListener);
      }
    }
    updateSettingsTranslationListeners(enabled) {
      if (enabled) {
        document.addEventListener("keydown", this.translationShortcutListener);
      } else {
        document.removeEventListener(
          "keydown",
          this.translationShortcutListener
        );
      }
    }
    updateSelectionListeners(enabled) {
      if (enabled) this.setupSelectionHandlers();
    }
    updateTapListeners(enabled) {
      if (enabled) this.setupDocumentTapHandler();
    }
    setupEventListeners() {
      this.updateSettingsListener(false);
      this.updateSettingsTranslationListeners(false);
      this.updateSelectionListeners(false);
      this.updateTapListeners(false);
      if (this.translator.input) {
        this.translator.input.cleanup();
      }
      const shortcuts = this.settings.shortcuts;
      const clickOptions = this.settings.clickOptions;
      const touchOptions = this.settings.touchOptions;
      if (this.settings.contextMenu?.enabled) {
        this.setupContextMenu();
      }
      if (shortcuts?.settingsEnabled) {
        this.updateSettingsListener(true);
      }
      if (shortcuts?.enabled) {
        this.updateSettingsTranslationListeners(true);
      }
      if (clickOptions?.enabled) {
        this.updateSelectionListeners(true);
        this.translationButtonEnabled = true;
      }
      if (touchOptions?.enabled) {
        this.updateTapListeners(true);
        this.translationTapEnabled = true;
      }
      this.translator.input = new InputTranslator(this.translator);
      const isEnabled = localStorage.getItem("translatorToolsEnabled") === "true";
      if (this.settings.translatorTools?.enabled && isEnabled) {
        this.setupTranslatorTools();
      }
      if (!this._hasSettingsChangedListener) {
        this.container.addEventListener("settingsChanged", (e) => {
          this.removeToolsContainer();
          const newSettings = e.detail;
          this.settings = newSettings;
          if (newSettings.theme !== this.settings.theme) {
            this.updateAllButtonStyles();
          }
          this.updateSettingsListener(newSettings.shortcuts?.settingsEnabled);
          this.updateSettingsTranslationListeners(newSettings.shortcuts?.enabled);
          if (newSettings.clickOptions?.enabled !== undefined) {
            this.translationButtonEnabled = newSettings.clickOptions.enabled;
            this.updateSelectionListeners(newSettings.clickOptions.enabled);
            if (!newSettings.clickOptions.enabled) {
              this.removeTranslateButton();
            }
          }
          if (newSettings.touchOptions?.enabled !== undefined) {
            this.translationTapEnabled = newSettings.touchOptions.enabled;
            this.updateTapListeners(newSettings.touchOptions.enabled);
            if (!newSettings.touchOptions.enabled) {
              this.removeTranslateButton();
            }
          }
          this.translator.cache = new TranslationCache(
            newSettings.cacheOptions.text.maxSize,
            newSettings.cacheOptions.text.expirationTime
          );
          this.translator.cache.clear();
          if (this.ocr?.imageCache) {
            this.ocr.imageCache.clear();
          }
          const apiConfig = {
            providers: CONFIG.API.providers,
            currentProvider: newSettings.apiProvider,
            apiKey: newSettings.apiKey,
            maxRetries: CONFIG.API.maxRetries,
            retryDelay: CONFIG.API.retryDelay
          };
          this.translator.api = new APIManager(
            apiConfig,
            () => this.settings
          );
          const isEnabled = localStorage.getItem("translatorToolsEnabled") === "true";
          if (this.settings.translatorTools?.enabled && isEnabled) {
            this.setupTranslatorTools();
          }
          if (!newSettings.inputTranslation.savePosition) {
            localStorage.removeItem('translatorButtonPosition');
          }
        });
        this._hasSettingsChangedListener = true;
      }
    }
    showNotification(message, type = "info") {
      const notification = document.createElement("div");
      notification.className = "translator-notification";
      const colors = {
        info: "#4a90e2",
        success: "#28a745",
        warning: "#ffc107",
        error: "#dc3545"
      };
      const backgroundColor = colors[type] || colors.info;
      const textColor = type === "warning" ? "#000" : "#fff";
      Object.assign(notification.style, {
        position: "fixed",
        top: "20px",
        left: `${window.innerWidth / 2}px`,
        transform: "translateX(-50%)",
        backgroundColor,
        color: textColor,
        padding: "10px 20px",
        borderRadius: "8px",
        zIndex: "2147483647",
        animation: "fadeInOut 2s ease",
        fontFamily: "'GoMono Nerd Font', 'Noto Sans', Arial",
        fontSize: "14px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.2)"
      });
      notification.innerText = message;
      this.shadowRoot.appendChild(notification);
      setTimeout(() => notification.remove(), 5000);
    }
    resetState() {
      if (this.pressTimer) clearTimeout(this.pressTimer);
      if (this.timer) clearTimeout(this.timer);
      this.isLongPress = false;
      this.lastTime = 0;
      this.count = 0;
      this.isDown = false;
      this.ignoreNextSelectionChange = false;
      this.removeTranslateButton();
      this.removeTranslatingStatus();
    }
    removeTranslateButton() {
      if (this.currentTranslateButton) {
        const button = this.$('.translator-button');
        if (button) button.remove();
        this.currentTranslateButton = null;
      }
    }
    removeTranslatingStatus() {
      if (this.translatingStatus) {
        this.translatingStatus.remove();
        this.translatingStatus = null;
      }
      const status = this.$('.center-translate-status');
      if (status) status.remove();
    }
    cleanup() {
      document.removeEventListener("click", this.handleClickOutside);
      document.removeEventListener("keydown", this.settingsShortcutListener);
      document.removeEventListener("keydown", this.translationShortcutListener);
      document.removeEventListener('mousedown', this.setupSelectionHandlers);
      document.removeEventListener('mousemove', this.setupSelectionHandlers);
      document.removeEventListener('mouseup', this.setupSelectionHandlers);
      document.removeEventListener('touchend', this.setupSelectionHandlers);
      if (this._touchStartHandler) {
        document.removeEventListener("touchstart", this._touchStartHandler, { passive: false });
        document.removeEventListener("touchend", this._touchEndHandler);
        document.removeEventListener("touchcancel", this._touchEndHandler);
        this._touchStartHandler = null;
        this._touchEndHandler = null;
      }
      this.removeTranslateButton();
      this.removeTranslatingStatus();
      this.removeToolsContainer();
      this.removeWebImageListeners();
      if (this.mangaListeners) {
        this.cleanup(
          this.mangaListeners.click,
          this.mangaListeners.existingOverlays,
          this.mangaListeners.overlay,
          this.mangaListeners.guide,
          this.mangaListeners.cancelBtn,
          this.mangaListeners.style,
          this.mangaListeners.globalStyle,
          this.mangaListeners.overlayContainer
        );
        this.mangaListeners = null;
      }
      const openPopups = this.$$(".translator-popup");
      openPopups.forEach(popup => {
        if (popup.cleanup) popup.cleanup();
        popup.remove();
      });
      if (this.container && this.container.parentNode) {
        this.container.remove();
      }
      this.shadowRoot = null;
      this.container = null;
    }
  }
  class Translator {
    constructor() {
      if (window.translatorInstance) {
        window.translatorInstance.cleanup();
        window.translatorInstance = null;
      }
      window.translator = this;
      this.userSettings = new UserSettings(this);
      this._ = this.userSettings._;
      const apiConfig = {
        ...CONFIG.API,
        currentProvider: this.userSettings.getSetting("apiProvider"),
        apiKey: this.userSettings.getSetting("apiKey")
      };
      this.fileProcess = new FileProcessor(this);
      this.videoStreaming = new VideoStreamingTranslator(this);
      this.api = new APIManager(apiConfig, () => this.userSettings.settings, this.userSettings._);
      this.page = new PageTranslator(this);
      this.input = new InputTranslator(this);
      this.ocr = new OCRManager(this);
      this.media = new MediaManager(this);
      this.fileManager = new FileManager(this);
      this.cache = new TranslationCache(
        this.userSettings.settings.cacheOptions.text.maxSize,
        this.userSettings.settings.cacheOptions.text.expirationTime
      );
      this.ui = new UIManager(this);
      this.cache.optimizeStorage();
      this.setupRootObserver();
    }
    async translate(
      text,
      targetElement,
      isAdvanced = false,
      popup = false,
      targetLang = ""
    ) {
      try {
        if (!text) return null;
        const settings = this.userSettings.settings.displayOptions;
        const targetLanguage = targetLang || settings.targetLanguage;
        const promptType = isAdvanced ? "advanced" : "normal";
        const prompt = this.createPrompt(text, promptType, targetLanguage);
        let translatedText;
        const cacheEnabled =
          this.userSettings.settings.cacheOptions.text.enabled;
        if (cacheEnabled) {
          translatedText = this.cache.get(text, isAdvanced, targetLanguage);
        }
        if (!translatedText) {
          translatedText = await this.api.request(prompt, 'page');
          if (cacheEnabled && translatedText) {
            this.cache.set(text, translatedText, isAdvanced, targetLanguage);
          }
        }
        if (
          translatedText &&
          targetElement &&
          !targetElement.isPDFTranslation
        ) {
          if (isAdvanced || popup) {
            if (settings.translationMode !== "translation_only") {
              const translations = translatedText.split("\n");
              let fullTranslation = "";
              let pinyin = "";
              for (const trans of translations) {
                const parts = trans.split("<|>");
                pinyin += (parts[1]?.trim() || "") + "\n";
                fullTranslation += (parts[2]?.trim() || trans) + "\n";
              }
              this.ui.displayPopup(
                fullTranslation.trim(),
                text.trim(),
                "King1x32 <3",
                pinyin.trim()
              );
            } else {
              this.ui.displayPopup(translatedText, '', "King1x32 <3");
            }
          } else {
            this.ui.showTranslationBelow(translatedText, targetElement, text);
          }
        }
        return translatedText;
      } catch (error) {
        console.error("Error translation:", error);
        this.ui.showNotification(error.message, "error");
      }
    }
    async translateFile(file) {
      try {
        if (!this.fileManager.isValidFormat(file)) {
          throw new Error(this._("notifications.unsupport_file") + ' txt, srt, vtt, pdf, html, md, json');
        }
        if (!this.fileManager.isValidSize(file)) {
          throw new Error(this._("notifications.file_too_large"));
        }
        return await this.fileManager.processFile(file);
      } catch (error) {
        throw new Error(this._("notifications.file_translation_error") + ` ${error.message}`);
      }
    }
    //     async detectContext(text) {
    //       const prompt = `Analyze the context and writing style of this text and return JSON format with these properties:
    // - style: formal/informal/technical/casual
    // - tone: professional/friendly/neutral/academic
    // - domain: general/technical/business/academic/other
    // Text: "${text}"`;
    //       try {
    //         const analysis = await this.translator.api.request(prompt, "page");
    //         const result = JSON.parse(analysis);
    //         return {
    //           style: result.style,
    //           tone: result.tone,
    //           domain: result.domain
    //         };
    //       } catch (error) {
    //         console.error("Context detection failed:", error);
    //         return {
    //           style: "neutral",
    //           tone: "neutral",
    //           domain: "general"
    //         };
    //       }
    //     }
    // async autoCorrect(translation) {
    //   const targetLanguage =
    //     this.userSettings.settings.displayOptions.targetLanguage;
    //   const prompt = `Vui lòng kiểm tra và sửa chữa bất kỳ lỗi ngữ pháp hoặc vấn đề về ngữ cảnh trong bản dịch sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}' này: "${translation}". Không thêm hay bớt ý của bản gốc cũng như không thêm tiêu đề, không giải thích về các thay đổi đã thực hiện.`;
    //   try {
    //     const corrected = await this.api.request(prompt, 'page');
    //     return corrected.trim();
    //   } catch (error) {
    //     console.error("Auto-correction failed:", error);
    //     return translation;
    //   }
    // }
    createPrompt(text, type = "normal", targetLang = "") {
      const docTitle = `"${document.title}"`;
      const settings = this.userSettings.settings;
      const targetLanguage =
        targetLang || settings.displayOptions.targetLanguage;
      const sourceLanguage = settings.displayOptions.sourceLanguage;
      const isPinyinMode =
        settings.displayOptions.translationMode !== "translation_only";
      if (
        settings.promptSettings?.enabled &&
        settings.promptSettings?.useCustom
      ) {
        const prompts = settings.promptSettings.customPrompts;
        const promptKey = isPinyinMode ? `${type}_chinese` : type;
        let promptTemplate = prompts[promptKey];
        if (promptTemplate) {
          return promptTemplate
            .replace(/{text}/g, text)
            .replace(/{docTitle}/g, docTitle)
            .replace(/{targetLang}/g, targetLanguage)
            .replace(
              /{sourceLang}/g,
              sourceLanguage || this.page.languageCode
            );
        }
      }
      return this.createDefaultPrompt(text, type, isPinyinMode, targetLanguage);
    }
    createDefaultPrompt(
      text,
      type = "normal",
      isPinyinMode = false,
      targetLang = ""
    ) {
      const docTitle = `có tiêu đề "${document.title}"` || 'ở phía dưới';
      const settings = this.userSettings.settings;
      const targetLanguage = targetLang || settings.displayOptions.targetLanguage;
      const share_per = `  - Ngôn ngữ đích: '${targetLanguage}'.
  - Dựa vào ngữ cảnh, bối cảnh và chủ đề ${docTitle} để xác định phong cách dịch.
  - Đảm bảo nghĩa của các câu không bị thay đổi khi dịch.
  - Sử dụng các từ lóng hoặc cụm từ thông dụng khi cần thiết để bản dịch gần gũi với người đọc.
  - Kiểm tra chính tả và ngữ pháp trong bản dịch.
  - Thêm các trợ từ ngôn ngữ có mã ngôn ngữ là '${targetLanguage}' khi cần để câu văn hoàn chỉnh hơn.
  - Sử dụng đại từ nhân xưng ngôn ngữ có mã ngôn ngữ là '${targetLanguage}' tự nhiên và hợp ngữ cảnh.
  - Tham khảo các trang web sau để lấy văn phong phù hợp cho các đoạn truyện liên quan đến sex: [truyensex.moe, truyensexvn.org, truyensex.vip, truyensextv69.com].
`;
      const share_normal = `Bạn là người dịch thuật chuyên nghiệp, chuyên tạo bản dịch chính xác và tự nhiên. Hãy dịch văn bản cần xử lý ${docTitle} sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}' với các yêu cầu sau:
  - Ngôn ngữ đích: '${targetLanguage}'.
  - Dựa vào ngữ cảnh, bối cảnh và chủ đề ${docTitle} để xác định phong cách dịch.
  - Dịch phải tuân thủ chặt chẽ bối cảnh và sắc thái ban đầu của văn bản.
  - Đảm bảo sự lưu loát và tự nhiên như người bản xứ.
  - Không thêm bất kỳ giải thích hay diễn giải nào ngoài bản dịch.
  - Bảo toàn các thuật ngữ và danh từ riêng với tỷ lệ 1:1.
Nếu bạn nhận thấy văn bản là truyện thì hãy dịch truyện theo yêu cầu sau:
  Bạn là một người dịch truyện chuyên nghiệp, chuyên tạo bản dịch chính xác và tự nhiên. Bạn cần dịch một đoạn truyện ${docTitle} sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}'. Hãy đảm bảo rằng bản dịch của bạn giữ nguyên ý nghĩa của câu gốc và phù hợp với văn phong của ngôn ngữ đích. Khi dịch, hãy chú ý đến ngữ cảnh văn hóa và bối cảnh của câu chuyện để người đọc có thể hiểu chính xác nội dung. Các quy tắc quan trọng bạn cần tuân thủ bao gồm:
${share_per}
`;
      const note_normal = `Lưu ý:
  - Bản dịch phải hoàn toàn là ngôn ngữ có mã ngôn ngữ là '${targetLanguage}', nhưng ví dụ khi dịch sang tiếng Việt nếu gặp những danh từ riêng chỉ địa điểm hoặc tên riêng, có phạm trù trong ngôn ngữ là từ ghép của 2 ngôn ngữ gọi là từ Hán Việt, hãy dịch sang nghĩa từ Hán Việt như Diệp Trần, Lục Thiếu Du, Long kiếm, Thiên kiếp, núi Long Sĩ Đầu, ngõ Nê Bình, Thiên Kiếm môn,... thì sẽ hay hơn là dịch hẳn sang nghĩa tiếng Việt là Lá Trần, Rồng kiếm, Trời kiếp, núi Rồng Ngẩng Đầu,...
  - Hãy in ra bản dịch mà không có dấu ngoặc kép, giữ nguyên định dạng phông chữ ban đầu và không giải thích gì thêm.
`;
      const share_text = `Văn bản cần dịch:
\`\`\`
  ${text}
\`\`\`
`;
      const share_ocr = `Bạn là một người dịch truyện chuyên nghiệp, chuyên tạo bản dịch chính xác và tự nhiên. Bạn cần dịch một đoạn truyện ${docTitle} sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}'. Hãy đảm bảo rằng bản dịch của bạn giữ nguyên ý nghĩa của câu gốc và phù hợp với văn phong của ngôn ngữ đích. Khi dịch, hãy chú ý đến ngữ cảnh văn hóa và bối cảnh của câu chuyện để người đọc có thể hiểu chính xác nội dung. Các quy tắc quan trọng bạn cần tuân thủ bao gồm:
${share_per}
`;
      const share_media = `Bạn là một người dịch phụ đề phim chuyên nghiệp, chuyên tạo file SRT. Bạn cần dịch một đoạn hội thoại phim ${docTitle} sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}'. Hãy đảm bảo rằng bản dịch của bạn chính xác và tự nhiên, giữ nguyên ý nghĩa của câu gốc. Khi dịch, hãy chú ý đến ngữ cảnh văn hóa và bối cảnh của bộ phim để người xem có thể hiểu chính xác nội dung. Các quy tắc quan trọng bạn cần tuân thủ bao gồm:
${share_per}
`;
      const share_pinyin = `
Hãy trả về theo format sau, mỗi phần cách nhau bằng dấu <|> và không giải thích thêm:
  Văn bản gốc <|> phiên âm IPA <|> bản dịch sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}'
  Ví dụ: Hello <|> heˈloʊ <|> Xin chào
`;
      const note_pinyin = `Lưu ý:
  - Nếu có từ là tiếng Trung, hãy trả về giá trị phiên âm của từ đó chính là pinyin + số tone (1-4) của từ đó. Ví dụ: 你好 <|> Nǐ3 hǎo3 <|> Xin chào
  - Bản dịch phải hoàn toàn là ngôn ngữ có mã ngôn ngữ là '${targetLanguage}', nhưng ví dụ khi dịch sang tiếng Việt nếu gặp những danh từ riêng chỉ địa điểm hoặc tên riêng, có phạm trù trong ngôn ngữ là từ ghép của 2 ngôn ngữ gọi là từ Hán Việt, hãy dịch sang nghĩa từ Hán Việt như Diệp Trần, Lục Thiếu Du, Long kiếm, Thiên kiếp, núi Long Sĩ Đầu, ngõ Nê Bình, Thiên Kiếm môn,... thì sẽ hay hơn là dịch hẳn sang nghĩa tiếng Việt là Lá Trần, Rồng kiếm, Trời kiếp, núi Rồng Ngẩng Đầu,...
  - Chỉ trả về bản dịch theo format trên, mỗi 1 cụm theo format sẽ ở 1 dòng, giữ nguyên định dạng phông chữ ban đầu và không giải thích thêm.
`;
      const basePrompts = {
        normal: `${share_normal}
${note_normal}
${share_text}`,
        advanced: `Dịch và phân tích từ khóa: ${text}`,
        ocr: `${share_ocr}
Lưu ý:
  - Bản dịch phải hoàn toàn là ngôn ngữ có mã ngôn ngữ là '${targetLanguage}', nhưng ví dụ khi dịch sang tiếng Việt nếu gặp những danh từ riêng chỉ địa điểm hoặc tên riêng, có phạm trù trong ngôn ngữ là từ ghép của 2 ngôn ngữ gọi là từ Hán Việt, hãy dịch sang nghĩa từ Hán Việt như Diệp Trần, Lục Thiếu Du, Long kiếm, Thiên kiếp, núi Long Sĩ Đầu, ngõ Nê Bình, Thiên Kiếm môn,... thì sẽ hay hơn là dịch hẳn sang nghĩa tiếng Việt là Lá Trần, Rồng kiếm, Trời kiếp, núi Rồng Ngẩng Đầu,..
  - Đọc hiểu thật kĩ và xử lý toàn bộ văn bản trong hình ảnh.
  - Chỉ trả về bản dịch, không giải thích.`,
        media: `${share_media}
Lưu ý:
  - Bản dịch phải hoàn toàn là ngôn ngữ có mã ngôn ngữ là '${targetLanguage}', nhưng ví dụ khi dịch sang tiếng Việt nếu gặp những danh từ riêng chỉ địa điểm hoặc tên riêng, có phạm trù trong ngôn ngữ là từ ghép của 2 ngôn ngữ gọi là từ Hán Việt, hãy dịch sang nghĩa từ Hán Việt như Diệp Trần, Lục Thiếu Du, Long kiếm, Thiên kiếp, núi Long Sĩ Đầu, ngõ Nê Bình, Thiên Kiếm môn,... thì sẽ hay hơn là dịch hẳn sang nghĩa tiếng Việt là Lá Trần, Rồng kiếm, Trời kiếp, núi Rồng Ngẩng Đầu,..
  - Định dạng bản dịch của bạn theo định dạng SRT và đảm bảo rằng mỗi đoạn hội thoại được đánh số thứ tự, có thời gian bắt đầu và kết thúc rõ ràng.
  - Chỉ trả về bản dịch, không giải thích.`,
        page: `${share_normal}
${note_normal}
  - Nếu có <-> làm phân cách giữa các văn bản thì hãy chỉ dịch văn bản giữa <-> và không thay đổi vị trí sự phân cách của <-> ở bản dịch trả về.
${share_text}`,
        file_content: `Bạn là một trợ lý dịch thuật chuyên nghiệp. Hãy dịch nội dung của tệp này sang ngôn ngữ có mã là '${targetLanguage}'. Cung cấp bản dịch toàn diện và chính xác của toàn bộ tài liệu/nội dung phương tiện, bảo toàn mọi thông tin và cấu trúc quan trọng.
Lưu ý:
- Chỉ trả về bản dịch hoàn chỉnh mà không có bất kỳ giải thích, tiêu đề hay văn bản bổ sung nào.
- Đảm bảo bản dịch có văn phong phù hợp với loại nội dung của tệp (ví dụ: formal cho tài liệu, conversational cho audio/video).`,
      };
      const pinyinPrompts = {
        normal: `${share_normal}
${share_pinyin}
${note_pinyin}
${share_text}`,
        advanced: `Dịch và phân tích từ khóa: ${text}`,
        ocr: `${share_ocr}
${share_pinyin}
${note_pinyin}
Đọc hiểu thật kĩ và xử lý toàn bộ văn bản trong hình ảnh.`,
        media: `${share_media}
Lưu ý:
  - Bản dịch phải hoàn toàn là ngôn ngữ có mã ngôn ngữ là '${targetLanguage}', nhưng ví dụ khi dịch sang tiếng Việt nếu gặp những danh từ riêng chỉ địa điểm hoặc tên riêng, có phạm trù trong ngôn ngữ là từ ghép của 2 ngôn ngữ gọi là từ Hán Việt, hãy dịch sang nghĩa từ Hán Việt như Diệp Trần, Lục Thiếu Du, Long kiếm, Thiên kiếp, núi Long Sĩ Đầu, ngõ Nê Bình, Thiên Kiếm môn,... thì sẽ hay hơn là dịch hẳn sang nghĩa tiếng Việt là Lá Trần, Rồng kiếm, Trời kiếp, núi Rồng Ngẩng Đầu,..
  - Định dạng bản dịch của bạn theo định dạng SRT và đảm bảo rằng mỗi đoạn hội thoại được đánh số thứ tự, có thời gian bắt đầu và kết thúc rõ ràng.
  - Chỉ trả về bản dịch, không giải thích.`,
        page: `${share_normal}
${share_pinyin}
${note_pinyin}
  - Nếu có <-> làm phân cách giữa các văn bản thì hãy chỉ dịch văn bản giữa <-> và không thay đổi vị trí sự phân cách của <-> ở bản dịch trả về.
${share_text}`,
        file_content: `Bạn là một trợ lý dịch thuật chuyên nghiệp. Hãy dịch nội dung của tệp này sang ngôn ngữ có mã là '${targetLanguage}'. Cung cấp bản dịch toàn diện và chính xác của toàn bộ tài liệu/nội dung phương tiện, bảo toàn mọi thông tin và cấu trúc quan trọng.
Hãy trả về theo format sau, mỗi phần cách nhau bằng dấu <|> và không giải thích thêm:
Văn bản gốc <|> phiên âm IPA <|> bản dịch sang ngôn ngữ có mã ngôn ngữ là '${targetLanguage}'
Lưu ý:
- Nếu có từ là tiếng Trung, hãy trả về giá trị phiên âm của từ đó chính là pinyin + số tone (1-4) của từ đó.
- Chỉ trả về bản dịch hoàn chỉnh theo format trên mà không có bất kỳ giải thích, tiêu đề hay văn bản bổ sung nào.
- Đảm bảo bản dịch có văn phong phù hợp với loại nội dung của tệp (ví dụ: formal cho tài liệu, conversational cho audio/video).`,
      };
      return isPinyinMode ? (pinyinPrompts[type] || basePrompts[type]) : basePrompts[type];
    }
    showSettingsUI() {
      const settingsUI = this.userSettings.createSettingsUI();
      this.ui.shadowRoot.appendChild(settingsUI);
    }
    cleanup() {
      console.log("Cleaning up Translator instance...");
      if (this.ui) this.ui.cleanup();
      if (this.input) this.input.cleanup();
      if (this.videoStreaming) this.videoStreaming.cleanup();
      if (this._rootObserver) {
        this._rootObserver.disconnect();
        this._rootObserver = null;
      }
      console.log("Translator instance cleaned up.");
    }
    setupRootObserver() {
      if (!this.ui.container) {
        console.warn("UI container not available for root observer.");
        return;
      }
      this._rootObserver = new MutationObserver(debounce(() => {
        if (!document.body.contains(this.ui.container)) {
          console.warn("King Translator root element removed from DOM. Re-initializing Translator.");
          this._rootObserver.disconnect();
          this.cleanup();
          setTimeout(() => {
            new Translator();
          }, 500);
        }
      }, 200));
      this._rootObserver.observe(document.body, { childList: true, subtree: true });
      console.log("Root observer set up for King Translator.");
    }
  }
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  function createFileInput(accept, onFileSelected) {
    return new Promise((resolve) => {
      const translator = window.translator;
      const _ = translator.userSettings._;
      const themeMode = translator.userSettings.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      const div = document.createElement('div');
      div.style.cssText = `
position: fixed;
top: 0;
left: 0;
width: 100vw;
height: 100vh;
background: rgba(0,0,0,0.5);
z-index: 2147483647;
display: flex;
justify-content: center;
align-items: center;
font-family: "GoMono Nerd Font", "Noto Sans", Arial;
`;
      const container = document.createElement('div');
      container.style.cssText = `
background: ${theme.background};
padding: 20px;
border-radius: 12px;
box-shadow: 0 4px 20px rgba(0,0,0,0.2);
display: flex;
flex-direction: column;
gap: 15px;
min-width: 300px;
border: 1px solid ${theme.border};
`;
      const title = document.createElement('div');
      title.style.cssText = `
color: ${theme.title};
font-size: 16px;
font-weight: bold;
text-align: center;
margin-bottom: 5px;
`;
      title.textContent = _("notifications.file_input_title");
      const inputContainer = document.createElement('div');
      inputContainer.style.cssText = `
display: flex;
flex-direction: column;
gap: 10px;
align-items: center;
`;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.cssText = `
padding: 8px;
border-radius: 8px;
border: 1px solid ${theme.border};
background: ${themeMode === 'dark' ? '#444' : '#fff'};
color: ${theme.text};
width: 100%;
cursor: pointer;
font-family: inherit;
font-size: 14px;
`;
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
display: flex;
gap: 10px;
justify-content: center;
margin-top: 10px;
`;
      const cancelButton = document.createElement('button');
      cancelButton.style.cssText = `
padding: 8px 16px;
border-radius: 8px;
border: none;
background: ${theme.button.close.background};
color: ${theme.button.close.text};
cursor: pointer;
font-size: 14px;
transition: all 0.2s ease;
font-family: inherit;
`;
      cancelButton.textContent = _("settings.cancel");
      cancelButton.onmouseover = () => {
        cancelButton.style.transform = 'translateY(-2px)';
        cancelButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      };
      cancelButton.onmouseout = () => {
        cancelButton.style.transform = 'none';
        cancelButton.style.boxShadow = 'none';
      };
      const translateButton = document.createElement('button');
      translateButton.style.cssText = `
padding: 8px 16px;
border-radius: 8px;
border: none;
background: ${theme.button.translate.background};
color: ${theme.button.translate.text};
cursor: pointer;
font-size: 14px;
transition: all 0.2s ease;
opacity: 0.5;
font-family: inherit;
`;
      translateButton.textContent = _("notifications.translate");
      translateButton.disabled = true;
      translateButton.onmouseover = () => {
        if (!translateButton.disabled) {
          translateButton.style.transform = 'translateY(-2px)';
          translateButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }
      };
      translateButton.onmouseout = () => {
        translateButton.style.transform = 'none';
        translateButton.style.boxShadow = 'none';
      };
      const cleanup = () => {
        div.remove();
        resolve();
      };
      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          translateButton.disabled = false;
          translateButton.style.opacity = '1';
        } else {
          translateButton.disabled = true;
          translateButton.style.opacity = '0.5';
        }
      });
      cancelButton.addEventListener('click', cleanup);
      translateButton.addEventListener('click', async () => {
        const file = input.files?.[0];
        if (file) {
          try {
            translateButton.disabled = true;
            translateButton.style.opacity = '0.5';
            translateButton.textContent = _("notifications.processing");
            await onFileSelected(file);
          } catch (error) {
            console.error('Error processing file:', error);
          }
          cleanup();
        }
      });
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(translateButton);
      inputContainer.appendChild(input);
      container.appendChild(title);
      container.appendChild(inputContainer);
      container.appendChild(buttonContainer);
      div.appendChild(container);
      translator.ui.shadowRoot.appendChild(div);
      div.addEventListener('click', (e) => {
        if (e.target === div) cleanup();
      });
    });
  }
  function createFileOrUrlInput(acceptedTypes, onInputSelected) {
    return new Promise((resolve) => {
      const translator = window.translator;
      const _ = translator.userSettings._;
      const themeMode = translator.userSettings.settings.theme;
      const theme = CONFIG.THEME[themeMode];
      const isDark = themeMode === "dark";
      const div = document.createElement('div');
      div.style.cssText = `
position: fixed;
top: 0;
left: 0;
width: 100vw;
height: 100vh;
background: rgba(0,0,0,0.5);
z-index: 2147483647;
display: flex;
justify-content: center;
align-items: center;
font-family: "GoMono Nerd Font", "Noto Sans", Arial;
`;
      const container = document.createElement('div');
      container.style.cssText = `
background: ${theme.background};
padding: 20px;
border-radius: 12px;
box-shadow: 0 4px 20px rgba(0,0,0,0.2);
display: flex;
flex-direction: column;
gap: 15px;
min-width: 350px;
max-width: 90vw;
border: 1px solid ${theme.border};
color: ${theme.text};
`;
      const title = document.createElement('div');
      title.style.cssText = `
color: ${theme.title};
font-size: 16px;
font-weight: bold;
text-align: center;
margin-bottom: 5px;
`;
      title.textContent = _("notifications.file_input_title");
      const modeToggle = document.createElement('div');
      modeToggle.style.cssText = `
display: flex;
justify-content: center;
margin-bottom: 15px;
gap: 10px;
`;
      const fileModeBtn = document.createElement('button');
      fileModeBtn.textContent = "File Local";
      fileModeBtn.style.cssText = `
padding: 8px 15px;
border-radius: 8px;
border: 1px solid ${theme.border};
background: ${isDark ? '#444' : '#eee'};
color: ${theme.text};
cursor: pointer;
font-size: 14px;
font-family: inherit;
transition: all 0.2s ease;
`;
      const urlModeBtn = document.createElement('button');
      urlModeBtn.textContent = "URL";
      urlModeBtn.style.cssText = fileModeBtn.style.cssText;
      modeToggle.appendChild(fileModeBtn);
      modeToggle.appendChild(urlModeBtn);
      const fileInputContainer = document.createElement('div');
      fileInputContainer.style.cssText = `
display: flex;
flex-direction: column;
gap: 10px;
align-items: center;
`;
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = acceptedTypes;
      fileInput.style.cssText = `
padding: 8px;
border-radius: 8px;
border: 1px solid ${theme.border};
background: ${isDark ? '#444' : '#fff'};
color: ${theme.text};
width: 100%;
cursor: pointer;
font-family: inherit;
font-size: 14px;
`;
      const urlInputContainer = document.createElement('div');
      urlInputContainer.style.cssText = `
display: none; /* Hidden by default */
flex-direction: column;
gap: 10px;
align-items: center;
`;
      const urlLabel = document.createElement('div');
      urlLabel.textContent = _("notifications.file_input_url_title");
      urlLabel.style.cssText = `color: ${theme.text}; font-size: 14px;`;
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.placeholder = _("notifications.file_input_url_placeholder");
      urlInput.style.cssText = `
padding: 8px;
border-radius: 8px;
border: 1px solid ${theme.border};
background: ${isDark ? '#444' : '#fff'};
color: ${theme.text};
width: 100%;
font-family: inherit;
font-size: 14px;
`;
      urlInputContainer.appendChild(urlLabel);
      urlInputContainer.appendChild(urlInput);
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
display: flex;
gap: 10px;
justify-content: center;
margin-top: 10px;
`;
      const cancelButton = document.createElement('button');
      cancelButton.style.cssText = `
padding: 8px 16px;
border-radius: 8px;
border: none;
background: ${theme.button.close.background};
color: ${theme.button.close.text};
cursor: pointer;
font-size: 14px;
transition: all 0.2s ease;
font-family: inherit;
`;
      cancelButton.textContent = _("settings.cancel");
      cancelButton.onmouseover = () => {
        cancelButton.style.transform = 'translateY(-2px)';
        cancelButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      };
      cancelButton.onmouseout = () => {
        cancelButton.style.transform = 'none';
        cancelButton.style.boxShadow = 'none';
      };
      const translateButton = document.createElement('button');
      translateButton.style.cssText = `
padding: 8px 16px;
border-radius: 8px;
border: none;
background: ${theme.button.translate.background};
color: ${theme.button.translate.text};
cursor: pointer;
font-size: 14px;
transition: all 0.2s ease;
opacity: 0.5;
font-family: inherit;
`;
      translateButton.textContent = _("notifications.translate");
      translateButton.disabled = true;
      translateButton.onmouseover = () => {
        if (!translateButton.disabled) {
          translateButton.style.transform = 'translateY(-2px)';
          translateButton.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
        }
      };
      translateButton.onmouseout = () => {
        translateButton.style.transform = 'none';
        translateButton.style.boxShadow = 'none';
      };
      const updateTranslateButtonState = () => {
        const hasFile = fileInput.files?.[0];
        const hasUrl = urlInput.value.trim().startsWith('http://') || urlInput.value.trim().startsWith('https://');
        translateButton.disabled = !(hasFile || hasUrl);
        translateButton.style.opacity = (hasFile || hasUrl) ? '1' : '0.5';
      };
      let currentMode = 'file'; // 'file' or 'url'
      const switchMode = (mode) => {
        currentMode = mode;
        if (mode === 'file') {
          fileInputContainer.style.display = 'flex';
          urlInputContainer.style.display = 'none';
          fileModeBtn.style.backgroundColor = isDark ? '#666' : '#ccc';
          urlModeBtn.style.backgroundColor = isDark ? '#444' : '#eee';
        } else {
          fileInputContainer.style.display = 'none';
          urlInputContainer.style.display = 'flex';
          urlModeBtn.style.backgroundColor = isDark ? '#666' : '#ccc';
          fileModeBtn.style.backgroundColor = isDark ? '#444' : '#eee';
        }
        updateTranslateButtonState();
      };
      fileModeBtn.addEventListener('click', () => switchMode('file'));
      urlModeBtn.addEventListener('click', () => switchMode('url'));
      fileInput.addEventListener('change', updateTranslateButtonState);
      urlInput.addEventListener('input', updateTranslateButtonState);
      const cleanup = () => {
        div.remove();
        resolve();
      };
      cancelButton.addEventListener('click', cleanup);
      translateButton.addEventListener('click', async () => {
        if (currentMode === 'file') {
          const file = fileInput.files?.[0];
          if (file) {
            try {
              translateButton.disabled = true;
              translateButton.style.opacity = '0.5';
              translateButton.textContent = _("notifications.processing");
              await onInputSelected(file);
            } catch (error) {
              console.error('Error processing file:', error);
            }
            cleanup();
          }
        } else {
          const url = urlInput.value.trim();
          if (url.startsWith('http://') || url.startsWith('https://')) {
            try {
              translateButton.disabled = true;
              translateButton.style.opacity = '0.5';
              translateButton.textContent = _("notifications.processing_url");
              await onInputSelected(url);
            } catch (error) {
              console.error('Error processing URL:', error);
            }
            cleanup();
          } else {
            translator.ui.showNotification(_("notifications.invalid_url_format"), "error");
            translateButton.disabled = false;
            translateButton.style.opacity = '1';
          }
        }
      });
      buttonContainer.appendChild(cancelButton);
      buttonContainer.appendChild(translateButton);
      fileInputContainer.appendChild(fileInput);
      container.appendChild(title);
      container.appendChild(modeToggle);
      container.appendChild(fileInputContainer);
      container.appendChild(urlInputContainer);
      container.appendChild(buttonContainer);
      div.appendChild(container);
      translator.ui.shadowRoot.appendChild(div);
      div.addEventListener('click', (e) => {
        if (e.target === div) cleanup();
      });
      switchMode('file');
    });
  }
  GM_registerMenuCommand("📄 Webpage Translation", async () => {
    const translator = window.translator;
    if (translator) {
      try {
        translator.ui.showTranslatingStatus();
        const result = await translator.page.translatePage();
        translator.ui.removeTranslatingStatus();
        if (result.success) {
          translator.ui.showNotification(result.message, "success");
        } else {
          translator.ui.showNotification(result.message, "warning");
        }
      } catch (error) {
        console.error("Page translation error:", error);
        translator.ui.showNotification(error.message, "error");
      } finally {
        translator.ui.removeTranslatingStatus();
      }
    }
  });
  GM_registerMenuCommand("🌐 Google Translate (Webpage)", () => {
    const translator = window.translator;
    if (translator) {
      if (!translator.userSettings.settings.pageTranslation.enableGoogleTranslate) {
        translator.ui.showNotification(translator.userSettings._("notifications.page_translation_disabled"), "warning");
        return;
      }
      translator.ui.triggerGooglePageTranslate();
    }
  });
  GM_registerMenuCommand("📸 OCR Region Translate", async () => {
    const translator = window.translator;
    if (translator) {
      try {
        const screenshot = await translator.ocr.captureScreen();
        if (!screenshot) {
          throw new Error(translator.userSettings._("notifications.un_cr_screen"));
        }
        translator.ui.showTranslatingStatus();
        const result = await translator.ocr.processImage(screenshot);
        translator.ui.removeTranslatingStatus();
        if (!result) {
          throw new Error(translator.userSettings._("notifications.un_pr_screen"));
        }
        translator.ui.formatTrans(result);
      } catch (error) {
        console.error("Screen translation error:", error);
        translator.ui.showNotification(error.message, "error");
      } finally {
        translator.ui.removeTranslatingStatus();
      }
    }
  });
  GM_registerMenuCommand("🖼️ Web Image Translate", () => {
    const translator = window.translator;
    if (translator) {
      translator.ui.startWebImageOCR();
    }
  });
  GM_registerMenuCommand("📚 Manga Web Translate", () => {
    const translator = window.translator;
    if (translator) {
      translator.ui.startMangaTranslation();
    }
  });
  GM_registerMenuCommand("📷 Image File Translate", async () => {
    const translator = window.translator;
    if (!translator) return;
    await createFileInput("image/*", async (file) => {
      try {
        translator.ui.showTranslatingStatus();
        const result = await translator.ocr.processImage(file);
        translator.ui.removeTranslatingStatus();
        translator.ui.formatTrans(result);
      } catch (error) {
        translator.ui.showNotification(error.message);
      } finally {
        translator.ui.removeTranslatingStatus();
      }
    });
  });
  GM_registerMenuCommand("🎵 Media File Translate", async () => {
    const translator = window.translator;
    if (!translator) return;
    await createFileInput("audio/*, video/*", async (file) => {
      try {
        translator.ui.showTranslatingStatus();
        await translator.media.processMediaFile(file);
        translator.ui.removeTranslatingStatus();
      } catch (error) {
        translator.ui.showNotification(error.message);
      } finally {
        translator.ui.removeTranslatingStatus();
      }
    });
  });
  GM_registerMenuCommand("📄 File Translate (pdf, srt, vtt, md, json, txt, html)", async () => {
    const translator = window.translator;
    if (!translator) return;
    const supportedFormats = RELIABLE_FORMATS.text.formats
      .map(f => `.${f.ext}`)
      .join(',');
    await createFileInput(supportedFormats, async (file) => {
      try {
        translator.ui.showTranslatingStatus();
        const result = await translator.translateFile(file);
        console.log(file.type);
        const blob = file.type === 'pdf' ? result : new Blob([result], { type: file.type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `king1x32_translated_${file.type.endsWith('pdf') ? file.name.replace(".pdf", ".html") : file.name}`;
        translator.ui.shadowRoot.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        translator.ui.removeTranslatingStatus();
        translator.ui.showNotification(translator.userSettings._("notifications.file_translated_success"), "success");
      } catch (error) {
        console.error(translator.userSettings._("notifications.file_translation_error"), error);
        translator.ui.showNotification(error.message, "error");
      } finally {
        translator.ui.removeTranslatingStatus();
      }
    });
  });
  GM_registerMenuCommand("🌐 Translate VIP", async () => {
    const translator = window.translator;
    if (translator) {
      translator.ui.handleGeminiFileOrUrlTranslation();
    }
  });
  GM_registerMenuCommand("⚙️ King Translator AI Settings", () => {
    const translator = window.translator;
    if (translator) {
      const settingsUI = translator.userSettings.createSettingsUI();
      translator.ui.shadowRoot.appendChild(settingsUI);
    }
  });
  new Translator();
})();
