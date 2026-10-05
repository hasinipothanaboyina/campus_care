import React from 'react';
import { useCampusCare } from '../../context/CampusCareContext';
import { BarChart3, PieChart, TrendingUp, MapPin, Layers, Sparkles } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { submissions, insights } = useCampusCare();

  // Category Distribution
  const categoryMap: Record<string, number> = {};
  submissions.forEach(s => {
    categoryMap[s.category] = (categoryMap[s.category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

  // Location Distribution
  const locationMap: Record<string, number> = {};
  submissions.forEach(s => {
    const loc = s.building || s.location;
    locationMap[loc] = (locationMap[loc] || 0) + 1;
  });
  const locationData = Object.entries(locationMap).sort((a, b) => b[1] - a[1]);

  // Status Distribution
  const statusMap: Record<string, number> = {};
  submissions.forEach(s => {
    statusMap[s.status] = (statusMap[s.status] || 0) + 1;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-indigo-600" />
          <span>Real-Data Campus Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Statistical distribution and data-backed intelligence derived directly from database records.
        </p>
      </div>

      {/* Generated Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {insights.map(ins => (
          <div key={ins.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">{ins.type}</span>
              {ins.metric && (
                <span className="px-2.5 py-0.5 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                  {ins.metric}
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900">{ins.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{ins.description}</p>
          </div>
        ))}
      </div>

      {/* Category Breakdown & Location Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Category Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Submissions by Category</span>
          </h2>

          <div className="space-y-3">
            {categoryData.map(([cat, count]) => {
              const percentage = Math.round((count / submissions.length) * 100) || 0;

              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{cat}</span>
                    <span>{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Location Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600" />
            <span>Submissions by Campus Location</span>
          </h2>

          <div className="space-y-3">
            {locationData.map(([loc, count]) => {
              const percentage = Math.round((count / submissions.length) * 100) || 0;

              return (
                <div key={loc} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-700">
                    <span>{loc}</span>
                    <span>{count} ({percentage}%)</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
