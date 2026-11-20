import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { resolveStorefrontBrand } from "@/features/storefront/lib/brand";
import { getPublicMarketplaceSettings } from "@/features/storefront/lib/data/marketplace";
import "./globals.css";

// The staff dashboard carries the store's own name from Store Settings.
export async function generateMetadata(): Promise<Metadata> {
  const brand = await getPublicMarketplaceSettings().then(resolveStorefrontBrand).catch(() => null);
  const name = brand?.name ? `${brand.name} staff` : "Staff dashboard";
  return { title: name, description: brand?.name ? `Staff dashboard for ${brand.name}` : "Staff dashboard" };
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
