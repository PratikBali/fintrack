import packageJson from "../../package.json";

export function AppFooter() {
  return (
    <footer className="py-6 text-center text-xs text-muted-foreground">
      Developed by Pratik Bali. Version {packageJson.version}
    </footer>
  );
}
