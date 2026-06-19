import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/app/components/providers/ThemeProvider"
import { Toaster } from "sonner"

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  title: {
    template: "%s · cesar cuapan",
    default: "cesar cuapan — CRM",
  },
  description: "Coaching, consultoría y mentorías — Gestiona tus clientes y vende más",
  manifest: "/manifest.json",
  openGraph: {
    title: "cesar cuapan — Coaching y Mentorías",
    description: "Ayudo a profesionales y emprendedores a incrementar sus ventas trabajando desde la raíz",
    type: "website",
    locale: "es_MX",
    siteName: "cesar cuapan",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('tema')||'AUTOMATICO';if(t==='OSCURO'||(t==='AUTOMATICO'&&window.matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{ style: { fontFamily: "var(--font-geist-sans)" } }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
