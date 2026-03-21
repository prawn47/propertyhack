const { getClient } = require('../lib/prisma');

function getTodayUTC() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function getOrCreateToday(prisma) {
  const db = prisma || getClient();
  const today = getTodayUTC();

  let run = await db.dailyWizardRun.findFirst({
    where: { date: today },
  });

  if (!run) {
    run = await db.dailyWizardRun.create({
      data: { date: today },
    });
  }

  return run;
}

async function updateRun(id, data, prisma) {
  const db = prisma || getClient();

  const allowedFields = [
    'currentStep', 'newsletterId', 'newsletterApproved', 'newsletterSent',
    'socialPostsApproved', 'hotTakeCreated', 'hotTakePostId',
    'allPublished', 'metricsReviewed', 'completedAt',
  ];

  const updateData = {};
  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      updateData[field] = data[field];
    }
  }

  return db.dailyWizardRun.update({
    where: { id },
    data: updateData,
  });
}

async function completeRun(id, prisma) {
  const db = prisma || getClient();

  return db.dailyWizardRun.update({
    where: { id },
    data: {
      completedAt: new Date(),
      metricsReviewed: true,
    },
  });
}

function isWeekday(date) {
  const day = date.getUTCDay();
  return day !== 0 && day !== 6;
}

function prevWeekday(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - 1);
  while (!isWeekday(d)) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d;
}

async function getStreak(prisma) {
  const db = prisma || getClient();

  const completedRuns = await db.dailyWizardRun.findMany({
    where: { completedAt: { not: null } },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (completedRuns.length === 0) {
    return { current: 0, max: 0 };
  }

  const completedDates = new Set(
    completedRuns.map((r) => r.date.toISOString().split('T')[0])
  );

  // Count current streak backwards from today (or most recent weekday)
  let current = 0;
  let checkDate = getTodayUTC();

  // If today is a weekend, start from the most recent Friday
  if (!isWeekday(checkDate)) {
    checkDate = prevWeekday(checkDate);
  }

  while (completedDates.has(checkDate.toISOString().split('T')[0])) {
    current++;
    checkDate = prevWeekday(checkDate);
  }

  // Count max streak from all completed runs
  let max = 0;
  let streak = 0;
  // Walk all weekdays from the earliest completed date to today
  if (completedRuns.length > 0) {
    const earliest = completedRuns[completedRuns.length - 1].date;
    let d = new Date(Date.UTC(earliest.getUTCFullYear(), earliest.getUTCMonth(), earliest.getUTCDate()));
    const today = getTodayUTC();

    while (d <= today) {
      if (isWeekday(d)) {
        if (completedDates.has(d.toISOString().split('T')[0])) {
          streak++;
          if (streak > max) max = streak;
        } else {
          streak = 0;
        }
      }
      d.setUTCDate(d.getUTCDate() + 1);
    }
  }

  return { current, max };
}

async function getCalendarData(month, year, prisma) {
  const db = prisma || getClient();

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 1));

  const runs = await db.dailyWizardRun.findMany({
    where: {
      date: { gte: startDate, lt: endDate },
      completedAt: { not: null },
    },
    select: { date: true },
  });

  return runs.map((r) => r.date.toISOString().split('T')[0]);
}

module.exports = {
  getOrCreateToday,
  updateRun,
  completeRun,
  getStreak,
  getCalendarData,
};
