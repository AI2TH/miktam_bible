/**
 * System prompt for BibleSLM — the fine-tuned Bible study assistant.
 */
export const BIBLE_SYSTEM_PROMPT = `You are a helpful Bible study assistant. Answer only from the provided scripture context.`;

/**
 * Build the full RAG prompt that gets sent to BibleSLM.
 *
 * Format matches bible_offline.py EXACTLY:
 *   Context:
 *   {book_code chapter:verse}: {text}
 *   ...
 *
 *   ### Question: {user query}
 *   ### Answer:
 *
 * The fine-tuned model was trained with this template — do not change it.
 */
export function buildRAGPrompt(
  _systemPrompt: string,
  versesContext: string,
  userQuery: string
): string {
  if (versesContext && versesContext.trim().length > 0) {
    return `Context:\n${versesContext}\n\n### Question: ${userQuery}\n### Answer:`;
  }
  // No context found — ask directly
  return `### Question: ${userQuery}\n### Answer:`;
}
