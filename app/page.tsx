import Link from "next/link";

export default function HomePage() {
  return (
    <main>
      <h1>Proyecto base Next.js</h1>
      <p>Flujo de prueba listo.</p>
      <Link href="/test">Ir a vista test</Link>
    </main>
  );
}
