
import { assistantFlow, assistantHistorySchema } from '@/ai/flows/assistant-flow';
import { run } from '@genkit-ai/flow';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { messages, data } = await req.json();

  // Validate the history
  const parseResult = assistantHistorySchema.safeParse(messages.slice(0, -1));
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid history' }, { status: 400 });
  }

  const history = parseResult.data;
  const message = messages[messages.length - 1].content;

  try {
    const output = await run(assistantFlow, {
      input: {
        history,
        message,
      },
    });
    return NextResponse.json({ message: output }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
