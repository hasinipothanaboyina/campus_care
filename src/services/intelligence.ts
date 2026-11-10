import { Submission, Priority, RecurringIssueGroup, CampusInsight, Urgency } from '../types';

/**
 * Calculates a transparent, rule-based priority score for a submission.
 * Formula:
 * Score = (Urgency Base) + (Supports * 15) + (Similar Reports * 25) + (Days Open * 5)
 */
export function calculatePriorityScore(
  urgency: Urgency,
  supportCount: number,
  similarReportCount: number = 0,
  createdAt: string
): { score: number; priority: Priority } {
  let urgencyWeight = 20;
  if (urgency === 'Medium') urgencyWeight = 40;
  if (urgency === 'High') urgencyWeight = 70;
  if (urgency === 'Critical') urgencyWeight = 100;

  const supportWeight = supportCount * 15;
  const recurringWeight = similarReportCount * 25;

  const daysOpen = Math.max(
    0,
    Math.floor((new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 3600 * 24))
  );
  const ageWeight = daysOpen * 5;

  const totalScore = urgencyWeight + supportWeight + recurringWeight + ageWeight;

  let priority: Priority = 'Low';
  if (totalScore >= 120) priority = 'Critical';
  else if (totalScore >= 80) priority = 'High';
  else if (totalScore >= 45) priority = 'Medium';

  return { score: totalScore, priority };
}

/**
 * Groups submissions into recurring issues based on location, building, room, and category.
 */
export function detectRecurringIssues(submissions: Submission[]): RecurringIssueGroup[] {
  const issuesOnly = submissions.filter(s => s.type === 'issue' && s.status !== 'Closed');
  const groupsMap = new Map<string, Submission[]>();

  issuesOnly.forEach(item => {
    // Key by building + room or normalized location + category
    const key = `${(item.building || item.location).toUpperCase()}_${(item.room || '').toUpperCase()}_${item.category.toUpperCase()}`;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, []);
    }
    groupsMap.get(key)!.push(item);
  });

  const recurringGroups: RecurringIssueGroup[] = [];

  groupsMap.forEach((items, key) => {
    if (items.length >= 1) { // 1 or more reports with supports or multiple reports
      const first = items[0];
      const totalSupports = items.reduce((acc, cur) => acc + cur.supportCount, 0);
      const totalReports = items.length;

      // Sort dates
      const sortedByDate = [...items].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      const firstReportedAt = sortedByDate[0].createdAt;
      const latestReportedAt = sortedByDate[sortedByDate.length - 1].createdAt;

      // Calculate aggregated priority
      const { priority } = calculatePriorityScore(
        first.urgency,
        totalSupports,
        totalReports - 1,
        firstReportedAt
      );

      recurringGroups.push({
        id: `REC-${key}`,
        title: `${first.category} Concern in ${first.building || first.location} ${first.room ? '- ' + first.room : ''}`,
        category: first.category,
        location: first.location,
        building: first.building || first.location,
        room: first.room || '',
        relatedSubmissions: items,
        totalReports,
        totalSupports,
        priority,
        status: items.some(i => i.status === 'In Progress')
          ? 'In Progress'
          : items.some(i => i.status === 'Assigned')
          ? 'Assigned'
          : items.some(i => i.status === 'Verified')
          ? 'Verified'
          : 'Submitted',
        firstReportedAt,
        latestReportedAt,
      });
    }
  });

  return recurringGroups.sort((a, b) => (b.totalReports + b.totalSupports) - (a.totalReports + a.totalSupports));
}

/**
 * Checks for existing open issues that match location/category to prevent duplicate reporting.
 */
export function findSimilarSubmissions(
  category: string,
  building: string,
  room: string,
  submissions: Submission[]
): Submission[] {
  if (!building) return [];
  const bUpper = building.trim().toUpperCase();
  const rUpper = room ? room.trim().toUpperCase() : '';

  return submissions.filter(s => {
    if (s.status === 'Closed' || s.status === 'Resolved') return false;
    const sameCategory = s.category.toUpperCase() === category.toUpperCase();
    const sameBuilding = (s.building || s.location).toUpperCase().includes(bUpper);
    const sameRoom = rUpper ? (s.room || '').toUpperCase().includes(rUpper) : true;
    return sameCategory && sameBuilding && sameRoom;
  });
}

/**
 * Generates transparent real-data insights for CMC and Analytics.
 */
export function generateCampusInsights(submissions: Submission[]): CampusInsight[] {
  if (submissions.length === 0) {
    return [
      {
        id: 'no-data',
        type: 'stat',
        title: 'System Ready',
        description: 'No submissions recorded yet. Insights will automatically populate as students submit concerns.',
      }
    ];
  }

  const insights: CampusInsight[] = [];

  // 1. Top Location Concentration
  const locationCounts: Record<string, number> = {};
  submissions.forEach(s => {
    const loc = s.building || s.location;
    locationCounts[loc] = (locationCounts[loc] || 0) + 1;
  });

  const sortedLocations = Object.entries(locationCounts).sort((a, b) => b[1] - a[1]);
  if (sortedLocations.length > 0) {
    const topLoc = sortedLocations[0];
    const percentage = Math.round((topLoc[1] / submissions.length) * 100);
    insights.push({
      id: 'top-location',
      type: 'trend',
      title: `High Activity in ${topLoc[0]}`,
      description: `${topLoc[0]} accounts for ${percentage}% of all campus submissions (${topLoc[1]} items).`,
      metric: `${percentage}%`,
      actionableSuggestion: `Schedule a dedicated facility audit for ${topLoc[0]} before the upcoming CMC meeting.`,
    });
  }

  // 2. High Support Concerns Alert
  const highlySupported = submissions.filter(s => s.supportCount >= 5 && s.status !== 'Resolved' && s.status !== 'Closed');
  if (highlySupported.length > 0) {
    insights.push({
      id: 'high-support-alert',
      type: 'alert',
      title: `${highlySupported.length} High-Support Concerns Pending`,
      description: `There are ${highlySupported.length} active concerns with 5+ student supports requiring immediate verification.`,
      metric: `${highlySupported.length} Concerns`,
      actionableSuggestion: 'Prioritize these high-support concerns in the priority queue to improve student trust.',
    });
  }

  // 3. Category Breakdown Insight
  const categoryCounts: Record<string, number> = {};
  submissions.forEach(s => {
    categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const topCat = sortedCategories[0];
    insights.push({
      id: 'top-category',
      type: 'recommendation',
      title: `Primary Focus: ${topCat[0]}`,
      description: `${topCat[0]}-related issues represent the largest category with ${topCat[1]} submissions.`,
      metric: `${topCat[1]} Reports`,
      actionableSuggestion: `Engage the ${topCat[0]} maintenance team for preventive maintenance routines.`,
    });
  }

  // 4. Resolution Efficiency Stat
  const resolvedCount = submissions.filter(s => s.status === 'Resolved' || s.status === 'Closed').length;
  const resolutionRate = Math.round((resolvedCount / submissions.length) * 100);
  insights.push({
    id: 'resolution-rate',
    type: 'stat',
    title: 'Resolution Rate',
    description: `${resolvedCount} out of ${submissions.length} total concerns have been successfully resolved.`,
    metric: `${resolutionRate}%`,
    actionableSuggestion: resolutionRate < 50 ? 'Increase review frequency to accelerate issue assignment.' : 'Maintain current resolution momentum.',
  });

  return insights;
}
