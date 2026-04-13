import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { text } = await req.json();
  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "system", content: "Trova 3 clausole rischiose in questo contratto e spiegale in modo semplice." },
               { role: "user", content: text }],
  });
  return NextResponse.json({ result: completion.choices[0].message.content });
}