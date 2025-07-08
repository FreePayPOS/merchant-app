.PHONY: help install build test lint clean docker-build docker-run docker-stop

# Default target
help:
	@echo "Available commands:"
	@echo "  install      - Install dependencies"
	@echo "  build        - Build the application"
	@echo "  test         - Run tests"
	@echo "  test-watch   - Run tests in watch mode"
	@echo "  test-coverage- Run tests with coverage"
	@echo "  lint         - Run linting"
	@echo "  lint-fix     - Fix linting issues"
	@echo "  clean        - Clean build artifacts"
	@echo "  dev          - Start development server"
	@echo "  start        - Start production server"
	@echo "  docker-build - Build Docker image"
	@echo "  docker-run   - Run with Docker Compose"
	@echo "  docker-stop  - Stop Docker Compose"
	@echo "  validate     - Run lint, type-check, and tests"

install:
	npm install

build:
	npm run build

test:
	npm test

test-watch:
	npm run test:watch

test-coverage:
	npm run test:coverage

lint:
	npm run lint

lint-fix:
	npm run lint:fix

clean:
	npm run clean
	rm -rf coverage
	rm -rf logs/*.log

dev:
	npm run dev

start:
	npm start

docker-build:
	docker build -t merchant-app .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

validate:
	npm run validate

# Development setup
setup: install
	@echo "Setting up development environment..."
	@if [ ! -f .env ]; then \
		echo "Creating .env file..."; \
		echo "ALCHEMY_API_KEY=your_alchemy_api_key_here" > .env; \
		echo "NODE_ENV=development" >> .env; \
		echo "PORT=3000" >> .env; \
		echo "Please update .env with your actual API keys"; \
	fi
	@echo "Development environment setup complete!"

# Production deployment
deploy: build test lint
	@echo "All checks passed! Ready for deployment." 