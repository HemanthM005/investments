interface ParsedMessage {
  raw_text: string;
  type: 'expense' | 'income' | 'payment' | 'transfer' | 'subscription' | 'unknown';
  amount?: number;
  currency: 'INR' | 'USD';
  date: string; // YYYY-MM-DD
  category?: string; // Food, Travel, Shopping, Bills, Entertainment, etc.
  description: string;
  person_name?: string; // who paid or who this is for
  payment_method?: string; // UPI, Card, Bank Transfer, Cash, etc.
  account_name?: string; // if mentioned (HDFC, ICICI, Paytm, etc.)
  confidence: number; // 0-1, how confident the parser is
}

export async function POST(req: Request) {
  try {
    const { message_text } = await req.json();

    if (!message_text || typeof message_text !== 'string') {
      return Response.json({ error: 'message_text is required' }, { status: 400 });
    }

    const prompt = `You are a financial data extraction assistant. Parse the following SMS/notification message and extract financial information.

Message: "${message_text}"

Extract and return ONLY a JSON object with these fields (use null for missing data):
{
  "type": "expense" | "income" | "payment" | "transfer" | "subscription" | "unknown",
  "amount": number or null,
  "currency": "INR" or "USD",
  "date": "YYYY-MM-DD" (today if not mentioned),
  "category": "string" or null (Food, Travel, Shopping, Bills, Entertainment, Utilities, Healthcare, etc.),
  "description": "clear summary",
  "person_name": "string or null (who paid, who received, or who this is for)",
  "payment_method": "string or null (UPI, Card, Bank Transfer, Cash, Wallet, etc.)",
  "account_name": "string or null (HDFC, ICICI, Paytm, GooglePay, etc.)",
  "confidence": number between 0 and 1
}

Guidelines:
- For Google Pay: type="payment", extract amount, person if visible
- For expense notifications: type="expense", extract category based on merchant
- For UPI transfers: type="transfer", extract person and amount
- For subscriptions: type="subscription" (Netflix, Amazon Prime, etc.)
- If amount is in rupees symbol (₹), use INR; if in $, use USD
- Date: extract from message or use today if not mentioned
- Confidence: 1 if clear, 0.5 if uncertain, 0.2 if just a notification

Return ONLY the JSON object, no markdown or extra text.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Groq API error:', errorData);
      throw new Error(`Groq API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const responseText = data.choices[0].message.content;

    let parsed: ParsedMessage;
    try {
      parsed = JSON.parse(responseText);
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
