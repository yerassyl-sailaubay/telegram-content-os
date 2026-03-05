import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

// Root layout passthrough — the actual layout with <html> and <body>
// is in src/app/[locale]/layout.tsx, which handles locale-specific rendering.
export default function RootLayout({ children }: Props) {
  return children;
}
