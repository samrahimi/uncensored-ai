require('dotenv').config({ path: '../.env' });

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


const COMPLETED_TASKS=[]
function runTask(projectDescription, task, index) {
  const researchAgent = agentFactory.createFromSettings(settings.research);

  return new Promise((resolve, reject) => {
    // if (COMPLETED_TASKS.filter(x => x.index == index).length > 0) {
    //   console.log(`Task ${index + 1} already completed. Skipping.`);
    //   return COMPLETED_TASKS.filter(x => x.index == index)[0].output;
    // }

      researchAgent.performInference(
        settings.research.user_prompt
          .replace('{projectDescription}', projectDescription)
          .replace('{task}', task)
      ).then(taskResponse => {
        fs.writeFile(path.join(projectDir, `task_${index + 1}.md`), taskResponse, () => {
          console.log(`\n--- Task ${index + 1} Completed ---`);
          console.log(taskResponse);
          resolve(taskResponse);
        });
  
      }).catch((error) => {
          const errorMessage = `Error in Task ${index + 1}: ${error.message}`;
          console.error(errorMessage);
          //fs.writeFileSync(path.join(projectDir, `task_${index + 1}_error.md`), errorMessage);
          
          reject(errorMessage);
    })

})
}  
    


async function run(userRequest) {
  try {
    // Create agents for each stage
    const planningAgent = agentFactory.createFromSettings(settings.planning);
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

    const promises = []
    for (let i=0; i< parsedProjectPlan.task_descriptions.length; i++) {
      let task = parsedProjectPlan.task_descriptions[i]
      console.log(`${i + 1}. ${task}`);
      const that=this
      promises.push(() => runTask(parsedProjectPlan.project_description, task, i))
    }


    var COMPLETED_TASKS = await Promise.all(promises.map(task => task()));
    

    // 3. Final Report Generation
    let promptContent = `Project Description: ${parsedProjectPlan.project_description}\n\n`;
    for (let i = 0; i < COMPLETED_TASKS.length; i++) {
      promptContent += `Research Report ${i + 1}: ${parsedProjectPlan.task_descriptions[i]}\n${COMPLETED_TASKS[i]}\n\n`;
    }

    console.log("--- FINAL PROMPT ---")
    console.log(promptContent)

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