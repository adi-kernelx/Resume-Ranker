import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PiBuildings, PiArrowRight } from 'react-icons/pi';
import { getCompanies } from '../../services/api';

const PREVIEW_COUNT = 6;

const CompanyCard = ({ company }) => {
  const skills = (company.skill_set || []).slice(0, 3);
  const cutoff = company.min_gpa || company.cpi;
  const role = company.role || company.internship_role;

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line-strong text-accent">
          <PiBuildings size={20} />
        </span>
        <div className="min-w-0">
          <h3 className="m-0 truncate text-[15px] font-medium text-text">{company.name}</h3>
          <p className="m-0 truncate text-xs text-muted">{role || 'Role not specified'}</p>
        </div>
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span key={skill} className="rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-muted">
              {skill}
            </span>
          ))}
        </div>
      )}

      <p className="m-0 mt-auto text-xs text-muted">{cutoff ? `Minimum CPI ${cutoff}` : 'No CPI cutoff'}</p>
    </article>
  );
};

const PopularCompanies = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies().then((response) => response.data),
  });

  const companies = Array.isArray(data) ? data.slice(0, PREVIEW_COUNT) : [];

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="m-0 font-display text-2xl tracking-[-0.01em] text-text">Companies in the index</h2>
          <p className="mb-0 mt-2 text-sm text-muted">A few of the roles every resume is scored against.</p>
        </div>
        <Link to="/companies" className="flex items-center gap-1.5 whitespace-nowrap text-[13px] text-accent">
          View all <PiArrowRight size={14} />
        </Link>
      </div>

      {isLoading && <p className="text-sm text-muted">Loading companies…</p>}
      {isError && <p className="text-sm text-muted">Couldn't load companies right now.</p>}
      {!isLoading && !isError && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </section>
  );
};

export default PopularCompanies;
