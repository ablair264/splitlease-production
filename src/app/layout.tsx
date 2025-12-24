import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";

const monaSans = localFont({
  src: "../../public/MonaSans-VariableFont_wdth,wght.ttf",
  variable: "--font-mona-sans",
});

export const metadata: Metadata = {
  title: "Broker Platform",
  description: "AI-powered lead management for vehicle leasing brokers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={monaSans.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
