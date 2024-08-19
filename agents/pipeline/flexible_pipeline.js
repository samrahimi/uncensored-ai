const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const utils = require('../lib/utils')
// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });
  // Initialize the context object to store intermediate results
var context = { };




const agentFactory = require('../lib/agent');
const { object } = require('zod');
const logContext=() => console.log(JSON.stringify(context, null, 2))
async function runPipeline(configPath, userRequest, customProjectId) {
  context = {userRequest}
  // Read and parse the configuration file
  //const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const config = require(configPath).load()
  // Generate a unique project ID
  const PROJECT_ID = customProjectId || 'project-' + Date.now().toString(36) + Math.random().toString(36).substr(2);

  // Create a new folder for the project
  const projectDir = path.join(process.cwd(), process.env.OUTPUT_PATH || "outputs", PROJECT_ID);
  fs.mkdirSync(projectDir, { recursive: true });


  // Execute each step in the pipeline
  for (const step of config.steps) {
    console.log(`\n--- Executing step: ${step.name} ---`);

    switch (step.type) {
      case 'standard_inference':
        await executeStandardInference(step, projectDir);
        logContext()
        break;
      case 'mapper':
        await executeMapperFunction(step, projectDir);
        logContext()

        break;
      case 'reducer':
        await executeReducer(step, projectDir);
        break;
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  console.log('\n--- Pipeline execution completed ---');
  return context;
}

async function executeStandardInference(step, projectDir) {
  const agent = agentFactory.createFromSettings(step.config);

  //if you specify an input_key and context[input_key] is an object
  //we make a temporary_context object containing all of the keys in context
  //AND all of the keys in context[input_key] merged into one object

  //this lets you bind your prompt templates to properties of the input object or other properties in the context
  //if input_key is not specified, or context[input_key] is NOT an object
  //then you can bind prompt templates to any top level key in the context. input_key is ignored and has no effect

  //example: context: {user_profile: {name: 'Hamster dog', species:'Unclear', annoying: true}}
  //         input_key: "user_profile"
             
  //           since context.user_profile is an object, and user_profile is the input key, 
  //           we merge it into the top level context resulting in:

  //           temporary_context = {name: 'hamster dog', species: 'unclear', annoying: true, user_profile: {name: 'Hamster dog', species:'Unclear', annoying: true}}
  //           Therefore, in your step.config.user_prompt or system_prompt templates, using 
  //           {name} will become 'hamster dog', etc... 
  //           {user_profile} will become the serialized context.user_profile (name, species, annoying)


  const temporary_context = (step.config.input_key && typeof context[step.config.input_key] == "object") ? 
                      {...context, ...context[step.config.input_key]} 
                      
                      : 
                      
                      context
  
  
    
  const promptContent = replaceVariables(step.config.user_prompt, temporary_context);

  console.log("PROMPT:", promptContent)

  let result = await agent.performInference(promptContent);

  // Save the result to a file
  fs.writeFileSync(path.join(projectDir, `${step.name}_output.md`), result);

  // Update the context with the result
  if (step.config.response_format && step.config.response_format == "json_object")
    result = utils.fixJson(result)
  context[step.config.output_key] = result;
  return result;
}

async function executeMapperFunction(step, projectDir) {
  const agent = agentFactory.createFromSettings(step.config);
  //const current_context = step.config.context_key ? context[step.config.input_key][step.config.context_key]: "" //an optional shared context value for all tasks, taken from output of previous stage
  
  const input_context = context[step.config.input_key] //should be JSON object
  var tasks = input_context[step.config.tasks_key] //the array of tasks to map

  console.log(JSON.stringify(step.config, null, 2))
  if (step.config.task_transform) 
    tasks = step.config.task_transform(tasks)    
  
  let results = [];

  for (let i = 0; i < tasks.length; i++) {
    //merge the keys from the context and input_context so they can be used in the template... same with the task
    const flattened_task_context =  {...context, ...input_context, task: tasks[i] }
    console.log(JSON.stringify(flattened_task_context))
     
    const promptContent = replaceVariables(step.config.user_prompt, flattened_task_context);
    console.log("PROMPT: "+promptContent)
    const result = await agent.performInference(promptContent);
    results.push({ id: i, task: tasks[i], output: result });

    // Save individual task results
    fs.writeFileSync(path.join(projectDir, `${step.name}_task_${i + 1}.md`), result);
  }
  if (step.config.output_transform) 
    results = step.config.output_transform(results)
  
  context[step.config.output_key] = results

}

function executeReducer(step, projectDir) {
  const {config} = step
  const inputData = context[config.input_key];
  let result;
  if (step.config.custom_reduce_function) {
      const f = eval(config.reduce_function)
      result = f(inputData)
  } else {
  switch (config.reduce_function) {
      case 'concatenate':
        if (config.include_task_prompts) 
          result = inputData.map(item => `${config.task_prompt_prefix}${item.task}\n\n${config.task_response_prefix}${item.output}`).join(config.delimiter);
        else
          result = inputData.map(item => `${config.task_response_prefix}${item.output}`).join(config.delimiter);
        console.log(JSON.stringify(result, null, 2))
        break;
      // Add more reduce functions as needed
      default:
        throw new Error(`Unknown reduce function: ${step.config.reduce_function}`);
    }
  }

  // Update the context with the reduced result
  context[config.output_key] = result;

  // Save 
  fs.writeFileSync(path.join(projectDir, `${step.name}.md`), result);

}

function replaceVariables(template, context) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] || match;
  });
}

// Example usage
const configPath = process.argv[2];
const userRequest = process.argv[3];
const customProjectId = process.argv[4]

runPipeline(configPath, userRequest, customProjectId)
  .then(result => console.log('Final result:', result))
  .catch(error => console.error('An error occurred:', error));