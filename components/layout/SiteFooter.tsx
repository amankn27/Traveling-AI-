import Link from 'next/link';
import { FOOTER_COLUMNS, SOCIAL_LINKS } from '@/lib/site-data';

export function SiteFooter() {
  return (
    <footer
      id="contact"
      className="relative w-full text-white"
      style={{ backgroundColor: '#2A2520', paddingTop: 100, paddingBottom: 40 }}
    >
      <div className="mx-auto max-w-[1400px] px-6 md:px-10">
        <div
          className="grid grid-cols-1 gap-12 border-b pb-20 md:grid-cols-12"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <div className="md:col-span-5">
            <Link
              href="/"
              className="inline-flex cursor-pointer items-baseline gap-2 transition-opacity hover:opacity-80"
            >
              <span className="font-display text-[38px] font-medium tracking-[0.01em]">Veloria</span>
              <span className="font-sans text-[10px] font-medium uppercase not-italic tracking-[0.3em] opacity-50">
                EST·2025
              </span>
            </Link>

            <p className="mt-6 max-w-md font-display text-[22px] leading-[1.45] text-white/75">
              Quiet journeys, composed slowly — for the few who travel to remember who they are.
            </p>

            <div className="mt-10 flex items-center gap-3">
              {SOCIAL_LINKS.map((social) => (
                <Link
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-white/20 text-white/80 transition-all duration-300 hover:bg-white hover:text-[#2A2520]"
                >
                  <i className={social.icon} aria-hidden="true" style={{ fontSize: 15 }} />
                </Link>
              ))}
            </div>
          </div>

          <div
            data-target="contact-details"
            className="grid grid-cols-1 gap-10 sm:grid-cols-3 md:col-span-7"
          >
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.heading}>
                <h2 className="mb-6 font-sans text-[11px] font-medium uppercase tracking-[0.24em] text-white/50">
                  <Link href={column.headingHref} className="cursor-pointer transition-opacity hover:opacity-80">
                    {column.heading}
                  </Link>
                </h2>
                <ul className="space-y-4">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="inline-block cursor-pointer font-display text-[18px] text-white/85 transition-opacity hover:opacity-70"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-5 pt-10 font-sans text-[11px] font-medium tracking-[0.12em] text-white/45 sm:flex-row">
          <p>© 2025 Veloria Travel Studio · All rights reserved</p>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Cookies'].map((label) => (
              <Link
                key={label}
                href="/contact"
                className="cursor-pointer whitespace-nowrap uppercase transition-opacity hover:opacity-100"
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
