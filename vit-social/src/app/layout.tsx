import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "vitsocial.xyz — Connect at VIT",
    template: "%s · vitsocial.xyz",
  },
  description:
    "A retro-inspired campus social network for VIT students. Google sign-in, profiles, friends and a friend-only feed.",
  applicationName: "vitsocial.xyz",
  keywords: ["VIT", "vit.edu", "student social network", "vitsocial"],
  authors: [{ name: "vitsocial.xyz contributors" }],
  openGraph: {
    title: "vitsocial.xyz",
    description: "Campus social network for VIT students.",
    type: "website",
    siteName: "vitsocial.xyz",
  },
};

export const viewport: Viewport = {
  themeColor: "#3b5998",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="m-0 min-h-full bg-[var(--fb-bg)] p-0 text-[var(--fb-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
