import { NextResponse } from 'next/server';
import { createConversation, listConversations } from '@/lib/conversations';

export async function GET() {
  try {
    const conversations = await listConversations();
    return NextResponse.json(conversations);
  } catch (error) {
    console.error('[coach/conversations] GET', error);
    return NextResponse.json({ error: 'Impossible de charger les conversations' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { messages } = body as { messages?: unknown };
    const conversation = await createConversation(messages);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error('[coach/conversations] POST', error);
    return NextResponse.json({ error: 'Création de la conversation impossible' }, { status: 500 });
  }
}
