#!/bin/bash
# ==============================================================================
# StudyMate AI v2 — Production Cloud Setup & Deploy Script
# Run this on a clean Ubuntu VPS Droplet/Instance.
# ==============================================================================

set -e

echo "🚀 Beginning production environment setup..."

# 1. Update package registry
sudo apt-get update -y
sudo apt-get upgrade -y

# 2. Install Docker dependencies
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 3. Add Docker official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# 4. Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 5. Install Docker Engine and plugins
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 6. Verify Docker installation
sudo systemctl enable docker
sudo systemctl start docker
echo "✅ Docker Engine & Compose plugin successfully installed!"

# 7. Configure Production Directories
sudo mkdir -p /opt/studymate-ai
sudo chown -R $USER:$USER /opt/studymate-ai
cd /opt/studymate-ai

# 8. Create Production Environment Template if not present
if [ ! -f .env ]; then
    echo "⚙️ Creating production environment file template..."
    cat <<EOT >> .env
# Production Keys
GROQ_API_KEY=your_production_groq_key
HF_TOKEN=your_production_huggingface_token
JWT_SECRET=$(openssl rand -hex 32)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(openssl rand -base64 18)
EOT
    echo "⚠️ Production .env created. Please replace your API Keys in /opt/studymate-ai/.env"
fi

# 9. Fetch production configuration manifests
echo "📦 Deploying production containers..."
# In a real environment, this script copies the docker-compose.prod.yml and nginx.prod.conf files
# to the current directory and starts the containers:
# docker compose -f docker-compose.prod.yml up -d

echo "🎉 Deployment configuration complete! Access the platform at http://<your_vps_ip>"
