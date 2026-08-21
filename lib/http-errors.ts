import { NextResponse } from "next/server";

/** Respostas padronizadas para route handlers (app/api/**). Não substitui a
 * convenção de ActionError das server actions — só evita repetir
 * NextResponse.json({error}, {status}) em cada rota. */

export function unauthorized(message = "Não autorizado.") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Sem permissão.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Não encontrado.") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message = "Requisição inválida.") {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function tooManyRequests(message = "Muitas tentativas. Tente novamente mais tarde.") {
  return NextResponse.json({ error: message }, { status: 429 });
}
