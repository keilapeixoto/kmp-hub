import type { Metadata } from "next";
import { Montserrat, Outfit } from "next/font/google";
import "./globals.css";

// Outfit desde out/2026 (redesign âmbar; a mesma dos PDFs da KMP). Antes:
// Plus Jakarta Sans.
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
});

// Só para a marca "HUB CRM" ao lado do logo no cabeçalho.
const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["600", "800"],
  variable: "--font-montserrat",
});

export const metadata: Metadata = {
  title: "KMP Hub",
  description: "Plataforma operacional da KMP Consulting",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${outfit.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <head>
        {/* Aplica o tema salvo antes da primeira pintura, pra não piscar
            claro->escuro ao carregar a página (FOUC). Padrão é sempre claro
            até a pessoa escolher o escuro pelo menos uma vez — não segue o
            SO, pra não surpreender quem nunca mexeu no toggle. Só a equipe
            usa o toggle — o portal do cliente nunca escreve essa chave. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{if(localStorage.getItem("kmp-theme")==="dark"){document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="font-body">{children}</body>
    </html>
  );
}
