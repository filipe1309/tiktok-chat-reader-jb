.PHONY: help install build clean dev dev-watch lint lint-fix test start build-exe all check-deps

# Variables
NODE := node
NPM := npm
TSC := npx tsc
TS_NODE := npx ts-node
ESLINT := npx eslint
PKG := npx pkg

# Directories
SRC_DIR := src
DIST_DIR := dist
PUBLIC_DIR := public
NODE_MODULES := node_modules

# Colors for output (using printf-compatible format)
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m# No Color

# Default target
.DEFAULT_GOAL := help

## help: Display this help message
help:
	@printf "$(BLUE)TikTok Chat Reader - Available Commands$(NC)\n"
	@printf "\n"
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## /  /' | awk -F': ' '{printf "$(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@printf "\n"

## install: Install project dependencies
install: check-node
	@printf "$(BLUE)📦 Installing dependencies...$(NC)\n"
	@$(NPM) install
	@printf "$(GREEN)✓ Dependencies installed successfully$(NC)\n"

## check-deps: Check if dependencies are installed
check-deps:
	@if [ ! -d "$(NODE_MODULES)" ]; then \
		printf "$(YELLOW)⚠️  Dependencies not found. Running 'make install'...$(NC)\n"; \
		$(MAKE) install; \
	fi

## check-node: Verify Node.js version
check-node:
	@printf "$(BLUE)Checking Node.js version...$(NC)\n"
	@node_version=$$($(NODE) --version | cut -d'v' -f2 | cut -d'.' -f1); \
	if [ $$node_version -lt 18 ]; then \
		printf "$(RED)✗ Node.js version 18 or higher is required$(NC)\n"; \
		exit 1; \
	else \
		printf "$(GREEN)✓ Node.js version OK ($$($(NODE) --version))$(NC)\n"; \
	fi

## clean: Remove build artifacts
clean:
	@printf "$(BLUE)🧹 Cleaning build artifacts...$(NC)\n"
	@rm -rf $(DIST_DIR)
	@printf "$(GREEN)✓ Clean complete$(NC)\n"

## clean-all: Remove build artifacts and dependencies
clean-all: clean
	@printf "$(BLUE)🧹 Removing node_modules...$(NC)\n"
	@rm -rf $(NODE_MODULES)
	@printf "$(GREEN)✓ Full clean complete$(NC)\n"

## build: Compile TypeScript to JavaScript
build: check-deps clean
	@printf "$(BLUE)📝 Compiling TypeScript...$(NC)\n"
	@$(NPM) run build
	@printf "$(GREEN)✓ Build complete$(NC)\n"

## dev: Run development server
dev: check-deps
	@printf "$(BLUE)🚀 Starting development server...$(NC)\n"
	@$(NPM) run dev

## dev-watch: Run development server with auto-reload
dev-watch: check-deps
	@printf "$(BLUE)🚀 Starting development server with auto-reload...$(NC)\n"
	@$(NPM) run dev:watch

## start: Start production server
start: build
	@printf "$(BLUE)🚀 Starting production server...$(NC)\n"
	@$(NPM) run start

## lint: Run ESLint
lint: check-deps
	@printf "$(BLUE)🔍 Running linter...$(NC)\n"
	@$(NPM) run lint

## lint-fix: Run ESLint with auto-fix
lint-fix: check-deps
	@printf "$(BLUE)🔧 Running linter with auto-fix...$(NC)\n"
	@$(NPM) run lint:fix
	@printf "$(GREEN)✓ Lint fixes applied$(NC)\n"

## build-exe: Build cross-platform executables
build-exe: check-deps
	@printf "$(BLUE)🔨 Building executables...$(NC)\n"
	@chmod +x build-exe-pkg-ts.sh
	@./build-exe-pkg-ts.sh
	@printf "$(GREEN)✓ Executables built successfully$(NC)\n"

## watch: Watch for file changes and rebuild
watch: check-deps
	@printf "$(BLUE)👀 Watching for changes...$(NC)\n"
	@$(TSC) --watch

## verify: Run linter and type check
verify: lint
	@printf "$(BLUE)✓ Verification complete$(NC)\n"

## all: Clean, install, build, and verify
all: clean-all install build verify
	@printf "$(GREEN)✓ All tasks complete$(NC)\n"

## upgrade: Update dependencies
upgrade:
	@printf "$(BLUE)📦 Updating dependencies...$(NC)\n"
	@$(NPM) update
	@printf "$(GREEN)✓ Dependencies updated$(NC)\n"

## outdated: Check for outdated packages
outdated:
	@printf "$(BLUE)📦 Checking for outdated packages...$(NC)\n"
	@$(NPM) outdated

## info: Display project information
info:
	@printf "$(BLUE)Project Information:$(NC)\n"
	@printf "  Name: %s\n" "$$($(NODE) -p "require('./package.json').name")"
	@printf "  Version: %s\n" "$$($(NODE) -p "require('./package.json').version")"
	@printf "  Node: %s\n" "$$($(NODE) --version)"
	@printf "  NPM: %s\n" "$$($(NPM) --version)"
