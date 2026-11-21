import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SesionProvider } from '@/components/sesion-provider';
import { obtenerUsuario } from '@/lib/dal';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Madlions',
  description: 'Plataforma de gestión de gimnasio y centro de entrenamiento',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await obtenerUsuario();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SesionProvider usuario={usuario}>{children}</SesionProvider>
      </body>
    </html>
  );
}
