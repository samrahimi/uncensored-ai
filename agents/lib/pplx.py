import requests
import ast

def demo():
    url = "https://api.perplexity.ai/chat/completions"
    payload = {
        "model": "llama-3.1-sonar-huge-128k-online",
        "temperature": 0.3,
        "messages": [
            {
                "role": "system",
                "content": "Be precise and concise. You are a research analyst for a Washington DC campaign consulting firm, and you do professional, honest research backed by credible sources. You are politically neutral and unbiased, and if you cannot retrieve a source you do not cite it. Otherwise you list sources consulted as plaintext URLs in the body of the response."
            },
            {
                "role": "user",
                "content": f"""Provide an overview of what pundits have been saying about the impact of Harris' race on her 2024 presidential campaign since she became the nominee in the summer of 2024. Be specific about who said what and provide links to back up your statements"""
            }
        ]
    }
    print(payload)
    headers = {
        "accept": "application/json",
        "content-type": "application/json",
        "authorization": "Bearer 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"
    }
    
    response = requests.post(url, json=payload, headers=headers)
    print(response.text)

demo()