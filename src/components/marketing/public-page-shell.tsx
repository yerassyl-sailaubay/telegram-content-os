import { ArrowRight, Send } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  getFooterSolutionLinks,
  getFooterTrustLinks,
  marketingChromeCopy,
  type PublicPageContent,
} from "@/lib/seo/content";
import type { AppLocale } from "@/lib/seo/site";

type PublicPageShellProps = {
  locale: AppLocale;
  content: PublicPageContent;
};

const sectionShell = "mx-auto w-full max-w-[1240px] px-5 sm:px-8 lg:px-10";
const glassCard =
  "relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] shadow-[0_24px_80px_rgba(2,8,23,0.45)] backdrop-blur-xl";

export function PublicPageShell({ locale, content }: PublicPageShellProps) {
  const chrome = marketingChromeCopy[locale];
  const solutionLinks = getFooterSolutionLinks(locale);
  const trustLinks = getFooterTrustLinks(locale);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#06131a] font-[family-name:var(--font-sans-landing)] text-white selection:bg-[#41ffd8]/30 selection:text-white">
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#031018]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(65,255,216,0.15),transparent_26%),radial-gradient(circle_at_86%_10%,rgba(45,197,255,0.14),transparent_24%),radial-gradient(circle_at_50%_40%,rgba(8,34,44,0.6),transparent_46%),linear-gradient(180deg,#06131a_0%,#030b11_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:7rem_7rem] opacity-[0.05]" />
        <div className="absolute top-[18%] left-[8%] size-64 rounded-full bg-[#41ffd8]/8 blur-[120px]" />
        <div className="absolute top-[34%] right-[6%] size-72 rounded-full bg-[#2dc5ff]/8 blur-[140px]" />
        <div className="absolute bottom-[10%] left-[30%] size-80 rounded-full bg-[#0c3340]/35 blur-[160px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <nav
          className={`mx-auto flex max-w-[1240px] items-center justify-between rounded-full border border-white/10 bg-[#071118]/82 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:px-5`}
        >
          <Link
            href="/"
            className="flex items-center gap-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-white sm:text-xl"
          >
            <span className="flex size-9 items-center justify-center rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-[#41ffd8]">
              <Send className="size-4" />
            </span>
            Teleflow
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium text-white/68 lg:flex">
            <Link href="/" className="transition-colors hover:text-white">
              {chrome.homeLabel}
            </Link>
            {solutionLinks.slice(0, 2).map((link) => (
              <Link key={link.href} href={link.href} className="transition-colors hover:text-white">
                {link.label}
              </Link>
            ))}
            <Link href="/about" className="transition-colors hover:text-white">
              {chrome.trustLabel}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-white/68 transition-colors hover:text-white sm:block"
            >
              {chrome.loginLabel}
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full bg-[#41ffd8] px-4 py-2.5 text-sm font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#41ffd8]"
            >
              {chrome.signupLabel}
            </Link>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-28 pb-20 sm:pt-32">
        <section className={`${sectionShell} pt-8 sm:pt-12`}>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] lg:items-start">
            <div className={`${glassCard} p-6 sm:p-8 lg:p-10`}>
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(65,255,216,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(45,197,255,0.14),transparent_32%)]" />
              <div className="relative z-10">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-xs font-semibold tracking-[0.18em] text-white/68 uppercase">
                  <span className="size-2 rounded-full bg-[#41ffd8]" />
                  {content.eyebrow}
                </p>
                <h1 className="mt-7 max-w-4xl font-[family-name:var(--font-display)] text-[2.7rem] leading-[0.95] tracking-[-0.05em] text-white sm:text-[4.2rem]">
                  {content.heroTitle}
                </h1>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-white/70 sm:text-[1.1rem]">
                  {content.heroDescription}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {content.highlights.map((item) => (
                    <div
                      key={item}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm text-white/74"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <aside className={`${glassCard} p-6 sm:p-7`}>
              <p className="text-xs font-semibold tracking-[0.16em] text-[#8dffe9] uppercase">
                {chrome.exploreLabel}
              </p>
              <div className="mt-4 space-y-3">
                {solutionLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#07131a]/70 px-4 py-3 text-sm text-white/76 transition-colors hover:border-[#41ffd8]/30 hover:text-white"
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="size-4 text-[#72ffe3]" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
        </section>

        <section className={`${sectionShell} mt-10 sm:mt-14`}>
          <div className="grid gap-5 lg:grid-cols-2">
            {content.sections.map((section) => (
              <article key={section.title} className={`${glassCard} p-6 sm:p-7`}>
                <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-[-0.04em] text-white">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-4 text-base leading-8 text-white/70">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
                {section.bullets ? (
                  <ul className="mt-6 space-y-3 text-sm text-white/78">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-2 size-2 rounded-full bg-[#41ffd8]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className={`${sectionShell} mt-10 sm:mt-14`}>
          <div className={`${glassCard} p-6 sm:p-8`}>
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs font-semibold tracking-[0.18em] text-[#8dffe9] uppercase">
                  Teleflow
                </p>
                <h2 className="mt-4 font-[family-name:var(--font-display)] text-4xl tracking-[-0.04em] text-white sm:text-5xl">
                  {content.cta.title}
                </h2>
                <p className="mt-4 max-w-3xl text-lg leading-8 text-white/68">
                  {content.cta.description}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href={content.cta.primaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#41ffd8] px-6 py-3.5 text-base font-semibold text-[#03262a] transition-all hover:-translate-y-0.5 hover:bg-[#6affdf]"
                >
                  {content.cta.primaryLabel}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href={content.cta.secondaryHref}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.03] px-6 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/[0.08]"
                >
                  {content.cta.secondaryLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 mt-16 border-t border-white/10 bg-[#041018]/90">
        <div className={`${sectionShell} py-10`}>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
            <div className="max-w-lg">
              <div className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
                <span className="flex size-10 items-center justify-center rounded-full border border-[#41ffd8]/25 bg-[#41ffd8]/10 text-[#41ffd8]">
                  <Send className="size-4" />
                </span>
                Teleflow
              </div>
              <p className="mt-4 text-sm leading-7 text-white/64">{content.meta.description}</p>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-white/44 uppercase">
                {chrome.solutionsLabel}
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/72">
                {solutionLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold tracking-[0.16em] text-white/44 uppercase">
                {chrome.legalLabel}
              </p>
              <div className="mt-4 flex flex-col gap-3 text-sm text-white/72">
                {trustLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
