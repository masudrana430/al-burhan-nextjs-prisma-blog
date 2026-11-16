'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AboutAiLauncher from '@/components/about-ai-launcher';
import {
  Github, Linkedin, Facebook, Instagram, Youtube, Globe, Mail,
  FileText, MapPin, Code2, GraduationCap, BriefcaseBusiness, ArrowUpRight,
  Home, BookOpen, LayoutDashboard, Plus, Bookmark, UserRound, Sun, Moon, Monitor,
} from 'lucide-react';

type ThemeMode = 'light' | 'sepia' | 'dark' | 'system';

const socialLinks = [
  { label: 'GitHub', href: 'https://github.com/masudrana430', Icon: Github },
  { label: 'Portfolio', href: 'https://masud-rana.dev/', Icon: Globe },
  { label: 'LinkedIn', href: 'https://linkedin.com/in/masudrana430', Icon: Linkedin },
  { label: 'Facebook', href: 'https://www.facebook.com/profile.php?id=100069416914519', Icon: Facebook },
  { label: 'Instagram', href: 'https://www.instagram.com/mas.ud430/', Icon: Instagram },
  { label: 'YouTube', href: 'https://www.youtube.com/@sukoonalqalb-c9v', Icon: Youtube },
  { label: 'Resume', href: 'https://drive.google.com/file/d/1etarj3H6FQBGSjCJPe73b3FaYpRkTG97/view', Icon: FileText },
];

const skillGroups = [
  { title: 'Languages & Core', skills: ['TypeScript', 'JavaScript', 'HTML5', 'CSS3', 'SQL'] },
  { title: 'Frontend & UI', skills: ['React', 'Next.js', 'Tailwind CSS', 'Radix UI', 'TanStack Query', 'React Hook Form', 'Zod', 'Recharts', 'Lucide React'] },
  { title: 'Animation & 3D', skills: ['Motion', 'GSAP', 'Three.js', 'React Three Fiber', 'OGL', 'Matter.js'] },
  { title: 'Backend & APIs', skills: ['Node.js', 'Express', 'REST APIs', 'JWT', 'Google Authentication', 'Cloudinary', 'Multer', 'Nodemailer'] },
  { title: 'Database & ORM', skills: ['PostgreSQL', 'Prisma ORM', 'Redis'] },
  { title: 'AI & Integrations', skills: ['Gemini API', 'Google APIs', 'Google Drive API', 'Stripe', 'Paymently'] },
  { title: 'Tools & Deployment', skills: ['Git', 'GitHub', 'Vercel', 'Render', 'Netlify', 'Postman', 'Playwright', 'GitHub Actions'] },
];

const projects = [
  {
    name: 'BraKet ⟨φ|ψ⟩',
    category: 'Academic Learning Platform',
    description: 'A physics learning hub for Honours 4th-Year students, with subject- and chapter-based resources, searchable study notes, chapter-wise YouTube classes, Google Drive uploads, and a multilingual AI assistant.',
    stack: ['Next.js 14', 'React 18', 'TypeScript', 'Tailwind CSS', 'Prisma', 'PostgreSQL', 'Gemini API', 'Google Drive API'],
    href: 'https://github.com/masudrana430/Honors-4th-Year-Academic-Resource-Platform-new',
    live: 'https://honors-4th-year-physics.vercel.app',
  },
  {
    name: 'Developer Assessment Platform',
    category: 'Assessment & Evaluation',
    description: 'A role-based platform for candidates, reviewers, and administrators, with assessment creation, timed attempts, MCQ and written questions, grading, analytics, and paid assessments.',
    stack: ['Next.js 15', 'React 19', 'TypeScript', 'Express', 'PostgreSQL', 'Prisma', 'Redis', 'Stripe'],
    href: 'https://github.com/masudrana430/Developer-Assessment-Platform-Frontend',
    live: 'https://developer-assessment-platform-front.vercel.app',
  },
  {
    name: 'EventFlow',
    category: 'Event Management & Ticketing',
    description: 'An event discovery and ticketing platform with organizer workflows, ticket checkout, digital passes, QR check-in, announcements, refunds, payouts, and role-aware dashboards.',
    stack: ['Next.js 15', 'React 19', 'TypeScript', 'Express', 'PostgreSQL', 'Prisma', 'Redis', 'Stripe'],
    href: 'https://github.com/masudrana430/EventFlow-frontend',
    live: 'https://event-flow-frontend-nu.vercel.app',
  },
  {
    name: 'DoctorHub',
    category: 'Healthcare API · In Progress',
    description: 'A backend foundation for a doctor–patient appointment platform. The current working scope includes patient registration, login, and authenticated profile retrieval.',
    stack: ['Node.js', 'Express', 'TypeScript', 'Prisma', 'PostgreSQL', 'JWT', 'Redis'],
    href: 'https://github.com/masudrana430/DoctorHub',
  },
];

