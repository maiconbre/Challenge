#!/bin/bash

# Test script para validar o MVP Calendar
# Uso: ./test.sh

echo "🧪 Iniciando testes do MVP Calendar..."
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar se Docker está rodando
echo -n "✓ Verificando Docker... "
if docker ps > /dev/null 2>&1; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FALHOU${NC} - Docker não está rodando"
    exit 1
fi

# 2. Verificar se containers estão rodando
echo -n "✓ Verificando containers... "
RUNNING=$(docker compose ps --services --filter "status=running" | wc -l)
if [ $RUNNING -eq 3 ]; then
    echo -e "${GREEN}OK${NC} (3/3)"
else
    echo -e "${YELLOW}AVISO${NC} ($RUNNING/3)"
    echo "  Iniciando containers..."
    docker compose up -d
fi

# 3. Testar conexão com Backend
echo -n "✓ Testando Backend API... "
BACKEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/events)
if [ $BACKEND -eq 200 ] || [ $BACKEND -eq 404 ]; then
    echo -e "${GREEN}OK${NC} (HTTP $BACKEND)"
else
    echo -e "${RED}FALHOU${NC} (HTTP $BACKEND)"
    exit 1
fi

# 4. Testar conexão com Frontend
echo -n "✓ Testando Frontend... "
FRONTEND=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5174)
if [ $FRONTEND -eq 200 ]; then
    echo -e "${GREEN}OK${NC} (HTTP $FRONTEND)"
else
    echo -e "${RED}FALHOU${NC} (HTTP $FRONTEND)"
    exit 1
fi

# 5. Testar conexão com MongoDB
echo -n "✓ Testando MongoDB... "
MONGO=$(docker compose exec -T mongo mongosh --eval "db.adminCommand('ping')" 2>/dev/null | grep ok)
if [ ! -z "$MONGO" ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}FALHOU${NC}"
    exit 1
fi

# 6. Listar eventos no banco
echo ""
echo "📊 Eventos no banco:"
docker compose exec -T mongo mongosh CalendarDb --eval "db.Events.countDocuments()" 2>/dev/null

echo ""
echo -e "${GREEN}✅ Todos os testes passaram!${NC}"
echo ""
echo "🌐 Acesse: http://localhost:5174"
echo "📚 Documentação: MVP_GUIA.md"
echo ""
