export const calculateMatchingPercentage = (studentTechStack, mentorExpertise) => {
  if (!studentTechStack || !studentTechStack.length || !mentorExpertise || !mentorExpertise.length) {
    return 0;
  }
  
  // Convert all items to lowercase for case-insensitive comparison
  const studentTech = studentTechStack.map(tech => tech.toLowerCase());
  const mentorTech = mentorExpertise.map(tech => tech.toLowerCase());
  
  // Find intersection (matching technologies)
  const intersection = studentTech.filter(tech => mentorTech.includes(tech));
  
  // Calculate percentage - based on how many student technologies match mentor expertise
  const matchingPercentage = (intersection.length / studentTech.length) * 100;
  
  return Math.round(matchingPercentage); // Round to nearest integer
};
