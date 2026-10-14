#!/usr/bin/env python3
"""KMP Hub · Extrai só a ESTRUTURA de uma página do ImmiAccount (campos,
tipos, obrigatório, visível) a partir do HTML copiado — sem nenhum valor
digitado, TRN, nome ou e-mail. O HTML bruto nunca é gravado.

Uso (macOS, com o HTML da página na área de transferência):
  pbpaste | python3 scripts/immi-page-skeleton.py
Grava import/immi-pages/pagina-NN.estrutura.txt (pasta fora do git).
"""
import html
import os
import re
import sys

raw = sys.stdin.read()

prog = re.search(r"<progress\b[^>]*>", raw)
v = re.search(r'value="(\d+)"', prog.group(0)) if prog else None
mx = re.search(r'max="(\d+)"', prog.group(0)) if prog else None
if not v:
    sys.exit("Não reconheci uma página do ImmiAccount no que foi copiado.")
pagina, total = int(v.group(1)), (mx.group(1) if mx else "?")


def limpa(s):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def escondido(attrs):
    sem_aspas = re.sub(r'"[^"]*"', "", attrs)
    return bool(re.search(r"\bhidden\b", sem_aspas)) or bool(
        re.search(r'style="[^"]*display:\s*none', attrs)
    )


def attr(attrs, nome):
    m = re.search(nome + r'="([^"]*)"', attrs)
    return m.group(1) if m else ""


# select antes de input/label/etc. para engolir as <option> inteiras
TOKEN = re.compile(
    r"<select\b([^>]*)>(.*?)</select>"
    r"|<textarea\b([^>]*)>"
    r"|<(h[1-4]|legend|label)\b([^>]*)>(.*?)</\4>"
    r"|<input\b([^>]*)>"
    r"|<(div|fieldset|section|span)\b([^>]*)>"
    r"|</(div|fieldset|section|span)>",
    re.S,
)

pilha = []  # um bool "escondido" por elemento aberto
linhas = []
grupos = {}
pergunta = ""
pergunta_obrig = False
rotulo_de = {}  # id do controle -> (texto, obrigatório)

# 1ª passada: rótulos <label for=...> (texto e asterisco de obrigatório)
for m in re.finditer(r'<label\b([^>]*\bfor="([^"]+)"[^>]*)>(.*?)</label>', raw, re.S):
    rotulo_de[m.group(2)] = (limpa(m.group(3)), "fa-asterisk" in m.group(3))

for m in TOKEN.finditer(raw):
    esc = any(pilha)
    estado = "escondido" if esc else "visível"
    if m.group(1) is not None:  # select
        cid = attr(m.group(1), "id")
        texto, obrig = rotulo_de.get(cid, ("(sem rótulo)", False))
        opcoes = [limpa(o) for o in re.findall(r"<option[^>]*>(.*?)</option>", m.group(2), re.S)]
        opcoes = [o for o in opcoes if o]
        detalhe = f"lista, {len(opcoes)} opções"
        if len(opcoes) <= 12:
            detalhe += ": " + " | ".join(opcoes)
        linhas.append(f"[{estado}] {'*' if obrig else ' '} {texto} — {detalhe}")
    elif m.group(3) is not None:  # textarea
        cid = attr(m.group(3), "id")
        texto, obrig = rotulo_de.get(cid, ("(sem rótulo)", False))
        linhas.append(f"[{estado}] {'*' if obrig else ' '} {texto} — texto longo")
    elif m.group(4) is not None:  # heading / legend / label
        tag, inner = m.group(4), m.group(6)
        if tag == "label" and re.search(r'type="(radio|checkbox)"', inner):
            ti = re.search(r'type="(radio|checkbox)"', inner).group(1)
            nome = attr(inner, "name")
            opcao = limpa(re.sub(r"<input[^>]*>", "", inner))
            if nome not in grupos:
                grupos[nome] = {"q": pergunta, "obrig": pergunta_obrig, "ops": [], "tipo": ti, "estado": estado}
                linhas.append(("grupo", nome))
            grupos[nome]["ops"].append(opcao)
        elif tag == "legend":
            t = limpa(inner)
            if t:
                pergunta = t
                pergunta_obrig = "fa-asterisk" in inner
        elif tag.startswith("h"):
            t = limpa(inner)
            if t:
                linhas.append(f"\n## {t}  [{estado}]")
    elif m.group(7) is not None:  # input solto
        a = m.group(7)
        tipo = attr(a, "type") or "text"
        if tipo in ("hidden", "submit", "button", "radio", "checkbox"):
            continue
        cid = attr(a, "id")
        texto, obrig = rotulo_de.get(cid, ("(sem rótulo)", False))
        nome_tipo = {"email": "e-mail", "text": "texto"}.get(tipo, tipo)
        ml = attr(a, "maxlength")
        extra = f", máx. {ml}" if ml else ""
        linhas.append(f"[{estado}] {'*' if obrig else ' '} {texto} — {nome_tipo}{extra}")
    elif m.group(8) is not None:
        pilha.append(escondido(m.group(9)))
    elif m.group(10) is not None:
        if pilha:
            pilha.pop()

saida = [f"PÁGINA {pagina}/{total}  (* = obrigatório; [escondido] = só aparece conforme outra resposta)", ""]
for l in linhas:
    if isinstance(l, tuple):
        g = grupos[l[1]]
        q = g["q"] or "(sem pergunta)"
        saida.append(f"[{g['estado']}] {'*' if g['obrig'] else ' '} {q} — {'marcar vários' if g['tipo'] == 'checkbox' else 'escolher uma'}: {' | '.join(g['ops'])}")
    else:
        saida.append(l)

pasta = os.path.join("import", "immi-pages")
os.makedirs(pasta, exist_ok=True)
destino = os.path.join(pasta, f"pagina-{pagina:02d}.estrutura.txt")
with open(destino, "w", encoding="utf-8") as f:
    f.write("\n".join(saida) + "\n")
print(f"Página {pagina}/{total} salva — só a estrutura, sem dados ({destino})")
