import os
import re

domain_dir = 'src/main/java/com/studymate/gateway/domain'

for filename in os.listdir(domain_dir):
    if not filename.endswith('.java'): continue
    filepath = os.path.join(domain_dir, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    if '@ManyToOne' in content:
        # Add import if not present
        if 'import com.fasterxml.jackson.annotation.JsonIgnore;' not in content:
            content = content.replace('import jakarta.persistence.*;', 'import jakarta.persistence.*;\nimport com.fasterxml.jackson.annotation.JsonIgnore;')
        
        # Add @JsonIgnore above @ManyToOne
        content = re.sub(r'(\s*)(@ManyToOne)', r'\1@JsonIgnore\1\2', content)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filename}')
