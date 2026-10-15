import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { destinoSeguro, tipoDoLink } from "@/lib/auth/link";

/**
 * Entrada do link de acesso por e-mail (portal e convites).
 *
 * GET mostra só uma página com o botão "Entrar": os verificadores de link do
 * Outlook/Hotmail abrem o link sozinhos antes da pessoa e gastavam o acesso
 * (que vale uma vez só) — eles não clicam em botões. O POST do botão é que
 * troca o token por sessão, em qualquer aparelho (token_hash).
 */

function escapar(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash") ?? "";
  const tipo = searchParams.get("type") ?? "";
  const next = destinoSeguro(searchParams.get("next"));
  const portal = next.startsWith("/portal");
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Entrar — KMP Hub</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#e2e3e5;font-family:Arial,Helvetica,sans-serif;color:#161814;">
<form method="post" action="/auth/confirm" style="background:#fff;border-radius:24px;padding:32px;max-width:360px;width:calc(100% - 32px);box-shadow:0 6px 24px rgba(22,24,20,.08);text-align:center;">
<img src="/kmp-logo-email-full.png" width="192" height="56" alt="KMP HUB CRM" style="display:block;margin:0 auto 20px;">
<h1 style="font-size:20px;margin:0 0 8px;">${portal ? "Entrar no portal do cliente" : "Entrar no KMP Hub"}</h1>
<p style="font-size:14px;line-height:1.5;color:#4a4c47;margin:0 0 20px;">Clique no botão para concluir o seu acesso.</p>
<input type="hidden" name="token_hash" value="${escapar(tokenHash)}">
<input type="hidden" name="type" value="${escapar(tipo)}">
<input type="hidden" name="next" value="${escapar(next)}">
<button type="submit" style="width:100%;background:#2b2d29;color:#fff;border:0;border-radius:999px;padding:12px 20px;font-size:15px;font-weight:bold;cursor:pointer;">Entrar</button>
</form></body></html>`;
  return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const form = await request.formData();
  const next = destinoSeguro(String(form.get("next") ?? ""));
  const loginDeVolta = next.startsWith("/portal") ? "/portal/login" : "/login";
  const tokenHash = String(form.get("token_hash") ?? "");
  const tipo = tipoDoLink(String(form.get("type") ?? ""));

  if (tokenHash && tipo) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(`${origin}${next}`, 303);
    console.error("[auth/confirm] verifyOtp falhou:", error.status, error.code, error.message);
  }
  return NextResponse.redirect(`${origin}${loginDeVolta}?link=expirado`, 303);
}
