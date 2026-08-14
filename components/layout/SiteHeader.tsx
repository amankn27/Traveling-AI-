'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { NAV_LINKS } from '@/lib/site-data';
import { useUiStore } from '@/store/ui-store';
import { scrollSectionIntoView } from '@/lib/utils';

/**
 * Fixed masthead. Transparent over the hero, then cream + blur past 60px —
 * the exact thresholds and colours the reference uses.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const mobileMenuOpen = useUiStore((s) => s.mobileMenuOpen);
  const setMobileMenuOpen = useUiStore((s) => s.setMobileMenuOpen);
  const toggleMobileMenu = useUiStore((s) => s.toggleMobileMenu);

  const isHome = pathname === '/';
  const isDarkPage = pathname === '/experiences';

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('header[data-site-header]');
    if (!el) return;

    const onScroll = () => {
      el.dataset.scrolled = window.scrollY > 60 ? 'true' : 'false';
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname, setMobileMenuOpen]);

  const handleNav = (event: React.MouseEvent, href: string, sectionId?: string) => {
    if (!sectionId) return;
    if (isHome) {
      event.preventDefault();
      scrollSectionIntoView(sectionId);
    }
    // Off-home the link routes normally; the target page anchors itself.
    void href;
  };

  return (
    <header
      data-site-header
      data-dark={isDarkPage ? 'true' : 'false'}
      data-overlay={isHome || isDarkPage ? 'true' : 'false'}
      data-scrolled="false"
      className="site-header fixed inset-x-0 top-0 z-50 transition-all duration-500"
    >
      <nav className="mx-auto flex h-[72px] max-w-[1400px] items-center justify-between px-6 md:px-10">
        <Link
          href="/"
          data-target="logo"
          className="flex cursor-pointer items-center gap-2 transition-opacity hover:opacity-70"
        >
          <span className="font-display text-[26px] font-medium tracking-[0.02em]">Veloria</span>
        </Link>

        {/* The full nav needs ~700px of comfortable room; below `lg` the
            hamburger takes over rather than letting the bar overflow. */}
        <ul data-target="nav" className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => {
            const active = link.href === '/' ? isHome : pathname === link.href;
            return (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={(e) => handleNav(e, link.href, link.sectionId)}
                  aria-current={active ? 'page' : undefined}
                  data-active={active ? 'true' : 'false'}
                  className="nav-link whitespace-nowrap pb-1 font-sans text-[13px] font-medium uppercase tracking-[0.08em] transition-colors duration-300"
                >
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/contact"
          data-target="reserve"
          className="reserve-pill hidden cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-[22px] py-[10px] font-sans text-xs font-medium uppercase tracking-[0.12em] transition-all duration-300 lg:inline-flex"
        >
          Reserve
        </Link>

        <button
          type="button"
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          onClick={toggleMobileMenu}
          className="menu-button flex h-10 w-10 cursor-pointer items-center justify-center rounded-full lg:hidden"
        >
          <i
            className={mobileMenuOpen ? 'ri-close-line' : 'ri-menu-line'}
            aria-hidden="true"
            style={{ fontSize: 18 }}
          />
        </button>
      </nav>

      {mobileMenuOpen ? (
        <div id="mobile-menu" className="mobile-drawer border-t lg:hidden">
          <ul className="flex flex-col gap-5 px-6 py-6">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  onClick={(e) => {
                    handleNav(e, link.href, link.sectionId);
                    setMobileMenuOpen(false);
                  }}
                  className="block cursor-pointer font-sans text-sm font-medium uppercase tracking-[0.08em]"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
