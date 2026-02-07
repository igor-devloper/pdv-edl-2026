import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

const mulish = Mulish({
  subsets: ["latin-ext"],
  display: "swap",
});



export const metadata: Metadata = {
  title: '"PDV" EDL',
  description: "Sistema de venda EDL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${mulish.className}  antialiased`}>
           <Toaster richColors/>
          {children}
        </body>
      </html>
    </ClerkProvider>  
  );
}
