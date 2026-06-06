import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "git-map",
  description:
    "Interactive 2D map of any GitHub repo's branch/commit topology.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon_32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/icon_16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/icons/icon_180x180.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-background text-foreground">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#000000",
              color: "#ffffff",
              border: "1px solid #ffffff",
              borderRadius: 0,
              fontFamily: "var(--font-geist-mono)",
              fontSize: "12px",
            },
          }}
        />
      </body>
    </html>
  );
}
