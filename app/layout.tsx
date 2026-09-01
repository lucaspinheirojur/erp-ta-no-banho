import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://erp-ta-no-banho.pinheirolucas464.chatgpt.site"),
  title: "ERP Tá no Banho",
  description: "Gestão de clientes, pets, agenda, serviços, pacotes e pagamentos do Tá no Banho.",
  other: { "codex-preview": "development" },
  icons: { icon: "/logo-ta-no-banho.jpeg", shortcut: "/logo-ta-no-banho.jpeg", apple: "/logo-ta-no-banho.jpeg" },
  openGraph: {
    title: "ERP Tá no Banho",
    description: "Gestão cuidadosa para clientes e pets.",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "ERP Tá no Banho" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ERP Tá no Banho",
    description: "Gestão cuidadosa para clientes e pets.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>;
}
