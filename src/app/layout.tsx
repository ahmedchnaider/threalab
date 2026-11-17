import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { StoreProvider } from '@/context/StoreContext';
import { CartProvider } from '@/context/CartContext';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Threadlab — Custom Clothing Store & Studio',
  description: 'Design and print custom streetwear, t-shirts, hoodies, and totes.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen flex flex-col bg-[#f4f1ea] text-[#141414] antialiased">
        <ToastProvider>
          <AuthProvider>
            <StoreProvider>
              <CartProvider>
                <Header />
                <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
                  {children}
                </main>
              </CartProvider>
            </StoreProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
