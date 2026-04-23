import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "vit.social - Connect at VIT",
  description: "The social network for VIT students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="m-0 min-h-full p-0 bg-[#E7EBF2] text-[#1C1E21] antialiased">{children}</body>
    </html>
  );
}
