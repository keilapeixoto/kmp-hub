import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
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
    <html lang="pt-BR" className={plusJakartaSans.variable} suppressHydrationWarning>
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
