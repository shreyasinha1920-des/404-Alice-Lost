/**
 * Edit this file to point the storybook at your real site.
 * Pages 6 (doors), 12 (search), 13 (signposts) and 23 (back cover) read from it.
 *
 * Content mirrors ~/Desktop/Projects/Portfolio/site/src/data/projects.js.
 * URLs are absolute so the links work wherever this 404 is hosted.
 */
export interface SiteLink {
  label: string;
  url: string;
  /** Extra words page 12's search should match, e.g. "portfolio" for Work. */
  keywords?: string[];
}

export interface SiteConfig {
  siteName: string;
  homeUrl: string;
  /** The main sections: doors on page 6, links on the back cover. */
  sections: SiteLink[];
  /** Case studies and other pages: signposts on page 13, search on page 12. */
  pages: SiteLink[];
  contact: {
    email: string;
    linkedin: string;
    behance: string;
    resume: string;
  };
}

const ORIGIN = 'https://www.shreyasinha.co.in';

const siteConfig: SiteConfig = {
  siteName: 'Shreya Sinha',
  homeUrl: `${ORIGIN}/`,
  // The four doors in the hall (page 6) open onto these sections of the portfolio's home page
  // (checked on the live site, Oct 10, 2026):
  //   Work    → "Products built. Problems solved."
  //   About   → the "About me" heading (#about itself starts ~800px above it)
  //   Process → "How I work: Design doesn't happen in a vacuum."
  //   Contact → the contact section
  sections: [
    { label: 'Work', url: `${ORIGIN}/#work`, keywords: ['projects', 'portfolio', 'case studies', 'case study'] },
    { label: 'About', url: `${ORIGIN}/#about-title`, keywords: ['bio', 'me', 'shreya', 'story', 'skills'] },
    { label: 'Process', url: `${ORIGIN}/#process`, keywords: ['how i work', 'method', 'research', 'design process'] },
    { label: 'Contact', url: `${ORIGIN}/#contact`, keywords: ['email', 'hire', 'message', 'talk'] },
  ],
  pages: [
    { label: 'Vitals Thailand', url: `${ORIGIN}/vitalsthailand`, keywords: ['e-commerce', 'healthcare', 'supplements', 'vitals'] },
    { label: 'RocketPages', url: `${ORIGIN}/rocketpages-project`, keywords: ['saas', 'website builder', 'design system', 'branding'] },
    { label: 'Earthly Lunar', url: `${ORIGIN}/earthly-lunar`, keywords: ['enterprise', 'developer tools', 'engineering'] },
    { label: 'RootWords', url: `${ORIGIN}/rootwords-project`, keywords: ['mobile', 'edtech', 'vocabulary', 'game'] },
    { label: 'Safal AI', url: `${ORIGIN}/safal-ai`, keywords: ['enterprise', 'ai', 'contracts', 'saas'] },
    { label: 'HerStories', url: `${ORIGIN}/herstories`, keywords: ['mobile', 'reading', 'entertainment', 'social'] },
    { label: 'Eightfold Career Pages', url: `${ORIGIN}/eightfold-career-pages`, keywords: ['enterprise', 'careers', 'brand'] },
    { label: 'PDF to Web', url: `${ORIGIN}/pdf-to-web`, keywords: ['content design', 'web experience', 'enterprise'] },
    { label: 'RedCrackle', url: `${ORIGIN}/redcrackle`, keywords: ['agency', 'brand identity', 'website'] },
    { label: 'Ebb', url: `${ORIGIN}/ebb`, keywords: ['fintech', 'mobile', 'ai'] },
    { label: 'AI Projects', url: `${ORIGIN}/ai-projects`, keywords: ['ai', 'prototypes', 'touch target farm', 'gravity well'] },
    { label: 'Resume', url: `${ORIGIN}/resume/shreya-sinha-resume.pdf`, keywords: ['cv', 'resume', 'experience'] },
  ],
  contact: {
    email: 'hello@shreyasinha.co.in',
    linkedin: 'https://linkedin.com/in/shreyasinhadesigns/',
    behance: 'https://behance.net/shreyasinha1920',
    resume: `${ORIGIN}/resume/shreya-sinha-resume.pdf`,
  },
};

export default siteConfig;
