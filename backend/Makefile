# Mailman Backend Makefile

# Go parameters
GOCMD=go
GOBUILD=$(GOCMD) build
GOCLEAN=$(GOCMD) clean
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
GOMOD=$(GOCMD) mod

# Binary names
MAIN_BINARY=mailman
RESET_PASSWORD_BINARY=reset-password

# Build directories
BUILD_DIR=build
CMD_DIR=cmd

.PHONY: all build clean test deps help reset-password

# Default target
all: deps build

# Build all binaries
build: build-main build-reset-password

# Build main application
build-main:
	@echo "Building main application..."
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(MAIN_BINARY) ./$(CMD_DIR)/mailman

# Build reset-password tool
build-reset-password:
	@echo "Building reset-password tool..."
	@mkdir -p $(BUILD_DIR)
	$(GOBUILD) -o $(BUILD_DIR)/$(RESET_PASSWORD_BINARY) ./$(CMD_DIR)/reset-password

# Quick build reset-password tool in current directory
reset-password:
	@echo "Building reset-password tool..."
	$(GOBUILD) -o $(RESET_PASSWORD_BINARY) ./$(CMD_DIR)/reset-password

# Install dependencies
deps:
	@echo "Installing dependencies..."
	$(GOMOD) tidy
	$(GOMOD) download

# Run tests
test:
	@echo "Running tests..."
	$(GOTEST) -v ./...

# Clean build artifacts
clean:
	@echo "Cleaning..."
	$(GOCLEAN)
	rm -rf $(BUILD_DIR)
	rm -f $(MAIN_BINARY)
	rm -f $(RESET_PASSWORD_BINARY)

# Run the main application
run:
	@echo "Running main application..."
	$(GOBUILD) -o $(MAIN_BINARY) ./$(CMD_DIR)/mailman && ./$(MAIN_BINARY)

# Development build with race detection
dev:
	@echo "Building with race detection..."
	$(GOBUILD) -race -o $(MAIN_BINARY) ./$(CMD_DIR)/mailman

# Install tools globally
install: build
	@echo "Installing binaries to GOPATH/bin..."
	cp $(BUILD_DIR)/$(MAIN_BINARY) $(GOPATH)/bin/
	cp $(BUILD_DIR)/$(RESET_PASSWORD_BINARY) $(GOPATH)/bin/

# Show help
help:
	@echo "Available targets:"
	@echo "  all                 - Install dependencies and build all binaries"
	@echo "  build               - Build all binaries"
	@echo "  build-main          - Build main application only"
	@echo "  build-reset-password- Build reset-password tool only"
	@echo "  reset-password      - Quick build reset-password tool in current directory"
	@echo "  deps                - Install/update dependencies"
	@echo "  test                - Run tests"
	@echo "  clean               - Clean build artifacts"
	@echo "  run                 - Build and run main application"
	@echo "  dev                 - Build with race detection"
	@echo "  install             - Install binaries to GOPATH/bin"
	@echo "  help                - Show this help message"
