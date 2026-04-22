#!/bin/bash

# 🚀 Redis Setup Script for dWallet v5
# This script helps you install and configure Redis for caching

set -e

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   🚀 Redis Setup for dWallet v5                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Detect OS
OS="$(uname -s)"
echo "📍 Detected OS: $OS"
echo ""

# Function to check if Redis is running
check_redis() {
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            echo "✅ Redis is running"
            return 0
        else
            echo "⚠️  Redis is installed but not running"
            return 1
        fi
    else
        echo "❌ Redis is not installed"
        return 1
    fi
}

# Check if Redis is already installed
if check_redis; then
    echo ""
    echo "✅ Redis is already installed and running!"
    echo ""
    echo "📊 Redis Info:"
    redis-cli INFO server | grep -E "redis_version|tcp_port|uptime"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. Verify REDIS_URL in .env file"
    echo "   2. Run: npm run cache:test"
    echo "   3. Start server: npm run admin:server"
    exit 0
fi

# Install Redis based on OS
echo "📦 Installing Redis..."
echo ""

case "$OS" in
    Darwin*)
        # macOS
        if command -v brew &> /dev/null; then
            echo "🍺 Installing via Homebrew..."
            brew install redis
            echo ""
            echo "🚀 Starting Redis service..."
            brew services start redis
            sleep 2
        else
            echo "❌ Homebrew not found!"
            echo "   Install Homebrew first: https://brew.sh/"
            echo ""
            echo "   Or install Redis manually:"
            echo "   1. Download from: https://redis.io/download"
            echo "   2. Follow installation instructions"
            exit 1
        fi
        ;;
    
    Linux*)
        if command -v apt &> /dev/null; then
            # Ubuntu/Debian
            echo "📦 Installing via apt..."
            sudo apt update
            sudo apt install -y redis-server
            echo ""
            echo "🚀 Starting Redis service..."
            sudo systemctl start redis-server
            sudo systemctl enable redis-server
        elif command -v yum &> /dev/null; then
            # CentOS/RHEL
            echo "📦 Installing via yum..."
            sudo yum install -y redis
            echo ""
            echo "🚀 Starting Redis service..."
            sudo systemctl start redis
            sudo systemctl enable redis
        else
            echo "❌ Unsupported Linux distribution"
            echo "   Please install Redis manually: https://redis.io/download"
            exit 1
        fi
        ;;
    
    *)
        echo "❌ Unsupported operating system: $OS"
        echo ""
        echo "📚 Manual installation:"
        echo "   Docker: docker run -d -p 6379:6379 redis:latest"
        echo "   Download: https://redis.io/download"
        exit 1
        ;;
esac

# Verify installation
echo ""
echo "🔍 Verifying Redis installation..."
sleep 2

if check_redis; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║   ✅ Redis Setup Complete!                            ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "📊 Redis Info:"
    redis-cli INFO server | grep -E "redis_version|tcp_port|uptime"
    echo ""
    echo "🎯 Next steps:"
    echo "   1. ✅ Redis is installed and running"
    echo "   2. 📝 Verify REDIS_URL in .env file (should be: redis://localhost:6379)"
    echo "   3. 🧪 Test caching: npm run cache:test"
    echo "   4. 🚀 Start server: npm run admin:server"
    echo ""
    echo "📚 Useful commands:"
    echo "   - Check Redis: redis-cli ping"
    echo "   - Monitor Redis: redis-cli MONITOR"
    echo "   - View stats: npm run cache:stats"
    echo "   - Clear cache: npm run cache:clear"
    echo ""
else
    echo ""
    echo "❌ Redis installation failed"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "   1. Check if port 6379 is available"
    echo "   2. Try manual installation: https://redis.io/download"
    echo "   3. Use Docker: docker run -d -p 6379:6379 redis:latest"
    echo ""
    exit 1
fi
