from dotenv import load_dotenv
from anthropic import Anthropic

load_dotenv()

client = Anthropic()

response = client.messages.create(
    model="claude-sonnet-4-5",
    max_tokens=1024,
    messages=[
        {
            "role": "user",
            "content": "Hello, Claude! In one sentence, what makes a good cup of coffee?",
        }
    ],
)

for block in response.content:
    if block.type == "text":
        print(block.text)
