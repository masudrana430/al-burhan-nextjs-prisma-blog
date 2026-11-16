import type { Metadata } from 'next';
import {
  Github, Linkedin, Facebook, Instagram, Youtube, Globe, Mail,
  FileText, MapPin, Code2, GraduationCap, BriefcaseBusiness, ArrowUpRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Me | AL-BURHAN',
  description: 'About Masud Rana — Engineering Physics student and Full-Stack Developer from Chattogram, Bangladesh.',
};

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

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-emerald-900/30 bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 p-6 text-white shadow-xl sm:p-10">
          <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full border border-amber-300/20" />
          <div className="pointer-events-none absolute -right-8 -top-12 h-56 w-56 rounded-full border border-amber-300/10" />
          <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center">
            <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-3xl border border-amber-200/40 bg-white/10 text-4xl font-black tracking-tight text-amber-200 shadow-2xl">MR</div>
            <div>
              <span className="inline-flex rounded-full border border-amber-200/30 bg-amber-100/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-100">ABOUT THE CREATOR OF AL-BURHAN</span>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Masud Rana</h1>
              <p className="mt-2 text-base font-semibold text-emerald-100">Full-Stack Developer &amp; Engineering Physics Student</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200">I build practical web products — from responsive interfaces and interactive experiences to secure APIs, database-driven workflows, and third-party integrations. I enjoy turning complex ideas into useful, polished applications.</p>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-200">
                <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-amber-200" />Chattogram, Bangladesh</span>
                <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness className="h-4 w-4 text-amber-200" />Open to remote collaboration</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <a href="mailto:masud040502@gmail.com" className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-400"><Mail className="h-4 w-4" />Contact Me</a>
                <a href="https://drive.google.com/file/d/1etarj3H6FQBGSjCJPe73b3FaYpRkTG97/view" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-white/10"><FileText className="h-4 w-4" />View Resume</a>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex items-center gap-2"><Code2 className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold">About Me</h2></div>
            <div className="mt-4 space-y-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
              <p>I’m an Engineering Physics student at National University, Bangladesh, and a Full-Stack Developer who enjoys building complete digital products. My GitHub projects include a developer assessment platform, an event-management and ticketing system, a healthcare API foundation, and BraKet — a physics learning platform.</p>
              <p>I work across the stack: building interfaces with React and Next.js, developing TypeScript and Node.js APIs with Express, and designing PostgreSQL data models with Prisma. My projects also use Redis, JWT and Google authentication, file and email services, API documentation, and payment integrations.</p>
              <p>I’m interested in reliable architecture, secure role-based workflows, performance, and thoughtful user experience. I also enjoy exploring AI integrations, interactive interfaces, animation, and 3D web experiences while continuing to grow as an engineer.</p>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
            <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-emerald-600" /><h2 className="text-lg font-bold">Education</h2></div>
            <div className="mt-4 space-y-4 text-sm">
              <div><h3 className="font-bold">Bachelor of Science — Engineering Physics</h3><p className="mt-1 text-slate-600 dark:text-slate-400">National University, Bangladesh</p><p className="text-xs text-slate-500">Session: 2021–2022</p></div>
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="font-bold">Higher Secondary Certificate — Science</h3><p className="mt-1 text-slate-600 dark:text-slate-400">Chattogram Bandar College · 2021</p></div>
              <div className="border-t border-slate-100 pt-4 dark:border-slate-800"><h3 className="font-bold">Secondary School Certificate — Science</h3><p className="mt-1 text-slate-600 dark:text-slate-400">Chattogram City Corporation Hatey Khari School &amp; College · 2019</p></div>
            </div>
          </article>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2"><Code2 className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold">Skills &amp; Technologies</h2></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {skillGroups.map((group) => <article key={group.title} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h3 className="text-sm font-bold">{group.title}</h3><div className="mt-3 flex flex-wrap gap-2">{group.skills.map((skill) => <span key={skill} className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">{skill}</span>)}</div></article>)}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-2"><BriefcaseBusiness className="h-5 w-5 text-emerald-600" /><h2 className="text-xl font-bold">Featured Projects</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            {projects.map((project) => <article key={project.name} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">{project.category}</p>
              <h3 className="mt-2 text-lg font-bold">{project.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{project.description}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{project.stack.map((skill) => <span key={skill} className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">{skill}</span>)}</div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
                <a href={project.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-300">Source Code <ArrowUpRight className="h-3 w-3" /></a>
                {'live' in project && project.live ? <a href={project.live} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-emerald-700 hover:underline dark:text-emerald-300">Live Application <ArrowUpRight className="h-3 w-3" /></a> : null}
              </div>
            </article>)}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <h2 className="text-lg font-bold">Social &amp; Contact</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Find my work, connect with me, or reach out about a project or opportunity.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {socialLinks.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-between rounded-xl border border-slate-200 px-3 py-3 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-emerald-950/40"><span className="inline-flex items-center gap-2"><Icon className="h-4 w-4" />{label}</span><ArrowUpRight className="h-3.5 w-3.5" /></a>)}
          </div>
        </section>
        <p className="pb-4 text-center text-xs text-slate-500">Built with curiosity, continuous learning, and a passion for useful technology.</p>
      </div>
    </main>
  );
}
