"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FiLogOut } from "react-icons/fi";
import {
  HOME_PATH_BY_ROLE,
  NAV_LINKS_BY_ROLE,
  labelForHomeRole,
  resolveHomeRole,
  type HomeUserRole
} from "@/src/features/auth/config/homeNav";
import { decodeAuthTokenPayload } from "@/src/features/auth/lib/decodeAuthToken";
import styles from "./HomeNavbar.module.css";

function isHomeNavLinkActive(pathname: string, locationHash: string, href: string): boolean {
  const [path, fragment] = href.split("#");
  if (fragment) {
    if (pathname !== path) return false;
    return locationHash === `#${fragment}`;
  }
  if (pathname === path) return true;
  const base = path.endsWith("/") ? path.slice(0, -1) : path;
  return base.length >= 1 && pathname.startsWith(`${base}/`);
}

export function HomeNavbar() {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const [role, setRole] = useState<HomeUserRole | null>(null);
  const [hash, setHash] = useState("");
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      let tokenPayload = null;
      try {
        const token = localStorage.getItem("token");
        if (token) tokenPayload = decodeAuthTokenPayload(token);
      } catch {
        tokenPayload = null;
      }
      setRole(resolveHomeRole(pathname, tokenPayload));
      const nombre = tokenPayload?.nombre?.trim() ?? "";
      const apellido = tokenPayload?.apellido?.trim() ?? "";
      const fullName = [nombre, apellido].filter(Boolean).join(" ");
      setDisplayName(fullName || null);
      setHash(typeof window !== "undefined" ? window.location.hash : "");
    };

    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [pathname]);

  const roleLabel = role ? labelForHomeRole(role) : "Usuario";
  const panelHref = role ? HOME_PATH_BY_ROLE[role] : "/";
  const links = role ? NAV_LINKS_BY_ROLE[role] : [];

  const handleLogout = () => {
    try {
      localStorage.removeItem("token");
    } catch {
      // ignore
    }
    router.push("/");
  };

  return (
    <header>
      <nav className={styles.nav} aria-label="Principal">
        <p className={styles.brand}>
          <Link href={panelHref} className={styles.brandLink}>
            <span className={styles.brandSaa}>SAA</span>
          </Link>
          <span className={styles.brandRole}>{roleLabel}</span>
        </p>

        {links.length > 0 ? (
          <ul className={styles.links} role="list">
            {links.map((item) => {
              const active = isHomeNavLinkActive(pathname, hash, item.href);
              return (
                <li key={item.href} className={styles.linkItem}>
                  <Link
                    href={item.href}
                    className={active ? `${styles.link} ${styles.linkActive}` : styles.link}
                    aria-current={active ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className={styles.linksPlaceholder} aria-hidden />
        )}

        <div className={styles.actions}>
          {displayName ? (
            <span className={styles.username} title={displayName}>
              {displayName}
            </span>
          ) : null}
          <button
            type="button"
            className={styles.logout}
            onClick={handleLogout}
            aria-label="Cerrar sesion"
          >
            <FiLogOut className={styles.logoutIcon} aria-hidden />
            Cerrar sesion
          </button>
        </div>
      </nav>
    </header>
  );
}
