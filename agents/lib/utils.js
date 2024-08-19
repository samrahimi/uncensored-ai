const { transformSync } = require("next/dist/build/swc");

const transforms = {
    "groupItemsBySection" : (items) => {
    const groupedItems= [];
  
    items.forEach((item) => {
      const sectionMatch = item.task.match(/^\[(.*?)\]/); // Extract section name
      const sectionName = sectionMatch ? sectionMatch[1] : 'Unknown'; // Default to 'Unknown' if no section
  
      const existingSection = groupedItems.find(
        (group) => group.section === sectionName
      );
  
      if (existingSection) {
        existingSection.items.push(item);
      } else {
        groupedItems.push({ section: sectionName, items: [item] });
      }
    });
  
    return {grouped_items: groupedItems};
  }
}
const fixJson = (rawText) => {
    if (typeof rawText === "string") {
        console.log("String output detected, attempting JSON conversion")
        const trimmed = rawText.trim()
        if (trimmed.startsWith("{"))
            return JSON.parse(trimmed)
        else if (trimmed.indexOf("```json")> - 1) {
            const payload = trimmed.split("```json")[1].split("```")[0]
            return JSON.parse(payload)
        } else
        {
            console.error("Text is not valid JSON... will return generic")
            return {text: trimmed}
        }
    } else {
        return rawText //its already json, nothing to do
    }
}

module.exports = {fixJson, transforms}