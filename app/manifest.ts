import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tá no Banho",
    short_name: "Tá no Banho",
    description: "Reservas e acompanhamento dos cuidados do seu pet.",
    start_url: "/agendar",
    display: "standalone",
    background_color: "#f7fbfb",
    theme_color: "#008b95",
    icons: [
      { src: "/logo-ta-no-banho.jpeg", sizes: "512x512", type: "image/jpeg" },
    ],
  };
}
