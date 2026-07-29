import React from "react";
import { PiArrowRight, PiBuildings, PiBriefcase, PiCode, PiDatabase } from "react-icons/pi";
import { useQuery } from '@tanstack/react-query';

const ICON_STYLES = [
  'bg-tint text-accent',
  'bg-success/10 text-success',
  'bg-warning/10 text-warning',
  'bg-error/10 text-error'
];

  const { data, isLoading } = useQuery({
    queryKey: ['companies'],
    queryFn: () => getCompanies().then(r => r.data),
  });
  const companies = Array.isArray(data) ? data : [];

      return <PiCode className="w-6 h-6" />;
      return <PiBuildings className="w-6 h-6" />;
    } else if (company.skill_set?.some(skill =>
    )) {
      return <PiDatabase className="w-6 h-6" />;
      return <PiBriefcase className="w-6 h-6" />;
    }
  };

  const displayedCompanies = companies.slice(0, 6);

    <section className="py-12">
      <h2 className="text-[26px] font-display font-bold text-center text-text mb-4 tracking-[-0.02em]">
      <p className="text-center text-[13.5px] text-muted mb-10 max-w-3xl mx-auto">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              className="border border-line bg-surface p-6 rounded-xl"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-surface-2 animate-pulse" />
                    <div className="h-5 w-32 bg-surface-2 rounded animate-pulse mb-1.5" />
                    <div className="h-4 w-24 bg-surface-2 rounded animate-pulse" />
              <div className="space-y-2 mt-4">
                <div className="h-4 w-full bg-surface-2 rounded animate-pulse" />
                <div className="h-4 w-full bg-surface-2 rounded animate-pulse" />
                <div className="h-4 w-3/4 bg-surface-2 rounded animate-pulse" />
          ))
            <div
              key={company._id || company.id || index}
              className="border border-line bg-surface p-6 rounded-xl transition-all duration-200 hover:border-accent hover:shadow-lg hover:-translate-y-1"
            >
                <div className="flex items-center gap-4">
                    className={`w-12 h-12 ${ICON_STYLES[index % ICON_STYLES.length]} rounded-lg flex items-center justify-center`}
                  >
                    <h3 className="text-[17px] font-display font-semibold text-text m-0">
                    <p className="text-[13px] text-muted m-0 mt-0.5">
                      {company.internship_role}
              <div className="bg-tint/50 border border-tint-strong text-accent text-[11px] font-medium py-1 px-2 rounded-md mt-4 inline-block uppercase tracking-wider">
                Visits IIT Patna: {company.visits_iit_patna ? "Yes" : "No"}
              </div>
              <div className="mt-4 flex flex-col gap-2">
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Min. CPI</span>
                  <span className="font-medium text-text">
                    {company?.cpi || "N/A"}
                <div className="flex justify-between gap-4 text-[13px]">
                  <span className="text-muted shrink-0">Required</span>
                  <span className="font-medium text-text text-right truncate">
                    {(company?.skill_set || []).slice(0, 3).join(", ") || "None"}
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Branches</span>
                  <span className="font-medium text-text text-right truncate">
            </div>
          ))
        )}

          <button className="h-9 px-4 border border-line-strong rounded-md bg-transparent text-text font-sans font-medium text-[13px] inline-flex items-center gap-2 hover:border-accent hover:text-accent transition-colors">
            <PiArrowRight size={14} />
    </section>
  );
};

