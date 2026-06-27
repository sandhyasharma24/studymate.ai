import os
import re

api_dir = 'src/api'

for filename in os.listdir(api_dir):
    if not filename.endswith('.ts'): continue
    filepath = os.path.join(api_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace apiClient.get('/v1/...) with apiClient.get('/...)
    content = re.sub(r"(apiClient\.(get|post|put|delete|patch)\(')/v1/", r"\1/", content)
    # Replace apiClient.get(/v1/...) with apiClient.get(/...)
    content = re.sub(r"(apiClient\.(get|post|put|delete|patch)\()/v1/", r"\1/", content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {filename}')
