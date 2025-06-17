.PHONY: help build up down logs clean dev prod

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev       - Start development environment"
	@echo "  make prod      - Start production environment"
	@echo "  make build     - Build Docker images"
	@echo "  make up        - Start all services"
	@echo "  make down      - Stop all services"
	@echo "  make logs      - View logs"
	@echo "  make clean     - Clean up volumes and images"
	@echo "  make db-shell  - Access MySQL shell"
	@echo "  make backend-shell - Access backend container shell"
	@echo "  make fix-gmail-folders - Fix Gmail folder names in sync configs"

# Development commands
dev:
	docker-compose -f docker-compose.dev.yml up -d

dev-logs:
	docker-compose -f docker-compose.dev.yml logs -f

dev-down:
	docker-compose -f docker-compose.dev.yml down

# Production commands
prod:
	docker-compose up -d

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

# Utility commands
clean:
	docker-compose down -v
	docker system prune -f

db-shell:
	docker exec -it mailman-mysql mysql -u mailman -pmailmanpassword mailman

backend-shell:
	docker exec -it mailman-backend /bin/sh

# Database backup
db-backup:
	docker exec mailman-mysql mysqldump -u mailman -pmailmanpassword mailman > backup_$(shell date +%Y%m%d_%H%M%S).sql

# Database restore
db-restore:
	@echo "Usage: make db-restore FILE=backup_file.sql"
	docker exec -i mailman-mysql mysql -u mailman -pmailmanpassword mailman < $(FILE)


