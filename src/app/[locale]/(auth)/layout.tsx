import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: true,
    noarchive: true,
    googleBot: {
      index: false,
      follow: true,
      noimageindex: true,
    },
  },
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-muted flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
