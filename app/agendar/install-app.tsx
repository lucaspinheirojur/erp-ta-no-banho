"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [showIos, setShowIos] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js");
    queueMicrotask(() =>
      setInstalled(
        window.matchMedia("(display-mode: standalone)").matches ||
          Boolean(
            (navigator as Navigator & { standalone?: boolean }).standalone,
          ),
      ),
    );
    const capture = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", capture);
    return () => window.removeEventListener("beforeinstallprompt", capture);
  }, []);

  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setPrompt(null);
      return;
    }
    setShowIos(true);
  }

  if (installed) return null;
  return (
    <>
      <button className="install-button" onClick={install}>
        Instalar aplicativo
      </button>
      {showIos && (
        <div
          className="install-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Como instalar o aplicativo"
        >
          <section>
            <button
              className="install-close"
              onClick={() => setShowIos(false)}
              aria-label="Fechar"
            >
              ×
            </button>
            <Image
              src="/logo-ta-no-banho.jpeg"
              alt="Tá no Banho"
              width={192}
              height={192}
              unoptimized
            />
            <p className="kicker">INSTALAR NO CELULAR</p>
            <h2>Adicione Tá no Banho à tela inicial</h2>
            <ol>
              <li>
                No iPhone, abra esta página pelo <b>Safari</b>.
              </li>
              <li>
                Toque no botão <b>Compartilhar</b> na barra do navegador.
              </li>
              <li>
                Escolha <b>Adicionar à Tela de Início</b> e confirme.
              </li>
            </ol>
            <p className="install-android">
              No Android, abra o menu do navegador e escolha{" "}
              <b>Instalar aplicativo</b> caso a instalação automática não
              apareça.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
