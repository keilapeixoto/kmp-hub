// Mede o tempo das telas principais da equipe, logado como usuários
// temporários de cada função (admin, consultor, operacional). Serve para
// achar quais telas sofrem com RLS lento, antes e depois de uma correção.
//
// Precisa do app rodando (de preferência build de produção:
// `npm run build && npm run start -- -p 3100`). Cria os usuários
// (@kmp.test), abre a sessão com link gerado pelo admin (sem e-mail) e
// apaga tudo no final. Imprime só rota, status HTTP e tempos — nenhum dado
// de cliente. O consultor e o operacional temporários não têm processos
// próprios: as telas deles medem o custo do RLS filtrando a base inteira.
//
// Uso: node scripts/measure-staff-pages.mjs [baseUrl=http://localhost:3100] [rodadas=3]
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3100";
const RODADAS = Number(process.argv[3] ?? 3);
const FUNCOES = (process.env.FUNCOES ?? "admin,consultant,operations").split(",");

const env = {};
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
}
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, opts);

// Ids para as telas de detalhe: cliente com mais documentos e processo com
// mais respostas de formulário (os casos mais pesados).
async function maisFrequente(tabela, coluna) {
  const contagem = new Map();
  for (let de = 0; ; de += 1000) {
    const { data } = await admin.from(tabela).select(coluna).range(de, de + 999);
    for (const r of data ?? []) if (r[coluna]) contagem.set(r[coluna], (contagem.get(r[coluna]) ?? 0) + 1);
    if (!data || data.length < 1000) break;
  }
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}

// A conexão com o Supabase às vezes cai por alguns segundos; tenta de novo.
async function comRetentativa(fn, vezes = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i >= vezes) throw e;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

async function sessaoComo(email) {
  const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`gerar link: ${error.code ?? error.message}`);
  const jar = new Map();
  const ssr = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (lista) => lista.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const { error: eOtp } = await ssr.auth.verifyOtp({ type: "magiclink", token_hash: link.properties.hashed_token });
  if (eOtp) throw new Error(`abrir sessão: ${eOtp.code ?? eOtp.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

async function medir(rota, cookie) {
  const tempos = [];
  let status = 0;
  let destino = "";
  for (let i = 0; i <= RODADAS; i++) {
    const t0 = performance.now();
    const res = await fetch(BASE + rota, { headers: { cookie }, redirect: "manual" });
    await res.text();
    status = res.status;
    destino = res.headers.get("location") ?? "";
    if (i > 0) tempos.push(Math.round(performance.now() - t0)); // 1ª é aquecimento
  }
  const media = Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length);
  return { status, media, tempos, destino: destino.replace(BASE, "").split("?")[0] };
}

const criados = [];
try {
  const clienteDocs = await maisFrequente("documents", "client_id");
  const { data: forms } = await admin.from("case_forms").select("id, case_id");
  const formMaisRespostas = await maisFrequente("case_form_responses", "case_form_id");
  const processoForm = forms?.find((f) => f.id === formMaisRespostas)?.case_id;

  const rotas = [
    "/inicio",
    "/clientes",
    "/processos",
    "/processos?view=kanban",
    "/processos?view=fila",
    "/tarefas",
    "/agenda",
    "/dashboard",
    clienteDocs && `/clientes/${clienteDocs}?tab=documentos`,
    clienteDocs && `/clientes/${clienteDocs}`,
    processoForm && `/processos/${processoForm}`,
  ].filter(Boolean);

  for (const funcao of FUNCOES) {
    const email = `medicao-telas-${funcao}-${randomUUID().slice(0, 8)}@kmp.test`;
    const { data, error } = await comRetentativa(() => admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { nome: `Medição telas ${funcao} (temporário)`, role: funcao },
    }).then((r) => {
      if (r.error && !r.error.status) throw r.error; // erro de rede: tenta de novo
      return r;
    }));
    if (error) throw new Error(`criar usuário: ${error.code ?? error.message}`);
    criados.push(data.user.id);
    const cookie = await comRetentativa(() => sessaoComo(email));

    console.log(`\n== ${funcao} (${RODADAS} rodadas, ms) ==`);
    for (const rota of rotas) {
      const r = await medir(rota, cookie);
      const rotulo = rota.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/, ":id");
      console.log(`${rotulo.padEnd(34)} ${String(r.status).padEnd(4)} média ${String(r.media).padStart(5)}   (${r.tempos.join(", ")})`);
    }
  }
} catch (e) {
  console.error("Falhou:", e.message);
  process.exitCode = 1;
} finally {
  for (const id of criados) {
    // Às vezes a primeira tentativa falha logo depois das requisições; a
    // segunda, alguns segundos depois, passa.
    let erro = null;
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      ({ error: erro } = await admin.auth.admin.deleteUser(id));
      if (!erro) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (erro) {
      console.error("Limpeza falhou para um usuário:", erro.status, erro.code ?? erro.message);
      process.exitCode = 1;
    }
  }
  console.log(`\nlimpeza concluída (${criados.length} usuários temporários removidos)`);
}
