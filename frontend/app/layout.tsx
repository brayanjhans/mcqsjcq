import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { Providers } from "./providers";

const montserrat = Montserrat({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
    metadataBase: new URL('https://mcqs-jcq.com'),
    title: {
        default: 'MCQS - JCQ',
        template: '%s | MCQS'
    },
    description: 'MCQS: Las grandes obras empiezan aquí. Michael Cesar Quispe Sebastian te conecta con las mejores estrategias en garantías y licitaciones para potenciar tu crecimiento en el sector.',
    keywords: [
        'MCQS', 'JCQ', 'MCQS-JCQ',
        'Michael Cesar Quispe Sebastian', 'Michael Cesar', 'Michael Quispe', 'Michael Quispe Sebastian',
        'Garantías', 'Licitaciones', 'Obra', 'Consultoría', 'Construcción'
    ],
    authors: [{ name: 'Michael Cesar Quispe Sebastian' }],
    creator: 'MCQS',
    icons: {
        icon: '/favicon-circle.png',
        shortcut: '/favicon-circle.png',
        apple: '/favicon-circle.png',
    },
    openGraph: {
        type: 'website',
        locale: 'es_PE',
        url: 'https://mcqs-jcq.com',
        title: 'MCQS - JCQ',
        description: 'MCQS: Las grandes obras empiezan aquí. Michael Cesar Quispe Sebastian te conecta con las mejores estrategias en garantías y licitaciones para potenciar tu crecimiento en el sector.',
        siteName: 'MCQS',
        images: [
            {
                url: '/mqs-logo-new.jpg',
                width: 800,
                height: 600,
                alt: 'MCQS Logo',
            },
        ],
    },
};

export const viewport: Viewport = {
    themeColor: '#0F2C4A',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es">
            <head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </head>
            <body className={montserrat.className}>
                <Providers>
                    {children}
                </Providers>
                <Script src="https://cdn.jsdelivr.net/npm/chart.js" strategy="beforeInteractive" />
            </body>
        </html >
    );
}
