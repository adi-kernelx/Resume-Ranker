import { PiUploadSimple, PiBrain, PiTrophy } from 'react-icons/pi';

const STEPS = [
  {
    icon: PiUploadSimple,
    title: 'Upload your resume',
    body: 'Drop in a PDF or DOCX. Sections, contact details and profile links are extracted automatically.',
  },
  {
    icon: PiBrain,
    title: 'Get it analyzed',
    body: 'Every upload gets an ATS score, structured skill extraction and an audit of your public GitHub.',
  },
  {
    icon: PiTrophy,
    title: 'See where you rank',
    body: 'Each company in the index scores your profile, with eligibility and missing skills spelled out.',
  },
];

const FeaturesSection = () => (
  <section className="mt-16">
    <h2 className="m-0 font-display text-2xl tracking-[-0.01em] text-text">How it works</h2>
    <p className="mt-2 mb-8 max-w-[60ch] text-sm text-muted">
      Three steps from a resume file to a ranked list of companies.
    </p>

    <ol className="m-0 grid list-none gap-4 p-0 md:grid-cols-3">
      {STEPS.map(({ icon: Icon, title, body }, index) => (
        <li key={title} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-tint text-accent">
              <Icon size={20} />
            </span>
            <span className="text-xs uppercase tracking-[0.08em] text-muted">Step {index + 1}</span>
          </div>
          <h3 className="m-0 text-[15px] font-medium text-text">{title}</h3>
          <p className="m-0 text-[13px] leading-[1.6] text-muted">{body}</p>
        </li>
      ))}
    </ol>
  </section>
);

export default FeaturesSection;
