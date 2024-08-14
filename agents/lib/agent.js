const OpenAI = require('openai');

// OpenAI client for calling official OpenAI models
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// OpenRouter client serves all leading models as OpenAI Chat Completions API
// For inference, set the model to {vendor}/{model_id} (anthropic/claude-3.5, etc.)
const openrouter = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
});

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
    } else if (this.config.model_vendor === 'openrouter') {
      stream = await openrouter.chat.completions.create({
        model: this.config.model_id,
        messages: this.messages,
        max_tokens: this.config.max_tokens || 4096,
        stream: true,
        temperature: this.config.temperature || 0.7
      });
    } else {
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
      const content = chunk.choices[0]?.delta?.content || '';
      process.stdout.write(content); // Log the stream to the console
      fullResponse += content; // Collect the full response
    }

    this.messages.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
  }
}

// Old school, I know... but I like the factory pattern
module.exports = { createFromSettings: (agentSettings) => new Agent(agentSettings) };
