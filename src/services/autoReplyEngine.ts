/**
 * @file src/services/autoReplyEngine.ts
 * @description Keyword-matching contextual auto-responder engine for Service Providers.
 * When enabled by a provider, analyzes inbound customer messages in real-time and produces
 * personalized, professional responses tailored to the provider's domain, rating, and fee.
 * 
 * Target Roles: Provider feature, serving Customer inbound messages.
 * Closely depended on by: services/dataService.ts (during dbService.sendMessage).
 */

import { ChatMessage, ProviderProfile } from '../types';

/**
 * Service Provider Auto-Reply Bot Engine
 * Evaluates incoming user messages and produces an automated contextual reply if enabled.
 * 
 * Business Rules:
 * 1. Greeting intent (short greetings under 30 chars): Responds with a cordial welcoming message.
 * 2. Service/pricing/timing inquiry: Injects provider's name, title, starting fee, and rating.
 * 3. General message fallback: Acknowledges receipt and indicates the provider will reply shortly.
 * 
 * @param userMessageText - Raw message text sent by the customer.
 * @param provider - Provider metadata including name, title, starting price, and rating.
 * @param threadId - Identifier of the active conversation thread.
 * @param providerId - Unique identifier of the provider sending the auto-reply.
 * @returns ChatMessage object tagged with isAutoReply=true, or null.
 */
export function generateAutoReply(
  userMessageText: string,
  provider: { name: string; title: string; startingPrice: number; rating: number },
  threadId: string,
  providerId: string
): ChatMessage | null {
  // Normalize inbound text for case-insensitive keyword token matching
  const textLower = userMessageText.toLowerCase().trim();

  // Pattern 1: Greeting detection (e.g., 'hi', 'hello', 'hey', 'good morning')
  const greetingRegex = /\b(hi|hello|hey|greetings|good morning|good afternoon|good evening)\b/i;
  
  // Pattern 2: Inquiry detection (pricing, availability, booking, service terms, domain keywords)
  const inquiryRegex = /\b(available|availability|price|cost|rate|fee|charge|when|book|appointment|timing|schedule|slot|tax|gst|itr|audit|consultation)\b/i;

  let replyText = '';

  // Rule 1: Short introductory greeting triggers immediate cordial welcoming reply
  if (greetingRegex.test(textLower) && textLower.length < 30) {
    replyText = `Hello! Thank you for reaching out to ${provider.name}, ${provider.title}. How can I assist you with your financial or tax requirements today?`;
  } else if (inquiryRegex.test(textLower)) {
    // Rule 2: Inquiries regarding rates, schedules, or services receive personalized credentials quote
    replyText = `Thank you for your inquiry regarding my ${provider.title} services. My standard consultation and service rates start at ₹${provider.startingPrice.toLocaleString('en-IN')}. I hold a ${provider.rating}★ user rating. You can share your specific details here or book an appointment directly!`;
  } else {
    // Rule 3: General fallback acknowledgment for complex or detailed inquiries
    replyText = `Thank you for messaging ${provider.name}. I have received your request and will review your details to reply personally as soon as possible.`;
  }

  // Construct standard ChatMessage schema tagged as an automated bot reply
  return {
    id: `msg_auto_${Date.now()}`,
    threadId,
    senderId: providerId,
    senderName: `${provider.name} (Auto-Reply)`,
    text: replyText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    isAutoReply: true
  };
}

