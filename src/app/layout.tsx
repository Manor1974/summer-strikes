import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Summer Strikes — Free Bowling All Summer | Manor Lanes",
  description:
    "Register your kids (ages 2–15) for 2 free games of bowling every day at Manor Lanes — all summer long. June 1 through August 31.",
  openGraph: {
    title: "Summer Strikes — Free Bowling All Summer | Manor Lanes",
    description:
      "2 free games of bowling per day, per child. All summer. Ages 2–15.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
