interface ParsedMessage {
  raw_text: string;
  type:
    | 'expense'          // real spending — money left your net worth
    | 'card_payment'     // paying a credit card bill — a transfer, NOT new spending
    | 'account_transfer' // moving money between your own accounts
    | 'income'
    | 'payment'          // paying a person
    | 'transfer'         // money to/from a person
    | 'subscription'
    | 'unknown';
  amount?: number;
  currency: 'INR' | 'USD';
  date: string; // YYYY-MM-DD
  category?: string; // Food, Travel, Shopping, Bills, Entertainment, etc.
  description: string;
  person_name?: string; // who paid or who this is for
  payment_method?: string; // UPI, Card, Bank Transfer, Cash, etc.
  account_name?: string; // if mentioned (HDFC, ICICI, Paytm, etc.)
  from_account?: string; // source account for a transfer or card payment
  to_account?: string;   // destination account (the card being paid, etc.)
  confidence: number; // 0-1, how confident the parser is
}

/**
 * Models sometimes wrap JSON in ```json fences or add a sentence around it.
 * Pull out the outermost {...} so those responses still parse.
 */
function extractJson(text: string): string {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  return start !== -1 && end > start ? trimmed.slice(start, end + 1) : trimmed;
}

export async function POST(req: Request) {
  try {
    const { message_text } = await req.json();

    if (!message_text || typeof message_text !== 'string') {
      return Response.json({ error: 'message_text is required' }, { status: 400 });
    }

    const prompt = `You are a financial data extraction assistant for a personal finance app.
Parse the SMS/notification below and decide what it actually represents.

Message: "${message_text}"

THE MOST IMPORTANT DISTINCTION — is this new spending, or just moving money?

- Paying a CREDIT CARD BILL is NOT an expense. The purchases on that card were
  already recorded as expenses when they happened; counting the bill payment
  again would double-count it. It moves money from a bank account to the card.
  → type "card_payment", from_account = the bank paying, to_account = the card.
  Phrases: "payment received", "bill paid", "credit card payment", "autopay",
  "paid towards your card", "CRED", "BBPS".

- Moving money between YOUR OWN accounts (savings → wallet, bank → FD,
  self transfer) is also not spending. → type "account_transfer", with
  from_account and to_account.

- Only money genuinely leaving your net worth to a merchant is "expense".

Return ONLY a JSON object (use null for anything missing):
{
  "type": "expense" | "card_payment" | "account_transfer" | "income" | "payment" | "transfer" | "subscription" | "unknown",
  "amount": number or null,
  "currency": "INR" or "USD",
  "date": "YYYY-MM-DD" (today if not stated),
  "category": string or null (Food, Groceries, Travel, Shopping, Entertainment, Bills, Health, Education, Rent, Subscriptions, Other),
  "description": "clear short summary",
  "person_name": string or null (only for money to/from a PERSON),
  "payment_method": string or null (UPI, Card, Bank Transfer, Cash, Wallet, NEFT, IMPS),
  "account_name": string or null (the account the message is about),
  "from_account": string or null (where money left, for transfers and card payments),
  "to_account": string or null (where money arrived, e.g. the card being paid),
  "confidence": number between 0 and 1
}

More rules:
- Merchant purchase on a card → "expense", account_name = that card.
- Netflix/Prime/Spotify style recurring charge → "subscription".
- Money sent to or received from a named person → "payment" or "transfer",
  and set person_name.
- Salary or refund arriving → "income".
- Credit to a credit card account is almost always a bill payment, not income.
- Amounts like "2,45,600.00" are Indian formatting → 245600.
- If you cannot tell, use "unknown" and a low confidence rather than guessing.

Return ONLY the JSON object, no markdown or extra text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        // gpt-oss is a reasoning model and its reasoning tokens are charged
        // against this budget. At 500 a long bank SMS spent the allowance on
        // reasoning and the JSON came back truncated mid-key.
        max_tokens: 3000,
        reasoning_effort: 'low',
        // Ask the server to guarantee syntactically valid JSON.
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const responseText: string = choice?.message?.content ?? '';

    if (choice?.finish_reason === 'length') {
      return Response.json(
        { error: 'Response was cut off before the JSON finished. Try a shorter message.', raw: responseText },
        { status: 502 }
      );
    }

    let parsed: ParsedMessage;
    try {
      parsed = JSON.parse(extractJson(responseText));
    } catch {
      return Response.json(
        { error: 'Failed to parse LLM response', raw: responseText },
        { status: 500 }
      );
    }

    parsed.raw_text = message_text;

    return Response.json({ success: true, data: parsed });
  } catch (error) {
    console.error('Parse message error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
