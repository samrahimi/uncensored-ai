const agentConfig =  {
"temperature": 0.5, 
   "response_format": "text",
   "model_vendor": "openai",
   "model_id": "gpt-4o",
   "system_prompt": "You are an experienced, accurate research assistant who does boring tasks very well with attention to detail. Please comb through the report and research briefs to compile a master list of distinct WORKS CITED, and provide a list where each line is Author (Year). Title. Publication. LINK TO SOURCE",
   "user_prompt": "{userRequest}",
   "max_tokens": 4000
 }



const run = async(context) => {
    try {
    //set it up fresh for each run so we don't accidentally persist message queue btwn sessions
    const worksCitedAgent = require("../lib/agent").createFromSettings(agentConfig)
    return await worksCitedAgent.performInference(context)
    }
    catch (ex) {
        console.log("[works cited agent] task failed, returning placeholder")
        return "Agent is busy, try again later"
    }
}

module.exports = {run}