import { AuthProvider } from "./auth/provider";
import { ViewportSize } from "./elements/viewport-size";
import { ThemeProvider } from "./theme/provider";
import { Toaster } from "./ui/sonner";

export const AppContext = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <AuthProvider>
        {children}
        <Toaster position="bottom-right" closeButton />
        <ViewportSize />
      </AuthProvider>
    </ThemeProvider>
  );
};
