import type { Metadata } from "next";
import "@/app/globals.css";

export const metadata: Metadata = {
  title: "Voice Structured Entry MVP",
  description: "Marathi and English mixed voice-based structured data entry"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
