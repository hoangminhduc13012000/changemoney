import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Dịch Vụ Đổi Tiền Lì Xì Tết - Đổi Tiền Cũ Thành Mới",
  description: "Dịch vụ đổi tiền lì xì Tết uy tín, chất lượng. Đổi tiền cũ thành mới với phí hợp lý, giao hàng tận nơi. Liên hệ Zalo: 0838182780",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
