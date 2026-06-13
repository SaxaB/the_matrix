import { Navbar } from "@/components/shared/navbar";
import { MatrixRain } from "@/components/shared/matrix-rain";

export default function MainShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MatrixRain />
      <Navbar />
      <main className="flex-1">{children}</main>
    </>
  );
}
