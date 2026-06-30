import { NextResponse } from 'next/server';
import {
  deleteConversation,
  getConversation,
  renameConversation,
  saveConversationMessages,
} from '@/lib/conversations';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const conversation = await getConversation(id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
    }
    return NextResponse.json(conversation);
  } catch (error) {
    console.error('[coach/conversations/:id] GET', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { messages } = body as { messages?: unknown };
    const updated = await saveConversationMessages(id, messages);
    if (!updated) {
      return NextResponse.json({ error: 'Conversation introuvable' }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[coach/conversations/:id] PUT', error);
    return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const { title } = body as { title?: unknown };
    if (typeof title !== 'string') {
      return NextResponse.json({ error: 'Titre invalide' }, { status: 400 });
    }
    const updated = await renameConversation(id, title);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[coach/conversations/:id] PATCH', error);
    return NextResponse.json({ error: 'Renommage impossible' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteConversation(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[coach/conversations/:id] DELETE', error);
    return NextResponse.json({ error: 'Suppression impossible' }, { status: 500 });
  }
}
