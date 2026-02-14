.PHONY: help install dev build start clean \
       typecheck lint format check \
       test test-watch test-e2e \
       db-start db-stop db-reset db-migrate db-seed \
       docker-build docker-up docker-down \
       supabase-start supabase-stop supabase-status

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# ─── Development ──────────────────────────────────────────────

install: ## Install dependencies
	npm install --legacy-peer-deps

dev: ## Start dev server
	npm run dev

build: ## Build for production
	npm run build

start: build ## Build and start production server
	npm run start

clean: ## Remove build artifacts and node_modules
	rm -rf build node_modules .react-router

# ─── Code Quality ─────────────────────────────────────────────

typecheck: ## Run TypeScript type checking
	npm run typecheck

lint: ## Run ESLint
	npm run lint

format: ## Format code with Prettier
	npm run format

check: typecheck lint ## Run typecheck + lint

# ─── Testing ──────────────────────────────────────────────────

test: ## Run unit tests
	npm run test

test-watch: ## Run unit tests in watch mode
	npm run test:watch

test-e2e: ## Run Playwright E2E tests
	npm run test:e2e

test-all: test test-e2e ## Run all tests

# ─── Supabase (full local stack) ──────────────────────────────

supabase-start: ## Start local Supabase (auth, realtime, storage, db)
	npx supabase start

supabase-stop: ## Stop local Supabase
	npx supabase stop

supabase-status: ## Show Supabase service status and URLs
	npx supabase status

# ─── Database ─────────────────────────────────────────────────

db-start: ## Start Postgres via docker compose
	docker compose up -d postgres

db-stop: ## Stop Postgres
	docker compose down postgres

db-reset: ## Reset database (drop + recreate + migrate + seed)
	npx supabase db reset

db-migrate: ## Run pending migrations
	npx supabase migration up

db-push: ## Push migrations to remote database (uses DB_URL from .env)
	npx supabase db push

db-seed: ## Seed the database with test data
	npx supabase db reset --no-migrations && npx supabase migration up
	psql "postgresql://postgres:postgres@localhost:54322/postgres" -f supabase/seed.sql

# ─── Docker ───────────────────────────────────────────────────

docker-build: ## Build the app Docker image
	docker compose build app

docker-up: ## Start all services (app + postgres)
	docker compose up -d

docker-down: ## Stop all services
	docker compose down

docker-logs: ## Tail logs from all services
	docker compose logs -f
