const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } = require('@google/generative-ai');

// OpenAI client for calling official OpenAI models
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenRouter API is openai compatible
// For inference, set the model to {vendor}/{model_id} (anthropic/claude-3.5, etc.)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

// Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Google AI client
const googleAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);

class Agent {
  constructor(config) {
    this.config = config;
    this.messages = [{ role: 'system', content: this.config.system_prompt }];
  }

  async performInference(userMessage) {
    this.messages.push({ role: 'user', content: userMessage });

    let response;
    let stream;
    let fullResponse = '';

    if (this.config.model_vendor === 'openai') {
      stream = await openai.chat.completions.create({
        model: this.config.model_id,
        messages: this.messages,
        response_format: { type: this.config.response_format || 'text' },
        max_tokens: this.config.max_tokens || 4096,
        stream: true,
        temperature: this.config.temperature || 0.7
      });
    }
    else if (this.config.model_vendor == "anthropic") {
      stream = await anthropic.messages.stream({
        model: this.config.model_id,
        messages: this.messages,
        max_tokens: this.config.max_tokens || 4096,
        temperature: this.config.temperature || 0.7
      });
    }
    else if (this.config.model_vendor == "google") {
      const model = googleAI.getGenerativeModel({
        model: this.config.model_id,
        systemInstruction: this.messages[0].content,
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE
          }
        ]
      });
      
      const chat = model.startChat({
        history: this.messages.filter(x => x.role != "system").map(msg => ({ role: msg.role, parts: [{ text: msg.content }] })),
        generationConfig: {
          temperature: this.config.temperature || 0.7,
          maxOutputTokens: this.config.max_tokens || 4096
        }
      });
      const result = await chat.sendMessageStream(userMessage);
      stream = result.stream;
    }
    else if (this.config.model_vendor === 'openrouter') {
      stream = await openrouter.chat.completions.create({
        model: this.config.model_id,
        messages: this.messages,
        max_tokens: this.config.max_tokens || 4096,
        stream: true,
        temperature: this.config.temperature || 0.7,
      });
    } else {
      //Openrouter is our fallback and handles inference for model vendors we have not custom integrated. It is not ideal
      let openrouter_model = `${this.config.model_vendor}/${this.config.model_id}`;

      console.log(`[inference] Inference not yet implemented for model vendor ${this.config.model_vendor}`);
      console.log(`[inference] Loading ${openrouter_model} via OpenRouter gateway, un momento...`);

      stream = await openrouter.chat.completions.create({
        model: openrouter_model,
        messages: this.messages,
        max_tokens: this.config.max_tokens || 4096,
        stream: true,
        temperature: this.config.temperature || 0.7
      });
    }

    for await (const chunk of stream) {
      let content;
      if (this.config.model_vendor === 'anthropic') {
        content = chunk.delta?.text || '';
      } else if (this.config.model_vendor === 'google') {
        content = chunk.text() || '';
      } else {
        content = chunk.choices[0]?.delta?.content || '';
      }
      process.stdout.write(content); // Log the stream to the console
      fullResponse += content; // Collect the full response
    }

    this.messages.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
  }
}

// Old school, I know... but I like the factory pattern
module.exports = { createFromSettings: (agentSettings) => new Agent(agentSettings) };
