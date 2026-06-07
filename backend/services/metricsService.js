const { Project } = require("../models/planModel");

function countWords(value = "") {
  return String(value).replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
}

async function getMetrics() {
  const [totalPlans, activeUserIds, enhancedPlans, enhancedProjects] = await Promise.all([
    Project.countDocuments(),
    Project.distinct("userId"),
    Project.countDocuments({ enhanced: true }),
    Project.find({ enhanced: true }).select("sections enhancedData").lean().exec()
  ]);

  const totalInsights = enhancedProjects.reduce((total, project) => {
    const enhancedDataWords = Object.values(project.enhancedData || {}).reduce((sum, value) => sum + countWords(value), 0);
    const sectionWords = Object.values(project.sections || {}).reduce((sum, value) => sum + countWords(value), 0);
    return total + enhancedDataWords + sectionWords;
  }, 0);

  return {
    totalPlans,
    activeUsers: activeUserIds.length,
    enhancedPlans,
    totalInsights
  };
}

module.exports = { getMetrics };