const navigation = [
  { label: 'Articles & Research', href: '/?view=explore', Icon: BookOpen },
  { label: 'Admin Dashboard', href: '/?view=admin', Icon: LayoutDashboard },
  { label: 'Write New Post', href: '/admin/editor', Icon: Plus },
  { label: 'Saved Articles', href: '/?view=saved', Icon: Bookmark },
  { label: 'About Me', href: '/about', Icon: UserRound, active: true },
];

export default function AboutPage() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [themeReady, setThemeReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('al_burhan_theme');
      if (saved === 'light' || saved === 'sepia' || saved === 'dark' || saved === 'system') {
        setTheme(saved);
      }
    } catch {
      // The page remains usable with the default light theme.
    }
    setThemeReady(true);
  }, []);

  useEffect(() => {
    if (!themeReady) return;
    try {
      window.localStorage.setItem('al_burhan_theme', theme);
    } catch {
      // Theme selection still applies to this page.
    }
  }, [theme, themeReady]);

  const cycleTheme = () => {
    setTheme((current) => current === 'light' ? 'sepia' : current === 'sepia' ? 'dark' : current === 'dark' ? 'system' : 'light');
  };
  const themeLabel = theme === 'light' ? 'Light theme' : theme === 'sepia' ? 'Sepia theme' : theme === 'dark' ? 'Dark theme' : 'System theme';
  const ThemeIcon = theme === 'light' ? Sun : theme === 'sepia' ? BookOpen : theme === 'dark' ? Moon : Monitor;

  return (
    <div className={`about-page-shell theme-${theme}`}>
      <div className="about-honeycomb-pattern" aria-hidden="true" />
      <header className="about-site-header">
        <div className="about-nav-inner">
          <Link href="/" className="about-brand" aria-label="AL-BURHAN home">
            <Image src="/al-burhan-logo.svg" alt="AL-BURHAN official logo" width={48} height={48} unoptimized className="h-11 w-11 rounded-lg object-cover" />
            <span className="about-brand-copy"><strong>AL-BURHAN</strong><small>Research & Knowledge Library</small></span>
          </Link>
          <nav className="about-main-nav" aria-label="Main navigation">
            {navigation.map(({ label, href, Icon, active }) => (
              <Link key={label} href={href} aria-current={active ? 'page' : undefined} className={active ? 'is-active' : ''}>
                <Icon size={15} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>
          <button type="button" className="about-theme-toggle" onClick={cycleTheme} title={`Current: ${themeLabel}. Click to change.`} aria-label={`Current ${themeLabel}. Change theme.`}>
            <ThemeIcon size={17} />
            <span>{theme}</span>
          </button>
        </div>
      </header>

      <main className="about-main-content">
        <section className="about-hero">
          <div className="about-hero-ornament" aria-hidden="true"><span /><span /><span /></div>
          <div className="about-hero-content">
            <div className="about-avatar" aria-hidden="true">MR</div>
            <div className="about-hero-copy">
              <span className="about-eyebrow">ABOUT THE CREATOR OF AL-BURHAN</span>
              <h1>Masud Rana</h1>
              <p className="about-role">Full-Stack Developer &amp; Engineering Physics Student</p>
              <p className="about-intro">I build practical web products — from responsive interfaces and interactive experiences to secure APIs, database-driven workflows, and third-party integrations. I enjoy turning complex ideas into useful, polished applications.</p>
              <div className="about-facts">
                <span><MapPin size={15} />Chattogram, Bangladesh</span>
                <span><BriefcaseBusiness size={15} />Open to remote collaboration</span>
              </div>
              <div className="about-hero-actions">
                <a href="mailto:masud040502@gmail.com"><Mail size={16} />Contact Me</a>
                <a href="https://drive.google.com/file/d/1etarj3H6FQBGSjCJPe73b3FaYpRkTG97/view" target="_blank" rel="noopener noreferrer"><FileText size={16} />View Resume</a>
                <a href="https://github.com/masudrana430" target="_blank" rel="noopener noreferrer"><Github size={16} />GitHub</a>
              </div>
            </div>
          </div>
          <div className="about-hero-bottom-line"><span /> KNOWLEDGE · ENGINEERING · PURPOSE <span /></div>
        </section>

        <section className="about-content-grid">
          <article className="about-panel about-bio-panel">
            <div className="about-section-heading"><span className="about-heading-icon"><Code2 size={18} /></span><div><h2>About Me</h2><p>A little about my journey and interests</p></div></div>
            <div className="about-prose">
              <p>I’m an Engineering Physics student at National University, Bangladesh, and a Full-Stack Developer who enjoys building complete digital products. My GitHub projects include a developer assessment platform, an event-management and ticketing system, a healthcare API foundation, and BraKet — a physics learning platform.</p>
              <p>I work across the stack: building interfaces with React and Next.js, developing TypeScript and Node.js APIs with Express, and designing PostgreSQL data models with Prisma. My projects also use Redis, JWT and Google authentication, file and email services, API documentation, and payment integrations.</p>
              <p>I’m interested in reliable architecture, secure role-based workflows, performance, and thoughtful user experience. I also enjoy exploring AI integrations, interactive interfaces, animation, and 3D web experiences while continuing to grow as an engineer.</p>
            </div>
          </article>
          <article className="about-panel about-education-panel">
            <div className="about-section-heading"><span className="about-heading-icon"><GraduationCap size={18} /></span><div><h2>Education</h2><p>Academic background</p></div></div>
            <div className="about-education-list">
              <div><strong>Bachelor of Science — Engineering Physics</strong><span>National University, Bangladesh</span><small>Session: 2021–2022</small></div>
              <div><strong>Higher Secondary Certificate — Science</strong><span>Chattogram Bandar College</span><small>2021</small></div>
              <div><strong>Secondary School Certificate — Science</strong><span>Chattogram City Corporation Hatey Khari School &amp; College</span><small>2019</small></div>
            </div>
          </article>
        </section>

        <section className="about-section-block">
          <div className="about-section-title"><span className="about-heading-icon"><Code2 size={18} /></span><div><h2>Skills &amp; Technologies</h2><p>Tools and technologies reflected in my GitHub projects</p></div></div>
          <div className="about-skills-grid">
            {skillGroups.map((group) => <article key={group.title} className="about-panel about-skill-card"><h3>{group.title}</h3><div>{group.skills.map((skill) => <span key={skill}>{skill}</span>)}</div></article>)}
          </div>
        </section>

        <section className="about-section-block">
          <div className="about-section-title"><span className="about-heading-icon"><BriefcaseBusiness size={18} /></span><div><h2>Featured Projects</h2><p>Selected products and engineering work</p></div></div>
          <div className="about-project-grid">
            {projects.map((project) => <article key={project.name} className="about-panel about-project-card">
              <span className="about-project-category">{project.category}</span>
              <h3>{project.name}</h3>
              <p>{project.description}</p>
              <div className="about-project-stack">{project.stack.map((skill) => <span key={skill}>{skill}</span>)}</div>
              <div className="about-project-links">
                <a href={project.href} target="_blank" rel="noopener noreferrer">Source Code <ArrowUpRight size={14} /></a>
                {'live' in project && project.live ? <a href={project.live} target="_blank" rel="noopener noreferrer">Live Application <ArrowUpRight size={14} /></a> : null}
              </div>
            </article>)}
          </div>
        </section>

        <section className="about-panel about-social-panel">
          <div className="about-section-title"><span className="about-heading-icon"><Globe size={18} /></span><div><h2>Social &amp; Contact</h2><p>Find my work, connect with me, or discuss an opportunity</p></div></div>
          <div className="about-social-grid">
            {socialLinks.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer"><span><Icon size={17} />{label}</span><ArrowUpRight size={15} /></a>)}
          </div>
        </section>

        <footer className="about-page-footer">
          <Link href="/"><Home size={15} />Back to AL-BURHAN Home</Link>
          <span>Built with curiosity, continuous learning, and a passion for useful technology.</span>
        </footer>
      </main>
      <AboutAiLauncher />
    </div>
  );
}
