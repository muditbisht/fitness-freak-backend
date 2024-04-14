# Install updates and NGINX
sudo apt update
sudo apt install nginx

# Start NGINX
sudo service nginx start

# Enable service startup at Boot
sudo systemctl enable nginx

# Check the service status
sudo service nginx status



# Install NVM (Node Version Manager)
curl https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
source ~/.bashrc 

# Install LTS version of Node.js (am using v16.14.2)
nvm install --lts
nvm use --lts
