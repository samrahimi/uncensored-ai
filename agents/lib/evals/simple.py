import re
import json
import openai
from textstat import flesch_kincaid_grade
import argparse
from pathlib import Path

# Set up your OpenAI API key
openai.api_key = ""


def get_llm_ratings(text, title):
    prompt = f"""Please evaluate the following historical article titled "{title}" based on these criteria:

1. Factual Accuracy: How accurate and reliable are the facts presented? (1-5)
2. Depth of Analysis: How well does the article explore the topic in depth? (1-5)
3. Engaging Writing Style: How engaging and readable is the article? (1-5)
4. Historical Context: How well does the article provide historical context? (1-5)

Please provide your ratings as a JSON object with the following structure:
{{
  "factual_accuracy": 0,
  "depth_analysis": 0,
  "engaging_style": 0,
  "historical_context": 0
}}

Here's the article:

{text}

JSON ratings:"""

    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are an expert historian and writer tasked with evaluating historical articles."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
        temperature=0.2,  # Lower temperature for more consistent outputs
    )

    ratings = json.loads(response.choices[0].message.content)
    return ratings

def evaluate_article(text, title):
    score = 0
    
    # Automated checks
    word_count = len(text.split())
    score += min(5, word_count / 1000)  # 5 points max for length
    
    readability = flesch_kincaid_grade(text)
    score += max(0, (18 - readability) / 2)  # Higher score for more accessible text, max 5 points
    
    citation_count = len(re.findall(r'\[.*?\]', text))
    score += min(5, citation_count)  # 5 points max for citations
    
    # LLM scoring
    llm_ratings = get_llm_ratings(text, title)
    score += sum(llm_ratings.values())
    
    max_score = 35  # Adjust based on your scoring system
    normalized_score = (score / max_score) * 100
    
    return {
        "final_score": normalized_score,
        "word_count": word_count,
        "flesch_kincaid_grade": readability,
        "citation_count": citation_count,
        "llm_ratings": llm_ratings
    }

def main():
    parser = argparse.ArgumentParser(description="Evaluate a historical article from a file.")
    parser.add_argument("input_file", type=str, help="Path to the input file containing the article text")
    parser.add_argument("--title", type=str, default="Untitled Article", help="Title of the article (optional)")
    args = parser.parse_args()

    input_file = Path(args.input_file)
    if not input_file.is_file():
        print(f"Error: The file '{input_file}' does not exist.")
        return

    try:
        with open(input_file, 'r', encoding='utf-8') as file:
            article_text = file.read()
    except IOError as e:
        print(f"Error reading the file: {e}")
        return

    evaluation_results = evaluate_article(article_text, args.title)
    
    # Format the results as a JSON object
    output = {
        "final_score": round(evaluation_results["final_score"], 2),
        "word_count": evaluation_results["word_count"],
        "flesch_kincaid_grade": round(evaluation_results["flesch_kincaid_grade"], 2),
        "citation_count": evaluation_results["citation_count"],
        "llm_ratings": evaluation_results["llm_ratings"]
    }
    
    # Print the JSON output to the console
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()