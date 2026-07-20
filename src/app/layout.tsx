import type { Metadata } from "next";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme-cookie";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nudge",
  description: "A personal finance tracker that keeps you honest.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const theme = cookieStore.get(THEME_COOKIE)?.value;
  // "system" (or no cookie at all) means no override — the CSS falls back
  // to the prefers-color-scheme media query. Only light/dark set the
  // attribute, read server-side so there's no flash on first paint.
  const dataTheme = theme === "light" || theme === "dark" ? theme : undefined;

  return (
    <html lang="en" className="h-full antialiased" data-theme={dataTheme}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
