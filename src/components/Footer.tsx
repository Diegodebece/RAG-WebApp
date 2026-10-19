import type { ReactNode } from 'react'
import { useLanguage } from '../i18n/language.ts'
import { LINKS } from '../links.ts'
import { ClaudeIcon, GitHubIcon, LinkedInIcon } from './icons.tsx'
import './Footer.css'

function ExternalLink({ href, icon, children }: { href: string; icon?: ReactNode; children: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {icon}
      {children}
    </a>
  )
}

export function Footer() {
  const { t } = useLanguage()

  return (
    <footer className="footer">
      <ExternalLink href={LINKS.site}>Diego de Brun</ExternalLink>
      <span aria-hidden="true">·</span>
      <ExternalLink href={LINKS.github} icon={<GitHubIcon />}>
        GitHub
      </ExternalLink>
      <span aria-hidden="true">·</span>
      <ExternalLink href={LINKS.linkedin} icon={<LinkedInIcon />}>
        LinkedIn
      </ExternalLink>
      <span aria-hidden="true">·</span>
      <span className="footer__built">
        {t.footer.builtWith}
        <ExternalLink href={LINKS.claudeCode} icon={<ClaudeIcon />}>
          Claude Code
        </ExternalLink>
      </span>
    </footer>
  )
}
