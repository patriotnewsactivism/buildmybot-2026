import { Router, Request, Response } from 'express';
import { strictLimiter, authenticate, applyImpersonation, loadOrganizationContext, tenantIsolation } from '../middleware';

const router = Router();

const apiAuthStack = [authenticate, applyImpersonation, loadOrganizationContext, tenantIsolation];

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  model?: string;
  context?: string;
}

async function handleChatCompletion(req: Request, res: Response) {
  try {
    const { messages, systemPrompt, model = 'gpt-4o-mini', context } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not configured');
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const openAIMessages: any[] = [];

    if (systemPrompt) {
      let systemContent = systemPrompt;
      if (context) {
        systemContent += `\n\n### KNOWLEDGE BASE (Use this to answer):\n${context}\n\n### INSTRUCTIONS:\nAnswer strictly based on the provided Knowledge Base. If the answer is not in the text, state that you do not have that information.`;
      }
      openAIMessages.push({ role: 'system', content: systemContent });
    }

    messages.forEach(msg => {
      openAIMessages.push({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
      });
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: openAIMessages,
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('OpenAI API Error:', err);
      const errorCode = err.error?.code;
      const errorMessage = err.error?.message || response.statusText;

      if (errorCode === 'insufficient_quota') {
        return res.status(402).json({ error: 'OpenAI API quota exceeded. Please add credits to your OpenAI account.' });
      }
      if (errorCode === 'invalid_api_key') {
        return res.status(401).json({ error: 'Invalid OpenAI API key configuration.' });
      }
      if (errorCode === 'rate_limit_exceeded') {
        return res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      }
      return res.status(500).json({ error: errorMessage });
    }

    const data = await response.json();
    const responseText = data.choices[0]?.message?.content || '';

    res.json({ response: responseText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
}

router.post('/', ...apiAuthStack, handleChatCompletion);

router.post('/demo', strictLimiter, handleChatCompletion);

export default router;
