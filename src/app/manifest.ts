import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mes Loyers — Factures et reçus",
    short_name: "Mes Loyers",
    description: "Factures et reçus de loyer, envoyés sur WhatsApp, par SMS ou par e-mail.",
    lang: "fr",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f7",
    theme_color: "#047857",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
