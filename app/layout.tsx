import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DS Interview Trainer",
  description: "Interview-ready in 30 minutes a day. DS interview drill that adapts to you.",
};

const THEME_KEY = "ds-trainer-theme";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k="ds-trainer-theme";var t=localStorage.getItem(k);document.documentElement.dataset.theme=t==="light"?"light":"dark";})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
