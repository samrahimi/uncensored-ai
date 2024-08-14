const fs = require('fs');
const path = require('path');

//run with command line prompt

//agent profile to load
const config = "models/"+process.argv[2] +".json"

//initial prompt to engage the team
const userRequest = process.argv[3];

// Read settings from file
const settings = JSON.parse(fs.readFileSync(config));

// Generate a unique project ID
const PROJECT_ID = 'project-' + Date.now().toString(36) + Math.random().toString(36).substr(2);

// Create a new folder for the project
const projectDir = path.join(process.cwd(), "research", PROJECT_ID);
fs.mkdirSync(projectDir);

const agentFactory = require('../lib/agent')
const worksCitedAgent = require('../helper_agents/works_cited_bot')
async function run(userRequest) {
  try {
    // Create agents for each stage
    const planningAgent = agentFactory.createFromSettings(settings.planning);
    const researchAgent = agentFactory.createFromSettings(settings.research);
    const deliveryAgent = agentFactory.createFromSettings(settings.delivery);

    // 1. Project Planning
    const projectPlan = await planningAgent.performInference(
      settings.planning.user_prompt.replace('{userRequest}', userRequest)
    );

    fs.writeFileSync(path.join(projectDir, `project_plan.md`), projectPlan)

    const parsedProjectPlan = JSON.parse(projectPlan);

    console.log('\n--- Project Plan ---');
    console.log(`Project Description: ${parsedProjectPlan.project_description}`);
    console.log('\nTasks:');
    parsedProjectPlan.task_descriptions.forEach((task, index) => {
      console.log(`${index + 1}. ${task}`);
    });

    // 2. Task Research
    const COMPLETED_TASKS = [];
    for (let i = 0; i < parsedProjectPlan.task_descriptions.length; i++) {
      const task = parsedProjectPlan.task_descriptions[i];
      const taskResponse = await researchAgent.performInference(
        settings.research.user_prompt
          .replace('{projectDescription}', parsedProjectPlan.project_description)
          .replace('{task}', JSON.stringify(task))
      );
      COMPLETED_TASKS.push(taskResponse);
      fs.writeFileSync(path.join(projectDir, `task_${i + 1}.md`), taskResponse);

      console.log(`\n--- Task ${i + 1} Completed ---`);
      console.log(taskResponse);
    }

    // 3. Final Report Generation
    let promptContent = `Project Description: ${parsedProjectPlan.project_description}\n\n`;
    for (let i = 0; i < COMPLETED_TASKS.length; i++) {
      promptContent += `Research Report ${i + 1}: ${parsedProjectPlan.task_descriptions[i]}\n${COMPLETED_TASKS[i]}\n\n`;
    }
    const FINAL_REPORT = await deliveryAgent.performInference(
      settings.delivery.user_prompt.replace('{promptContent}', promptContent)
    );

    // 4. Post-processing and Final Report Creation
    let finalReportWithResearchBriefs = `${FINAL_REPORT}\n\n`;
    for (let i = 0; i < COMPLETED_TASKS.length; i++) {
      finalReportWithResearchBriefs += `---\n\n${COMPLETED_TASKS[i]}\n\n`;
    }

    // 5. Create and append a list of works cited in this report, but do not include raw research notes
    const WORKS_CITED = await worksCitedAgent.run(finalReportWithResearchBriefs)
    const FINAL_REPORT_WITH_SOURCES = FINAL_REPORT+`\n\n## Works Cited \n\n${WORKS_CITED}`
    fs.writeFileSync(path.join(projectDir, 'final_report.md'), FINAL_REPORT_WITH_SOURCES);

    console.log('\n--- Final Report ---');
    console.log(FINAL_REPORT_WITH_SOURCES);

    console.log(`\nProject completed successfully. Final report saved to: ${projectDir}/final_report.md`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}


run(userRequest);