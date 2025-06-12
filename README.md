# B1_WebA

## Description
A web application project with database integration and Docker support.

## Prerequisites
- Node.js (v18 or higher)
- Docker
- Docker Compose
- Git

## Installation Guide

### 1. Clone the Repository
```bash
git clone <repository-url>
cd B1_WebA
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Using Docker
1. Start the database container:
```bash
docker-compose up -d db
```

2. The database will be initialized with the following configuration:
- Host: localhost
- Port: 5432
- Username: postgres
- Password: postgres
- Database: b1_web_a

### 4. Environment Setup
1. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

2. Update the environment variables as needed:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/b1_web_a"
```

### 5. Run the Application
```bash
npm run dev
```

The application should now be running at `http://localhost:3000`

## Docker Commands Reference

### Start all services
```bash
docker-compose up -d
```

### Stop all services
```bash
docker-compose down
```

### View logs
```bash
docker-compose logs -f
```

### Rebuild containers
```bash
docker-compose build
```

## Database Management

### Access PostgreSQL CLI
```bash
docker exec -it b1_web_a_db psql -U postgres
```

### Create a new database
```bash
docker exec -it b1_web_a_db psql -U postgres -c "CREATE DATABASE b1_web_a"
```

### Run database migrations
```bash
npm run migrate
```

## Troubleshooting

If you encounter any issues with the database connection:
1. Ensure Docker is running
2. Check if the database container is up:
```bash
docker ps
```
3. Verify the database credentials in your `.env` file
4. Try restarting the database container:
```bash
docker-compose restart db
```

## Additional Information
For more detailed information about the project structure and features, please refer to the documentation in the `/docs` directory.