import { useQuery } from '@tanstack/react-query';

};

const ICON_STYLES = [
  'bg-primary/10 text-primary',
  'bg-secondary/10 text-secondary',
  'bg-error/10 text-error'
];

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies().then(r => r.data),
  });
  const companies = Array.isArray(data) ? data : [];

    } else if (company.skill_set?.some(skill =>
    )) {
    }
  };

  const displayedCompanies = companies.slice(0, 6);

    >
      <h2 className="text-3xl font-display font-bold text-center text-on-surface mb-4">
      <p className="text-center text-on-surface-variant mb-10 max-w-3xl mx-auto">

              className="card p-6"
            >
          ))
              key={company._id || company.id || index}
              className="card card-hover p-6"
            >
                    className={`w-12 h-12 ${ICON_STYLES[index % ICON_STYLES.length]} rounded-lg flex items-center justify-center mr-4`}
                  >
                    <h3 className="text-lg font-display font-semibold text-on-surface">
                    <p className="text-sm text-on-surface-variant">
                      {company.internship_role}
                <div className="bg-primary/15 text-primary text-xs font-medium py-1 px-2 rounded mt-3 inline-block">
                  Visits IIT Patna: {company.visits_iit_patna ? "Yes" : "No"}
                  <span className="text-on-surface-variant">Min. CPI/GPA</span>
                  <span className="font-medium text-on-surface">
                <div className="flex justify-between gap-10 text-sm mb-1">
                  <span className="text-on-surface-variant">Required Skills</span>
                  <span className="font-medium text-on-surface text-right">
                    {(company?.skill_set || []).slice(0, 3).join(", ") || "None"}
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Branches</span>
                  <span className="font-medium text-on-surface text-right">
          ))
        )}

            className="btn-ghost py-2 px-4 rounded flex items-center justify-center mx-auto"
          >
  );
};

