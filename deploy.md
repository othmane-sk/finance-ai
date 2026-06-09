# Production Deployment Guide (VPS & Railway)

This document provides a step-by-step checklist to deploy the **Personal Finance AI Assistant** to a production server (Ubuntu VPS or Railway).

---

## Option A: Deploying on Railway (Recommended)

Railway is the easiest cloud provider to host this application with a managed MySQL database.

### Step 1: Add a MySQL Database
1. Go to your [Railway Dashboard](https://railway.app).
2. Click **New Project** -> **Provision MySQL**.
3. Railway will spin up a MySQL service and provide a `MYSQL_URL` and individual database credentials (host, port, database name, user, password).

### Step 2: Configure Environment Variables
In your Railway Laravel service, configure the following variables in the **Variables** tab:
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_KEY=base64:YOUR_GENERATED_APP_KEY` (Generate locally using `php artisan key:generate --show`)
- `APP_URL=https://your-app-url.up.railway.app`
- `DB_CONNECTION=mysql`
- `DB_HOST=${{MySQL.MYSQLHOST}}` (Railway template mapping)
- `DB_PORT=${{MySQL.MYSQLPORT}}`
- `DB_DATABASE=${{MySQL.MYSQLDATABASE}}`
- `DB_USERNAME=${{MySQL.MYSQLUSER}}`
- `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
- `CHATBOT_PROVIDER=openai` (or `gemini` / `groq`)
- `CHATBOT_API_KEY=your-api-key`

### Step 3: Run Database Migrations on Deploy
Add a start command or custom deployment script to run migrations:
```bash
php artisan migrate --force && php artisan db:seed --force
```

---

## Option B: Deploying on Ubuntu VPS (Nginx + MySQL)

### Step 1: System Package Update
Connect to your VPS via SSH and update the system:
```bash
sudo apt update && sudo apt upgrade -y
```

### Step 2: Install PHP 8.2 & Extensions
Install PHP and the extensions required by Laravel 12:
```bash
sudo apt install -y php8.2-cli php8.2-fpm php8.2-mysql php8.2-sqlite3 php8.2-curl php8.2-xml php8.2-bcmath php8.2-mbstring php8.2-zip php8.2-intl php8.2-gd php8.2-soap
```

### Step 3: Install Nginx & MySQL
```bash
sudo apt install -y nginx mysql-server
```
Secure your MySQL server installation:
```bash
sudo mysql_secure_installation
```
Create a database and user:
```sql
CREATE DATABASE finance_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'finance_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON finance_ai.* TO 'finance_user'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Install Composer & Node.js
```bash
# Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Node.js (V18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### Step 5: Upload and Configure Project
Clone your project repository to `/var/www/finance-ai` and set permissions:
```bash
sudo chown -R $USER:$USER /var/www/finance-ai
cd /var/www/finance-ai

# Install dependencies
composer install --no-dev --optimize-autoloader
npm install
npm run build

# Set storage and bootstrap cache permissions
sudo chown -R www-data:www-data storage bootstrap/cache
sudo chmod -R 775 storage bootstrap/cache
```

### Step 6: Configure .env
Copy `.env.example` to `.env` and adjust the variables:
```bash
cp .env.example .env
nano .env
```
Generate the app key:
```bash
php artisan key:generate
```

### Step 7: Configure Nginx Server Block
Copy the `nginx.conf` template from the project root into Nginx sites-available:
```bash
sudo cp nginx.conf /etc/nginx/sites-available/finance-ai
sudo ln -s /etc/nginx/sites-available/finance-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Step 8: Cache Configuration & Run Migrations
Run these optimizations inside the project directory:
```bash
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan migrate --force
```
Seeding is optional and can be done to populate demo data:
```bash
php artisan db:seed --force
```
