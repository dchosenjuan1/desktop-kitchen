#!/usr/bin/env bash
# ============================================================================
# Desktop Kitchen POS — iOS QA Stress Test
# ============================================================================
# Six-phase stress test: Build → API Smoke → Write-Cycle → Code Quality → Device → Pre-Submission
#
# Usage:
#   ADMIN_SECRET=xxx ./scripts/stress-test.sh
#   ADMIN_SECRET=xxx ./scripts/stress-test.sh --skip-build --skip-device
#   ADMIN_SECRET=xxx ./scripts/stress-test.sh --skip-build --skip-code --skip-device
#
# Environment variables (override with flags):
#   ADMIN_SECRET   — required for API tests
#   TENANT_ID      — default: demo
#   DEVICE_ID      — iPad UUID for Phase 5
# ============================================================================

set -o pipefail

# ── Colors & Symbols ────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m' # No color

PASS_ICON="${GREEN}[PASS]${NC}"
FAIL_ICON="${RED}[FAIL]${NC}"
WARN_ICON="${YELLOW}[WARN]${NC}"
INFO_ICON="${BLUE}[INFO]${NC}"
SKIP_ICON="${DIM}[SKIP]${NC}"

# ── Defaults ────────────────────────────────────────────────────────────────

TENANT_ID="${TENANT_ID:-demo}"
ADMIN_SECRET="${ADMIN_SECRET:-}"
BASE_URL="${BASE_URL:-https://pos.desktop.kitchen}"
DEVICE_ID="${DEVICE_ID:-975FF475-17D3-537B-994F-3A615FBE3356}"
VERBOSE=false
SKIP_BUILD=false
SKIP_API=false
SKIP_CODE=false
SKIP_DEVICE=false
SKIP_SUBMIT=false

# Counters per phase (bash 3 compatible — no associative arrays on macOS)
P1_PASS=0 P1_FAIL=0 P1_WARN=0 P1_INFO=0
P2_PASS=0 P2_FAIL=0 P2_WARN=0 P2_INFO=0
P3_PASS=0 P3_FAIL=0 P3_WARN=0 P3_INFO=0
P4_PASS=0 P4_FAIL=0 P4_WARN=0 P4_INFO=0
P5_PASS=0 P5_FAIL=0 P5_WARN=0 P5_INFO=0
P6_PASS=0 P6_FAIL=0 P6_WARN=0 P6_INFO=0
CURRENT_PHASE=1

# Phase counter helpers
_inc() {
    local var="P${CURRENT_PHASE}_$1"
    eval "$var=\$(( \$$var + 1 ))"
}
_get() {
    local var="P${1}_${2}"
    eval "echo \$$var"
}

# Safe line counter: _count_lines "$VAR" → number of non-empty lines (0 if empty)
_count_lines() {
    local input="$1"
    if [[ -z "$input" ]]; then
        echo "0"
    else
        echo "$input" | grep -c '.' 2>/dev/null || echo "0"
    fi
}

# ── Report file ─────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPORT_DIR="$PROJECT_DIR/scripts"
REPORT_FILE="$REPORT_DIR/stress-test-$(date +%Y%m%d-%H%M%S).txt"
FAILURES=()

# ── Option Parsing ──────────────────────────────────────────────────────────

usage() {
    cat <<'EOF'
Usage: stress-test.sh [OPTIONS]

Options:
  --tenant-id ID       Tenant ID (default: demo, env: TENANT_ID)
  --admin-secret SEC   Admin secret (required for API, env: ADMIN_SECRET)
  --base-url URL       Server URL (default: https://pos.desktop.kitchen)
  --skip-build         Skip Phase 1 (build verification)
  --skip-api           Skip Phase 2+3 (API smoke + write-cycle tests)
  --skip-code          Skip Phase 4 (code quality static analysis)
  --skip-device        Skip Phase 5 (device deploy & launch)
  --skip-submit        Skip Phase 6 (pre-submission checklist)
  --device-id ID       iPad UUID (env: DEVICE_ID)
  --verbose            Show response bodies
  -h, --help           Show this help
EOF
    exit 0
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tenant-id)    TENANT_ID="$2"; shift 2 ;;
        --admin-secret) ADMIN_SECRET="$2"; shift 2 ;;
        --base-url)     BASE_URL="$2"; shift 2 ;;
        --skip-build)   SKIP_BUILD=true; shift ;;
        --skip-api)     SKIP_API=true; shift ;;
        --skip-code)    SKIP_CODE=true; shift ;;
        --skip-device)  SKIP_DEVICE=true; shift ;;
        --skip-submit)  SKIP_SUBMIT=true; shift ;;
        --device-id)    DEVICE_ID="$2"; shift 2 ;;
        --verbose)      VERBOSE=true; shift ;;
        -h|--help)      usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

# ── Helpers ─────────────────────────────────────────────────────────────────

log_pass() {
    local msg="$1"
    echo -e "  ${PASS_ICON} $msg"
    echo "  [PASS] $msg" >> "$REPORT_FILE"
    _inc PASS
}

log_fail() {
    local msg="$1"
    local fix="${2:-}"
    echo -e "  ${FAIL_ICON} $msg"
    echo "  [FAIL] $msg" >> "$REPORT_FILE"
    _inc FAIL
    if [[ -n "$fix" ]]; then
        echo -e "         ${DIM}Fix: $fix${NC}"
        echo "         Fix: $fix" >> "$REPORT_FILE"
    fi
    FAILURES+=("Phase $CURRENT_PHASE: $msg${fix:+ → $fix}")
}

log_warn() {
    local msg="$1"
    local fix="${2:-}"
    echo -e "  ${WARN_ICON} $msg"
    echo "  [WARN] $msg" >> "$REPORT_FILE"
    _inc WARN
    if [[ -n "$fix" ]]; then
        echo -e "         ${DIM}Fix: $fix${NC}"
        echo "         Fix: $fix" >> "$REPORT_FILE"
    fi
}

log_info() {
    local msg="$1"
    echo -e "  ${INFO_ICON} $msg"
    echo "  [INFO] $msg" >> "$REPORT_FILE"
    _inc INFO
}

phase_header() {
    local num="$1" name="$2"
    CURRENT_PHASE=$num
    echo ""
    echo -e "${BOLD}${CYAN}━━━ Phase $num: $name ━━━${NC}"
    echo "" >> "$REPORT_FILE"
    echo "━━━ Phase $num: $name ━━━" >> "$REPORT_FILE"
}

# Auth headers for curl
AUTH_HEADERS=()
build_auth_headers() {
    AUTH_HEADERS=(
        -H "X-Tenant-ID: $TENANT_ID"
        -H "X-Admin-Secret: $ADMIN_SECRET"
        -H "Content-Type: application/json"
    )
}

# Curl wrapper: api_get <endpoint> [description]
# Sets: HTTP_CODE, BODY
api_get() {
    local endpoint="$1"
    local url="${BASE_URL}${endpoint}"
    local tmpfile
    tmpfile=$(mktemp)
    HTTP_CODE=$(curl -s -o "$tmpfile" -w "%{http_code}" \
        "${AUTH_HEADERS[@]}" \
        ${EMPLOYEE_TOKEN:+-H "x-employee-id: $EMPLOYEE_ID"} \
        "$url" 2>/dev/null || echo "000")
    BODY=$(cat "$tmpfile")
    rm -f "$tmpfile"
    if [[ "$VERBOSE" == "true" && -n "$BODY" ]]; then
        echo -e "         ${DIM}$(echo "$BODY" | head -c 200)${NC}"
    fi
}

# Curl wrapper: api_post <endpoint> <json_body>
api_post() {
    local endpoint="$1"
    local data="$2"
    local url="${BASE_URL}${endpoint}"
    local tmpfile
    tmpfile=$(mktemp)
    HTTP_CODE=$(curl -s -o "$tmpfile" -w "%{http_code}" \
        -X POST \
        "${AUTH_HEADERS[@]}" \
        ${EMPLOYEE_TOKEN:+-H "x-employee-id: $EMPLOYEE_ID"} \
        -d "$data" \
        "$url" 2>/dev/null || echo "000")
    BODY=$(cat "$tmpfile")
    rm -f "$tmpfile"
    if [[ "$VERBOSE" == "true" && -n "$BODY" ]]; then
        echo -e "         ${DIM}$(echo "$BODY" | head -c 200)${NC}"
    fi
}

# Curl wrapper: api_put <endpoint> <json_body>
api_put() {
    local endpoint="$1"
    local data="$2"
    local url="${BASE_URL}${endpoint}"
    local tmpfile
    tmpfile=$(mktemp)
    HTTP_CODE=$(curl -s -o "$tmpfile" -w "%{http_code}" \
        -X PUT \
        "${AUTH_HEADERS[@]}" \
        ${EMPLOYEE_TOKEN:+-H "x-employee-id: $EMPLOYEE_ID"} \
        -d "$data" \
        "$url" 2>/dev/null || echo "000")
    BODY=$(cat "$tmpfile")
    rm -f "$tmpfile"
    if [[ "$VERBOSE" == "true" && -n "$BODY" ]]; then
        echo -e "         ${DIM}$(echo "$BODY" | head -c 200)${NC}"
    fi
}

# Check jq expression returns truthy on $BODY
# jq_check <jq_filter> → 0 if true
jq_check() {
    echo "$BODY" | jq -e "$1" > /dev/null 2>&1
}

# Count array items from $BODY
jq_count() {
    echo "$BODY" | jq -r "$1 | length" 2>/dev/null || echo "0"
}

# ── Banner ──────────────────────────────────────────────────────────────────

echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          Desktop Kitchen POS — iOS QA Stress Test          ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo -e "  Tenant:  ${BOLD}$TENANT_ID${NC}"
echo -e "  Server:  ${BOLD}$BASE_URL${NC}"
echo -e "  Device:  ${BOLD}${DEVICE_ID:-(none)}${NC}"
echo -e "  Time:    ${BOLD}$(date '+%Y-%m-%d %H:%M:%S')${NC}"

# Initialize report
echo "Desktop Kitchen POS — iOS QA Stress Test" > "$REPORT_FILE"
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')" >> "$REPORT_FILE"
echo "Tenant: $TENANT_ID | Server: $BASE_URL" >> "$REPORT_FILE"

# State vars populated during tests
EMPLOYEE_ID=""
EMPLOYEE_TOKEN=""
FIRST_CATEGORY_ID=""
FIRST_ITEM_ID=""

# ============================================================================
# PHASE 1: BUILD VERIFICATION
# ============================================================================

if [[ "$SKIP_BUILD" == "true" ]]; then
    echo ""
    echo -e "${DIM}  ⏭  Phase 1 (Build) skipped${NC}"
else
    phase_header 1 "Build Verification"

    cd "$PROJECT_DIR"

    # 1a. Validate project.yml settings
    if [[ -f "project.yml" ]]; then
        # Swift version
        SWIFT_VER=$(grep 'SWIFT_VERSION' project.yml | head -1 | sed 's/.*: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' | tr -d ' ')
        if [[ "$SWIFT_VER" == "6.0" ]]; then
            log_pass "Swift version: $SWIFT_VER"
        else
            log_fail "Swift version is '$SWIFT_VER', expected 6.0" "Set SWIFT_VERSION: \"6.0\" in project.yml"
        fi

        # Strict concurrency
        if grep -q 'SWIFT_STRICT_CONCURRENCY.*complete' project.yml; then
            log_pass "Strict concurrency: complete"
        else
            log_fail "Strict concurrency not set to 'complete'" "Add SWIFT_STRICT_CONCURRENCY: \"complete\" to project.yml settings"
        fi

        # iPad-only (TARGETED_DEVICE_FAMILY: "2")
        if grep -q 'TARGETED_DEVICE_FAMILY.*"2"' project.yml; then
            log_pass "Device family: iPad-only"
        else
            log_fail "Not iPad-only" "Set TARGETED_DEVICE_FAMILY: \"2\" in project.yml"
        fi

        # Deployment target
        DEPLOY_TARGET=$(grep -A1 'deploymentTarget' project.yml | grep 'iOS' | sed 's/.*: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' | tr -d ' ')
        DEPLOY_MAJOR=$(echo "$DEPLOY_TARGET" | cut -d. -f1)
        if [[ -n "$DEPLOY_MAJOR" ]] && [[ "$DEPLOY_MAJOR" -ge 17 ]]; then
            log_pass "Deployment target: iOS $DEPLOY_TARGET"
        else
            log_fail "Deployment target '$DEPLOY_TARGET' < 17.0" "Set deploymentTarget iOS to 17.0+ in project.yml"
        fi
    else
        log_fail "project.yml not found" "Run from native-ios/ directory"
    fi

    # 1b. xcodegen generate
    echo -e "  ${DIM}Running xcodegen generate...${NC}"
    XCODEGEN_OUTPUT=$(xcodegen generate 2>&1) || true
    if [[ -f "DesktopKitchenPOS.xcodeproj/project.pbxproj" ]]; then
        log_pass "xcodegen generate succeeded"
    else
        log_fail "xcodegen generate failed" "Install: brew install xcodegen"
        echo -e "         ${DIM}$XCODEGEN_OUTPUT${NC}"
    fi

    # 1c. xcodebuild
    echo -e "  ${DIM}Running xcodebuild (this may take a few minutes)...${NC}"
    BUILD_LOG=$(mktemp)
    BUILD_EXIT=0
    xcodebuild \
        -project DesktopKitchenPOS.xcodeproj \
        -scheme DesktopKitchenPOS \
        -destination 'generic/platform=iOS' \
        -configuration Debug \
        build 2>&1 > "$BUILD_LOG" || BUILD_EXIT=$?

    BUILD_ERRORS=$(grep -c '^\*\* BUILD FAILED \*\*\|error:' "$BUILD_LOG" 2>/dev/null || echo "0")
    BUILD_WARNINGS=$(grep -c 'warning:' "$BUILD_LOG" 2>/dev/null || echo "0")

    if [[ "$BUILD_EXIT" -eq 0 ]]; then
        log_pass "xcodebuild succeeded (exit 0)"
    else
        log_fail "xcodebuild failed (exit $BUILD_EXIT)" "Check build log: $BUILD_LOG"
        # Show last few error lines
        grep 'error:' "$BUILD_LOG" | tail -5 | while read -r line; do
            echo -e "         ${RED}$line${NC}"
        done
    fi

    if [[ "$BUILD_WARNINGS" -gt 0 ]]; then
        log_warn "$BUILD_WARNINGS build warning(s)"
    else
        log_pass "Zero build warnings"
    fi

    # 1d. Binary size check
    APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/DesktopKitchenPOS-*/Build/Products/Debug-iphoneos/DesktopKitchenPOS.app -maxdepth 0 2>/dev/null | head -1)
    if [[ -d "$APP_PATH" ]]; then
        APP_SIZE_BYTES=$(du -sk "$APP_PATH" | awk '{print $1}')
        APP_SIZE_MB=$(( APP_SIZE_BYTES / 1024 ))
        if [[ "$APP_SIZE_MB" -gt 100 ]]; then
            log_warn "Binary size: ${APP_SIZE_MB}MB (>100MB)" "Review assets and frameworks for size optimization"
        else
            log_pass "Binary size: ${APP_SIZE_MB}MB"
        fi
    else
        log_info "Binary not found — size check skipped (archive build needed)"
    fi

    rm -f "$BUILD_LOG"
fi

# ============================================================================
# PHASE 2: API SMOKE TESTS (read-only)
# ============================================================================

if [[ "$SKIP_API" == "true" ]]; then
    echo ""
    echo -e "${DIM}  ⏭  Phase 2+3 (API) skipped${NC}"
else
    if [[ -z "$ADMIN_SECRET" ]]; then
        echo ""
        echo -e "  ${RED}ADMIN_SECRET required for API tests. Set env or use --admin-secret.${NC}"
        echo -e "${DIM}  ⏭  Phase 2+3 (API) skipped${NC}"
        SKIP_API=true
    fi
fi

if [[ "$SKIP_API" != "true" ]]; then
    phase_header 2 "API Smoke Tests (read-only)"

    build_auth_headers

    # ── 2.1 Auth: Login ─────────────────────────────────────────────────────

    api_post "/api/employees/login" '{"pin":"1234"}'
    if [[ "$HTTP_CODE" == "200" ]] && jq_check '.id and .name and .role'; then
        EMPLOYEE_ID=$(echo "$BODY" | jq -r '.id')
        EMPLOYEE_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
        ROLE=$(echo "$BODY" | jq -r '.role')
        log_pass "POST /api/employees/login → 200 (id=$EMPLOYEE_ID, role=$ROLE)"
    else
        log_fail "POST /api/employees/login → $HTTP_CODE (expected 200 with {id,name,role})" "Ensure PIN 1234 exists for tenant '$TENANT_ID'"
        # Try common fallback PINs
        for pin in 0000 1111 9999; do
            api_post "/api/employees/login" "{\"pin\":\"$pin\"}"
            if [[ "$HTTP_CODE" == "200" ]] && jq_check '.id'; then
                EMPLOYEE_ID=$(echo "$BODY" | jq -r '.id')
                EMPLOYEE_TOKEN=$(echo "$BODY" | jq -r '.token // empty')
                log_info "Fallback login with PIN $pin succeeded (id=$EMPLOYEE_ID)"
                break
            fi
        done
    fi

    # ── 2.2 Menu ────────────────────────────────────────────────────────────

    api_get "/api/menu/categories"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        FIRST_CATEGORY_ID=$(echo "$BODY" | jq -r '.[0].id // empty')
        if jq_check '.[0] | .id and .name'; then
            log_pass "GET /api/menu/categories → 200 ($COUNT categories)"
        else
            log_warn "GET /api/menu/categories → 200 but shape missing id/name"
        fi
    else
        log_fail "GET /api/menu/categories → $HTTP_CODE" "Check server is running at $BASE_URL"
    fi

    api_get "/api/menu/items"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        FIRST_ITEM_ID=$(echo "$BODY" | jq -r '.[0].id // empty')
        if [[ "$COUNT" -gt 0 ]] && jq_check '.[0] | .id and .name and .price'; then
            log_pass "GET /api/menu/items → 200 ($COUNT items)"
        elif [[ "$COUNT" -eq 0 ]]; then
            log_pass "GET /api/menu/items → 200 (0 items, empty menu)"
        else
            log_warn "GET /api/menu/items → 200 but first item missing id/name/price"
        fi
    else
        log_fail "GET /api/menu/items → $HTTP_CODE"
    fi

    if [[ -n "$FIRST_CATEGORY_ID" ]]; then
        api_get "/api/menu/items?category_id=$FIRST_CATEGORY_ID"
        if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
            COUNT=$(jq_count '.')
            log_pass "GET /api/menu/items?category_id=$FIRST_CATEGORY_ID → 200 ($COUNT items)"
        else
            log_fail "GET /api/menu/items?category_id=$FIRST_CATEGORY_ID → $HTTP_CODE"
        fi
    fi

    # ── 2.3 Employees ──────────────────────────────────────────────────────

    api_get "/api/employees"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/employees → 200 ($COUNT employees)"
    else
        log_fail "GET /api/employees → $HTTP_CODE"
    fi

    # ── 2.4 Orders ──────────────────────────────────────────────────────────

    api_get "/api/orders"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/orders → 200 ($COUNT orders)"
    else
        log_fail "GET /api/orders → $HTTP_CODE"
    fi

    api_get "/api/orders?status=completed"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/orders?status=completed → 200 ($COUNT)"
    else
        log_fail "GET /api/orders?status=completed → $HTTP_CODE"
    fi

    api_get "/api/orders/kitchen/active"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/orders/kitchen/active → 200 ($COUNT)"
    else
        log_fail "GET /api/orders/kitchen/active → $HTTP_CODE"
    fi

    # ── 2.5 Inventory ──────────────────────────────────────────────────────

    api_get "/api/inventory"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/inventory → 200 ($COUNT items)"
    else
        log_fail "GET /api/inventory → $HTTP_CODE"
    fi

    api_get "/api/inventory/low-stock"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/inventory/low-stock → 200 ($COUNT)"
    else
        log_fail "GET /api/inventory/low-stock → $HTTP_CODE"
    fi

    # ── 2.6 Reports (11 endpoints) ─────────────────────────────────────────

    REPORT_ENDPOINTS=(
        "/api/reports/sales?period=today|.period or .total_revenue!=null"
        "/api/reports/top-items?period=today&limit=10|type == \"array\""
        "/api/reports/employee-performance?period=today|type == \"array\""
        "/api/reports/hourly|type == \"array\""
        "/api/reports/cash-card-breakdown?period=today|.period or .breakdown!=null"
        "/api/reports/cogs?period=today|.period or .items!=null"
        "/api/reports/category-margins?period=today|.period or .categories!=null"
        "/api/reports/contribution-margin?period=today|.period or .data!=null"
        "/api/reports/live|.date or .kpis!=null"
        "/api/reports/delivery-margins?period=today|true"
        "/api/reports/channel-comparison?period=today|true"
    )

    for entry in "${REPORT_ENDPOINTS[@]}"; do
        endpoint="${entry%%|*}"
        jq_filter="${entry##*|}"
        api_get "$endpoint"
        short="${endpoint%%\?*}"
        if [[ "$HTTP_CODE" == "200" ]]; then
            if jq_check "$jq_filter"; then
                log_pass "GET $short → 200"
            else
                log_warn "GET $short → 200 but unexpected shape"
            fi
        else
            log_fail "GET $short → $HTTP_CODE"
        fi
    done

    # ── 2.7 Modifiers ──────────────────────────────────────────────────────

    api_get "/api/modifiers/groups"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/modifiers/groups → 200 ($COUNT groups)"
    else
        log_fail "GET /api/modifiers/groups → $HTTP_CODE"
    fi

    if [[ -n "$FIRST_ITEM_ID" ]]; then
        api_get "/api/modifiers/groups/item/$FIRST_ITEM_ID"
        if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
            COUNT=$(jq_count '.')
            log_pass "GET /api/modifiers/groups/item/$FIRST_ITEM_ID → 200 ($COUNT)"
        else
            log_fail "GET /api/modifiers/groups/item/$FIRST_ITEM_ID → $HTTP_CODE"
        fi
    fi

    # ── 2.8 Combos ─────────────────────────────────────────────────────────

    api_get "/api/combos"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/combos → 200 ($COUNT combos)"
    else
        log_fail "GET /api/combos → $HTTP_CODE"
    fi

    # ── 2.9 Printers ───────────────────────────────────────────────────────

    api_get "/api/printers"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/printers → 200 ($COUNT printers)"
    else
        log_fail "GET /api/printers → $HTTP_CODE"
    fi

    api_get "/api/printers/routes"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/printers/routes → 200 ($COUNT routes)"
    else
        log_fail "GET /api/printers/routes → $HTTP_CODE"
    fi

    # ── 2.10 Delivery ──────────────────────────────────────────────────────

    api_get "/api/delivery/platforms"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/delivery/platforms → 200 ($COUNT)"
    else
        log_fail "GET /api/delivery/platforms → $HTTP_CODE"
    fi

    api_get "/api/delivery/orders"
    if [[ "$HTTP_CODE" == "200" ]] && jq_check 'type == "array"'; then
        COUNT=$(jq_count '.')
        log_pass "GET /api/delivery/orders → 200 ($COUNT)"
    else
        log_fail "GET /api/delivery/orders → $HTTP_CODE"
    fi

    # ── 2.11 AI (8 endpoints) ──────────────────────────────────────────────

    # Cart suggestions need at least one item ID
    CART_ITEM_ID="${FIRST_ITEM_ID:-1}"
    api_get "/api/ai/suggestions/cart?items=$CART_ITEM_ID&hour=12"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/suggestions/cart → 200"
    else
        log_warn "GET /api/ai/suggestions/cart → $HTTP_CODE (may need data)"
    fi

    api_get "/api/ai/suggestions/inventory-push"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/suggestions/inventory-push → 200"
    else
        log_warn "GET /api/ai/suggestions/inventory-push → $HTTP_CODE"
    fi

    api_get "/api/ai/config"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/config → 200"
    else
        log_warn "GET /api/ai/config → $HTTP_CODE"
    fi

    api_get "/api/ai/insights"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/insights → 200"
    else
        log_warn "GET /api/ai/insights → $HTTP_CODE"
    fi

    api_get "/api/ai/analytics?period=today"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/analytics → 200"
    else
        log_warn "GET /api/ai/analytics → $HTTP_CODE"
    fi

    api_get "/api/ai/pricing-suggestions"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/pricing-suggestions → 200"
    else
        log_warn "GET /api/ai/pricing-suggestions → $HTTP_CODE"
    fi

    api_get "/api/ai/inventory-forecast"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/inventory-forecast → 200"
    else
        log_warn "GET /api/ai/inventory-forecast → $HTTP_CODE"
    fi

    api_get "/api/ai/category-roles"
    if [[ "$HTTP_CODE" == "200" ]]; then
        log_pass "GET /api/ai/category-roles → 200"
    else
        log_warn "GET /api/ai/category-roles → $HTTP_CODE"
    fi

    # ── 2.12 Loyalty ───────────────────────────────────────────────────────

    api_get "/api/loyalty/customers/phone/0000000000"
    if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "404" ]]; then
        log_pass "GET /api/loyalty/customers/phone/0000000000 → $HTTP_CODE (404 or 200 both valid)"
    else
        log_fail "GET /api/loyalty/customers/phone/0000000000 → $HTTP_CODE"
    fi

    # ── 2.13 Branding ─────────────────────────────────────────────────────

    api_get "/api/branding"
    if [[ "$HTTP_CODE" == "200" ]]; then
        if jq_check '.primaryColor or .restaurantName'; then
            log_pass "GET /api/branding → 200 (has primaryColor/restaurantName)"
        else
            log_warn "GET /api/branding → 200 but missing expected fields"
        fi
    else
        log_fail "GET /api/branding → $HTTP_CODE"
    fi

    # ========================================================================
    # PHASE 3: WRITE-CYCLE TESTS (idempotent)
    # ========================================================================

    phase_header 3 "Write-Cycle Tests (idempotent)"

    if [[ -z "$EMPLOYEE_ID" || -z "$FIRST_ITEM_ID" ]]; then
        log_warn "Skipping write tests — no employee or menu items available"
    else
        # 3.1 Create test order → verify → cancel
        ORDER_JSON="{\"employee_id\":$EMPLOYEE_ID,\"items\":[{\"menu_item_id\":$FIRST_ITEM_ID,\"quantity\":1}]}"
        api_post "/api/orders" "$ORDER_JSON"
        if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
            TEST_ORDER_ID=$(echo "$BODY" | jq -r '.id // .order_id // empty')
            TEST_ORDER_NUM=$(echo "$BODY" | jq -r '.order_number // empty')
            if [[ -n "$TEST_ORDER_ID" ]]; then
                log_pass "POST /api/orders → $HTTP_CODE (order #$TEST_ORDER_NUM, id=$TEST_ORDER_ID)"

                # Verify it exists
                api_get "/api/orders/$TEST_ORDER_ID"
                if [[ "$HTTP_CODE" == "200" ]] && jq_check '.id'; then
                    log_pass "GET /api/orders/$TEST_ORDER_ID → 200 (verified)"
                else
                    log_fail "GET /api/orders/$TEST_ORDER_ID → $HTTP_CODE (order not found after create)"
                fi

                # Cancel it (cleanup)
                api_put "/api/orders/$TEST_ORDER_ID/status" '{"status":"cancelled"}'
                if [[ "$HTTP_CODE" == "200" ]]; then
                    log_pass "PUT /api/orders/$TEST_ORDER_ID/status → cancelled (cleanup)"
                else
                    log_warn "PUT /api/orders/$TEST_ORDER_ID/status → $HTTP_CODE (cancel failed, manual cleanup needed)"
                fi
            else
                log_fail "POST /api/orders → $HTTP_CODE but no order ID in response"
            fi
        else
            log_fail "POST /api/orders → $HTTP_CODE" "Ensure menu items exist for tenant '$TENANT_ID'"
        fi

        # 3.2 Create order → cash payment → verify completed
        api_post "/api/orders" "$ORDER_JSON"
        if [[ "$HTTP_CODE" == "200" ]] || [[ "$HTTP_CODE" == "201" ]]; then
            CASH_ORDER_ID=$(echo "$BODY" | jq -r '.id // .order_id // empty')
            CASH_ORDER_TOTAL=$(echo "$BODY" | jq -r '.total // 0')
            if [[ -n "$CASH_ORDER_ID" ]]; then
                log_pass "POST /api/orders → $HTTP_CODE (cash test order id=$CASH_ORDER_ID)"

                # Cash payment
                CASH_JSON="{\"order_id\":$CASH_ORDER_ID,\"amount_tendered\":${CASH_ORDER_TOTAL},\"tip\":0}"
                api_post "/api/payments/cash" "$CASH_JSON"
                if [[ "$HTTP_CODE" == "200" ]]; then
                    log_pass "POST /api/payments/cash → 200 (order $CASH_ORDER_ID paid)"
                else
                    log_fail "POST /api/payments/cash → $HTTP_CODE"
                fi

                # Verify payment status
                api_get "/api/payments/$CASH_ORDER_ID"
                if [[ "$HTTP_CODE" == "200" ]]; then
                    PAY_STATUS=$(echo "$BODY" | jq -r '.payment_status // .status // empty')
                    log_pass "GET /api/payments/$CASH_ORDER_ID → 200 (status=$PAY_STATUS)"
                else
                    log_warn "GET /api/payments/$CASH_ORDER_ID → $HTTP_CODE"
                fi

                # Cancel for cleanup
                api_put "/api/orders/$CASH_ORDER_ID/status" '{"status":"cancelled"}'
                if [[ "$HTTP_CODE" == "200" ]]; then
                    log_pass "Cleanup: order $CASH_ORDER_ID cancelled"
                else
                    log_info "Cleanup: order $CASH_ORDER_ID cancel → $HTTP_CODE (may already be completed)"
                fi
            fi
        else
            log_fail "POST /api/orders (cash test) → $HTTP_CODE"
        fi
    fi
fi

# ============================================================================
# PHASE 4: CODE QUALITY STATIC ANALYSIS
# ============================================================================

if [[ "$SKIP_CODE" == "true" ]]; then
    echo ""
    echo -e "${DIM}  ⏭  Phase 4 (Code Quality) skipped${NC}"
else
    phase_header 4 "Code Quality Static Analysis"

    SRC_DIR="$PROJECT_DIR/DesktopKitchenPOS"

    if [[ ! -d "$SRC_DIR" ]]; then
        log_fail "Source directory not found: $SRC_DIR"
    else
        # 4.1 Force unwraps (as!, try!, !. — excluding IBOutlet patterns)
        FORCE_UNWRAPS=$(grep -rn ' as! \| try! \|!\.\|\.unsafelyUnwrapped' "$SRC_DIR" --include='*.swift' \
            | grep -v '\.build/' | grep -v 'DerivedData' | grep -v '// swiftlint' || true)
        FORCE_COUNT=$(_count_lines "$FORCE_UNWRAPS")
        if [[ "$FORCE_COUNT" -gt 0 ]]; then
            log_warn "$FORCE_COUNT force unwrap(s) found (as!, try!, !.)" "Use optional binding or guard-let instead"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$FORCE_UNWRAPS" | head -5 | while read -r line; do
                    echo -e "         ${DIM}$line${NC}"
                done
            fi
        else
            log_pass "No force unwraps found"
        fi

        # 4.2 Hardcoded colors bypassing AppColors
        HARDCODED_COLORS=$(grep -rn 'Color(\.sRGB\|Color(red:\|Color(hex:\|\.init(hex:\|UIColor(' "$SRC_DIR" --include='*.swift' \
            | grep -v 'AppColors\.\|Theme/AppColors\.swift\|// brand\|// canonical' || true)
        COLOR_COUNT=$(_count_lines "$HARDCODED_COLORS")
        if [[ "$COLOR_COUNT" -gt 0 ]]; then
            log_warn "$COLOR_COUNT hardcoded color(s) bypassing AppColors" "Use AppColors.* constants instead"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$HARDCODED_COLORS" | head -5 | while read -r line; do
                    echo -e "         ${DIM}$line${NC}"
                done
            fi
        else
            log_pass "No hardcoded colors bypassing AppColors"
        fi

        # 4.3 TODO/FIXME/HACK count
        TODO_MATCHES=$(grep -rn 'TODO\|FIXME\|HACK\|XXX' "$SRC_DIR" --include='*.swift' | grep -v '\.build/' || true)
        TODO_COUNT=0
        if [[ -n "$TODO_MATCHES" ]]; then
            TODO_COUNT=$(echo "$TODO_MATCHES" | wc -l | tr -d ' ')
        fi
        log_info "$TODO_COUNT TODO/FIXME/HACK/XXX comments"

        # 4.4 @MainActor on all ViewModels
        VM_DIR="$SRC_DIR/ViewModels"
        if [[ -d "$VM_DIR" ]]; then
            VM_FILES=$(find "$VM_DIR" -name '*.swift' -type f)
            MISSING_MAINACTOR=()
            while IFS= read -r f; do
                [[ -z "$f" ]] && continue
                BASENAME=$(basename "$f")
                # Check if file has @MainActor before class/final class
                if ! grep -q '@MainActor' "$f"; then
                    MISSING_MAINACTOR+=("$BASENAME")
                fi
            done <<< "$VM_FILES"

            if [[ ${#MISSING_MAINACTOR[@]} -gt 0 ]]; then
                log_fail "${#MISSING_MAINACTOR[@]} ViewModel(s) missing @MainActor: ${MISSING_MAINACTOR[*]}" "Add @MainActor to all ObservableObject ViewModels"
            else
                log_pass "All ViewModels have @MainActor"
            fi
        else
            log_info "No ViewModels directory found"
        fi

        # 4.5 Retain cycle risk — unguarded self in Task closures
        # Look for Task { ... self. ... } without [weak self]
        RETAIN_RISK=$(grep -rn 'Task\s*{' "$SRC_DIR" --include='*.swift' -A5 \
            | grep -B1 'self\.' | grep -v '\[weak self\]' | grep -v '\.build/' || true)
        RETAIN_COUNT=$(echo "$RETAIN_RISK" | grep 'self\.' 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$RETAIN_COUNT" -gt 10 ]]; then
            log_warn "$RETAIN_COUNT potential retain cycle(s) (self. in Task without [weak self])" "Review closures — ViewModels with @MainActor may be safe, but audit reference types"
        elif [[ "$RETAIN_COUNT" -gt 0 ]]; then
            log_info "$RETAIN_COUNT self. references in Task closures (likely safe with @MainActor)"
        else
            log_pass "No retain cycle risks detected"
        fi

        # 4.6 NSAllowsArbitraryLoads in Info.plist
        INFO_PLIST="$SRC_DIR/Info.plist"
        if [[ -f "$INFO_PLIST" ]]; then
            if grep -q 'NSAllowsArbitraryLoads' "$INFO_PLIST"; then
                if grep -A1 'NSAllowsArbitraryLoads' "$INFO_PLIST" | grep -q 'true'; then
                    log_warn "NSAllowsArbitraryLoads=true in Info.plist" "Remove before App Store submission — use NSExceptionDomains for specific hosts"
                else
                    log_pass "NSAllowsArbitraryLoads is false"
                fi
            else
                log_pass "No NSAllowsArbitraryLoads key (defaults to false)"
            fi
        fi

        # Also check project.yml
        if grep -q 'NSAllowsArbitraryLoads.*true' "$PROJECT_DIR/project.yml" 2>/dev/null; then
            log_warn "NSAllowsArbitraryLoads=true in project.yml" "Replace with NSExceptionDomains for your server hostname"
        fi

        # 4.7 Missing NS*UsageDescription keys
        # For this POS app, NSLocalNetworkUsageDescription is required
        if [[ -f "$INFO_PLIST" ]]; then
            if grep -q 'NSLocalNetworkUsageDescription' "$INFO_PLIST"; then
                log_pass "NSLocalNetworkUsageDescription present"
            else
                log_fail "NSLocalNetworkUsageDescription missing" "Add to Info.plist — required for local network access"
            fi

            # Camera usage (if app uses camera for scanning)
            if grep -rq 'AVCaptureSession\|UIImagePickerController\|\.camera' "$SRC_DIR" --include='*.swift' 2>/dev/null; then
                if grep -q 'NSCameraUsageDescription' "$INFO_PLIST"; then
                    log_pass "NSCameraUsageDescription present (camera code detected)"
                else
                    log_fail "NSCameraUsageDescription missing but camera APIs used" "Add NSCameraUsageDescription to Info.plist"
                fi
            fi
        fi

        # 4.8 Tap targets < 44pt
        SMALL_TARGETS=$(grep -rn '\.frame(' "$SRC_DIR" --include='*.swift' \
            | grep -v '\.build/' \
            | grep -Eo '(width|height): *[0-9]+' \
            | sed 's/[^0-9]//g' \
            | awk '$1 < 44 {count++} END {print count+0}')
        if [[ "$SMALL_TARGETS" -gt 0 ]]; then
            log_warn "$SMALL_TARGETS frame dimension(s) < 44pt detected" "Ensure interactive elements meet 44x44pt minimum tap target (HIG)"
        else
            log_pass "No obvious undersized tap targets"
        fi

        # 4.9 Sendable compliance on Codable models
        MODELS_DIR="$SRC_DIR/Models"
        if [[ -d "$MODELS_DIR" ]]; then
            NON_SENDABLE=$(grep -rn 'struct.*Codable' "$MODELS_DIR" --include='*.swift' \
                | grep -v 'Sendable' || true)
            NS_COUNT=$(_count_lines "$NON_SENDABLE")
            if [[ "$NS_COUNT" -gt 0 ]]; then
                log_warn "$NS_COUNT Codable struct(s) without Sendable conformance" "Add Sendable to all Codable structs for Swift 6 concurrency"
                if [[ "$VERBOSE" == "true" ]]; then
                    echo "$NON_SENDABLE" | head -3 | while read -r line; do
                        echo -e "         ${DIM}$line${NC}"
                    done
                fi
            else
                log_pass "All Codable models conform to Sendable"
            fi
        fi

        # 4.10 Deprecated API usage
        DEPRECATED=$(grep -rn 'UIScreen\.main\b\|\.keyWindow\b\|UIApplication\.shared\.keyWindow' "$SRC_DIR" --include='*.swift' \
            | grep -v '\.build/' || true)
        DEP_COUNT=$(_count_lines "$DEPRECATED")
        if [[ "$DEP_COUNT" -gt 0 ]]; then
            log_warn "$DEP_COUNT deprecated API usage(s) (UIScreen.main, keyWindow)" "Use UIWindowScene-based APIs instead"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$DEPRECATED" | head -3 | while read -r line; do
                    echo -e "         ${DIM}$line${NC}"
                done
            fi
        else
            log_pass "No deprecated API usage found"
        fi

        # 4.11 nonisolated(unsafe) audit
        NONISOLATED=$(grep -rn 'nonisolated(unsafe)' "$SRC_DIR" --include='*.swift' | grep -v '\.build/' || true)
        NI_COUNT=$(_count_lines "$NONISOLATED")
        if [[ "$NI_COUNT" -gt 0 ]]; then
            log_info "$NI_COUNT nonisolated(unsafe) usage(s) — audit for thread safety"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$NONISOLATED" | while read -r line; do
                    echo -e "         ${DIM}$line${NC}"
                done
            fi
        else
            log_pass "No nonisolated(unsafe) usage"
        fi

        # 4.12 UIKit imports in SwiftUI app
        UIKIT_IMPORTS=$(grep -rn '^import UIKit' "$SRC_DIR" --include='*.swift' | grep -v '\.build/' || true)
        UK_COUNT=$(_count_lines "$UIKIT_IMPORTS")
        if [[ "$UK_COUNT" -gt 0 ]]; then
            log_warn "$UK_COUNT file(s) import UIKit" "Prefer SwiftUI-native APIs where possible"
            if [[ "$VERBOSE" == "true" ]]; then
                echo "$UIKIT_IMPORTS" | while read -r line; do
                    echo -e "         ${DIM}$line${NC}"
                done
            fi
        else
            log_pass "No UIKit imports (pure SwiftUI)"
        fi
    fi
fi

# ============================================================================
# PHASE 5: DEVICE DEPLOY & LAUNCH
# ============================================================================

if [[ "$SKIP_DEVICE" == "true" ]]; then
    echo ""
    echo -e "${DIM}  ⏭  Phase 5 (Device) skipped${NC}"
else
    phase_header 5 "Device Deploy & Launch"

    # Check device is connected
    DEVICE_LIST=$(xcrun devicectl list devices 2>/dev/null || echo "")
    if echo "$DEVICE_LIST" | grep -q "$DEVICE_ID"; then
        log_pass "Device $DEVICE_ID found"

        # Find built app
        APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/DesktopKitchenPOS-*/Build/Products/Debug-iphoneos/DesktopKitchenPOS.app -maxdepth 0 2>/dev/null | head -1)
        if [[ -d "$APP_PATH" ]]; then
            # Install
            echo -e "  ${DIM}Installing app on device...${NC}"
            INSTALL_OUT=$(xcrun devicectl device install app --device "$DEVICE_ID" "$APP_PATH" 2>&1) || true
            if echo "$INSTALL_OUT" | grep -qi 'install succeeded\|successfully installed\|percent: 100'; then
                log_pass "App installed on device"
            elif echo "$INSTALL_OUT" | grep -qi 'error\|failed'; then
                log_fail "App install failed" "Check signing and device trust: $INSTALL_OUT"
            else
                # Might succeed without explicit message
                log_pass "App install completed (check device)"
            fi

            # Launch
            echo -e "  ${DIM}Launching app...${NC}"
            LAUNCH_OUT=$(xcrun devicectl device process launch --device "$DEVICE_ID" com.desktopkitchen.pos 2>&1) || true
            if echo "$LAUNCH_OUT" | grep -qi 'launched\|process id\|pid'; then
                log_pass "App launched on device"

                # Verify still running after 5s
                sleep 5
                PROCESS_CHECK=$(xcrun devicectl device info processes --device "$DEVICE_ID" 2>&1 || echo "")
                if echo "$PROCESS_CHECK" | grep -q 'DesktopKitchenPOS\|com.desktopkitchen.pos'; then
                    log_pass "App still running after 5s (no crash)"
                else
                    log_warn "Could not verify app is still running (may need manual check)"
                fi
            else
                log_fail "App launch failed" "$LAUNCH_OUT"
            fi
        else
            log_fail "Built .app bundle not found" "Run Phase 1 (build) first, or build manually with xcodebuild"
        fi
    else
        log_warn "Device $DEVICE_ID not connected — skipping deploy"
        log_info "Connected devices:"
        echo "$DEVICE_LIST" | head -10 | while read -r line; do
            echo -e "         ${DIM}$line${NC}"
        done
    fi
fi

# ============================================================================
# PHASE 6: PRE-SUBMISSION CHECKLIST
# ============================================================================

if [[ "$SKIP_SUBMIT" == "true" ]]; then
    echo ""
    echo -e "${DIM}  ⏭  Phase 6 (Pre-Submission) skipped${NC}"
else
    phase_header 6 "Pre-Submission Checklist"

    SRC_DIR="${SRC_DIR:-$PROJECT_DIR/DesktopKitchenPOS}"
    INFO_PLIST="${INFO_PLIST:-$SRC_DIR/Info.plist}"

    # 6.1 Bundle ID matches expected App Store Connect value
    EXPECTED_BUNDLE_ID="com.desktopkitchen.pos"
    if [[ -f "$PROJECT_DIR/project.yml" ]]; then
        ACTUAL_BUNDLE_ID=$(grep 'PRODUCT_BUNDLE_IDENTIFIER' "$PROJECT_DIR/project.yml" | head -1 | sed 's/.*: *//;s/^ *//;s/ *$//')
        if [[ "$ACTUAL_BUNDLE_ID" == "$EXPECTED_BUNDLE_ID" ]]; then
            log_pass "Bundle ID: $ACTUAL_BUNDLE_ID"
        else
            log_fail "Bundle ID mismatch: '$ACTUAL_BUNDLE_ID' (expected '$EXPECTED_BUNDLE_ID')" "Update PRODUCT_BUNDLE_IDENTIFIER in project.yml"
        fi
    else
        log_fail "project.yml not found — cannot verify bundle ID"
    fi

    # 6.2 Version and build number present and non-empty
    if [[ -f "$INFO_PLIST" ]]; then
        VERSION=$(grep -A1 'CFBundleShortVersionString' "$INFO_PLIST" | grep '<string>' | sed 's/.*<string>//;s/<\/string>.*//' | tr -d '[:space:]')
        BUILD_NUM=$(grep -A1 'CFBundleVersion' "$INFO_PLIST" | grep '<string>' | sed 's/.*<string>//;s/<\/string>.*//' | tr -d '[:space:]')

        if [[ -n "$VERSION" && "$VERSION" != '$(MARKETING_VERSION)' ]]; then
            log_pass "Version: $VERSION"
        else
            log_warn "Version is placeholder or empty: '$VERSION'" "Set CFBundleShortVersionString to a real version (e.g. 1.0.0)"
        fi

        if [[ -n "$BUILD_NUM" && "$BUILD_NUM" != '$(CURRENT_PROJECT_VERSION)' ]]; then
            log_pass "Build number: $BUILD_NUM"
        else
            log_warn "Build number is placeholder or empty: '$BUILD_NUM'" "Increment CFBundleVersion before each submission"
        fi
    else
        log_fail "Info.plist not found — cannot verify version/build" "Ensure $INFO_PLIST exists"
    fi

    # 6.3 No debug flags or localhost references in production config
    LOCALHOST_REFS=$(grep -rn 'localhost\|127\.0\.0\.1\|0\.0\.0\.0' "$SRC_DIR" --include='*.swift' \
        | grep -v '\.build/' | grep -v 'DerivedData' | grep -v '//.*localhost' | grep -v 'comment' || true)
    LOCALHOST_COUNT=$(_count_lines "$LOCALHOST_REFS")
    if [[ "$LOCALHOST_COUNT" -gt 0 ]]; then
        log_warn "$LOCALHOST_COUNT localhost/127.0.0.1 reference(s) in Swift code" "Ensure these are behind #if DEBUG or removed for production"
        if [[ "$VERBOSE" == "true" ]]; then
            echo "$LOCALHOST_REFS" | head -5 | while read -r line; do
                echo -e "         ${DIM}$line${NC}"
            done
        fi
    else
        log_pass "No localhost/127.0.0.1 references in source"
    fi

    # Check for debug print/NSLog that should be removed
    DEBUG_PRINTS=$(grep -rn '^\s*print(\|^\s*NSLog(\|^\s*debugPrint(' "$SRC_DIR" --include='*.swift' \
        | grep -v '\.build/' | grep -v '#if DEBUG' || true)
    DEBUG_COUNT=$(_count_lines "$DEBUG_PRINTS")
    if [[ "$DEBUG_COUNT" -gt 5 ]]; then
        log_warn "$DEBUG_COUNT print/NSLog statement(s) in source" "Wrap in #if DEBUG or remove before submission"
    elif [[ "$DEBUG_COUNT" -gt 0 ]]; then
        log_info "$DEBUG_COUNT print/NSLog statement(s) (review before submission)"
    else
        log_pass "No unguarded print/NSLog statements"
    fi

    # Check for #if DEBUG blocks that might be disabling features
    DEBUG_BLOCKS=$(grep -rn '#if DEBUG' "$SRC_DIR" --include='*.swift' | grep -v '\.build/' || true)
    DB_COUNT=$(_count_lines "$DEBUG_BLOCKS")
    if [[ "$DB_COUNT" -gt 0 ]]; then
        log_info "$DB_COUNT #if DEBUG block(s) — verify no production features gated behind debug"
    fi

    # 6.4 Privacy policy URL returns 200 (if configured)
    # Check for any privacy policy URL in Info.plist or project.yml
    PRIVACY_URL=""
    if [[ -f "$PROJECT_DIR/project.yml" ]]; then
        PRIVACY_URL=$(grep -i 'privacy.*url\|NSPrivacyAccessedAPITypes' "$PROJECT_DIR/project.yml" 2>/dev/null | head -1 | grep -Eo 'https?://[^ "]+' || true)
    fi
    if [[ -z "$PRIVACY_URL" ]] && [[ -f "$INFO_PLIST" ]]; then
        PRIVACY_URL=$(grep -A1 'privacy' "$INFO_PLIST" 2>/dev/null | grep -Eo 'https?://[^ <"]+' || true)
    fi

    if [[ -n "$PRIVACY_URL" ]]; then
        PRIVACY_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$PRIVACY_URL" 2>/dev/null || echo "000")
        if [[ "$PRIVACY_CODE" == "200" ]]; then
            log_pass "Privacy policy URL returns 200: $PRIVACY_URL"
        else
            log_fail "Privacy policy URL returns $PRIVACY_CODE: $PRIVACY_URL" "Ensure privacy policy page is live before submission"
        fi
    else
        log_warn "No privacy policy URL found in Info.plist or project.yml" "App Store requires a privacy policy URL — add it before submission"
    fi

    # 6.5 No .env files accidentally bundled
    ENV_FILES=$(find "$PROJECT_DIR" -name '.env' -o -name '.env.*' -o -name '*.env' 2>/dev/null \
        | grep -v 'node_modules\|\.build\|DerivedData\|\.example' || true)
    ENV_COUNT=$(_count_lines "$ENV_FILES")
    if [[ "$ENV_COUNT" -gt 0 ]]; then
        log_fail "$ENV_COUNT .env file(s) found in project tree" "Remove or add to .gitignore: $(echo "$ENV_FILES" | tr '\n' ', ')"
    else
        log_pass "No .env files in project tree"
    fi

    # Check if secrets are hardcoded in Swift source
    HARDCODED_SECRETS=$(grep -rn 'sk_test_\|sk_live_\|pk_test_\|pk_live_\|whsec_\|ADMIN_SECRET.*=.*"[^"]\+"\|apiKey.*=.*"[^"]\+"' "$SRC_DIR" --include='*.swift' \
        | grep -v '\.build/' | grep -v 'DerivedData' | grep -v '// example\|// placeholder' || true)
    SECRET_COUNT=$(_count_lines "$HARDCODED_SECRETS")
    if [[ "$SECRET_COUNT" -gt 0 ]]; then
        log_fail "$SECRET_COUNT hardcoded secret(s)/API key(s) found in Swift source" "Move to UserDefaults/Keychain or server config"
        echo "$HARDCODED_SECRETS" | head -3 | while read -r line; do
            echo -e "         ${RED}$line${NC}"
        done
    else
        log_pass "No hardcoded secrets/API keys in source"
    fi

    # 6.6 Entitlements / signing check
    if [[ -f "$PROJECT_DIR/project.yml" ]]; then
        # Check CODE_SIGN_STYLE
        SIGN_STYLE=$(grep 'CODE_SIGN_STYLE' "$PROJECT_DIR/project.yml" | head -1 | sed 's/.*: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' | tr -d ' ')
        if [[ "$SIGN_STYLE" == "Automatic" ]]; then
            log_pass "Code signing: Automatic"
        elif [[ -n "$SIGN_STYLE" ]]; then
            log_info "Code signing: $SIGN_STYLE (ensure provisioning profile is valid)"
        else
            log_warn "CODE_SIGN_STYLE not set" "Add CODE_SIGN_STYLE: \"Automatic\" to project.yml"
        fi

        # Check DEVELOPMENT_TEAM
        DEV_TEAM=$(grep 'DEVELOPMENT_TEAM' "$PROJECT_DIR/project.yml" | head -1 | sed 's/.*: *"\{0,1\}\([^"]*\)"\{0,1\}/\1/' | tr -d ' ')
        if [[ -n "$DEV_TEAM" ]]; then
            log_pass "Development team: $DEV_TEAM"
        else
            log_fail "DEVELOPMENT_TEAM not set" "Add DEVELOPMENT_TEAM to project.yml"
        fi
    fi

    # Check for entitlements file if needed
    ENTITLEMENTS_FILE=$(find "$PROJECT_DIR" -name '*.entitlements' -not -path '*/\.build/*' 2>/dev/null | head -1)
    if [[ -n "$ENTITLEMENTS_FILE" ]]; then
        log_info "Entitlements file: $(basename "$ENTITLEMENTS_FILE")"
        # Verify no debug-only entitlements
        if grep -q 'get-task-allow.*true' "$ENTITLEMENTS_FILE" 2>/dev/null; then
            log_warn "get-task-allow=true in entitlements (debug signing)" "Xcode handles this per configuration — just verify Release builds"
        fi
    else
        log_info "No .entitlements file (using default capabilities)"
    fi

    # 6.7 App icon present
    APPICON_DIR=$(find "$PROJECT_DIR" -path '*/Assets.xcassets/AppIcon.appiconset' -type d 2>/dev/null | head -1)
    if [[ -d "$APPICON_DIR" ]]; then
        ICON_COUNT=$(find "$APPICON_DIR" -name '*.png' -o -name '*.jpg' 2>/dev/null | wc -l | tr -d ' ')
        if [[ "$ICON_COUNT" -gt 0 ]]; then
            log_pass "App icon: $ICON_COUNT image(s) in AppIcon.appiconset"
        else
            log_fail "AppIcon.appiconset exists but contains no images" "Add required app icon sizes"
        fi
    else
        log_warn "AppIcon.appiconset not found" "Add app icon before submission"
    fi
fi

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo -e "${BOLD}${CYAN}━━━ Summary ━━━${NC}"
echo "" >> "$REPORT_FILE"
echo "━━━ Summary ━━━" >> "$REPORT_FILE"

TOTAL_PASS=0 TOTAL_FAIL=0 TOTAL_WARN=0 TOTAL_INFO=0

print_phase_summary() {
    local p=$1 name=$2
    local PP PF PW PI
    PP=$(_get "$p" PASS)
    PF=$(_get "$p" FAIL)
    PW=$(_get "$p" WARN)
    PI=$(_get "$p" INFO)
    TOTAL_PASS=$((TOTAL_PASS + PP))
    TOTAL_FAIL=$((TOTAL_FAIL + PF))
    TOTAL_WARN=$((TOTAL_WARN + PW))
    TOTAL_INFO=$((TOTAL_INFO + PI))

    local PHASE_TOTAL=$((PP + PF + PW + PI))
    if [[ "$PHASE_TOTAL" -gt 0 ]]; then
        printf "  ${BOLD}Phase %d (%s):${NC}   " "$p" "$name"
        printf "${GREEN}%d pass${NC}, ${YELLOW}%d warn${NC}, ${RED}%d fail${NC}" "$PP" "$PW" "$PF"
        [[ "$PI" -gt 0 ]] && printf ", ${BLUE}%d info${NC}" "$PI"
        echo ""

        printf "  Phase %d (%s):   %d pass, %d warn, %d fail" "$p" "$name" "$PP" "$PW" "$PF" >> "$REPORT_FILE"
        [[ "$PI" -gt 0 ]] && printf ", %d info" "$PI" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
}

print_phase_summary 1 "Build"
print_phase_summary 2 "API"
print_phase_summary 3 "Write"
print_phase_summary 4 "Code"
print_phase_summary 5 "Device"
print_phase_summary 6 "Submit"

echo -e "  ${BOLD}─────────────────────────${NC}"
printf "  ${BOLD}TOTAL:${NC}            "
printf "${GREEN}%d pass${NC}, ${YELLOW}%d warn${NC}, ${RED}%d fail${NC}" "$TOTAL_PASS" "$TOTAL_WARN" "$TOTAL_FAIL"
[[ "$TOTAL_INFO" -gt 0 ]] && printf ", ${BLUE}%d info${NC}" "$TOTAL_INFO"
echo ""

printf "  TOTAL:            %d pass, %d warn, %d fail" "$TOTAL_PASS" "$TOTAL_WARN" "$TOTAL_FAIL" >> "$REPORT_FILE"
[[ "$TOTAL_INFO" -gt 0 ]] && printf ", %d info" "$TOTAL_INFO" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Overall verdict
echo ""
if [[ "$TOTAL_FAIL" -eq 0 ]]; then
    echo -e "  ${BOLD}${GREEN}OVERALL: PASS${NC}"
    echo "  OVERALL: PASS" >> "$REPORT_FILE"
else
    echo -e "  ${BOLD}${RED}OVERALL: FAIL ($TOTAL_FAIL failure(s))${NC}"
    echo "  OVERALL: FAIL ($TOTAL_FAIL failure(s))" >> "$REPORT_FILE"
    echo ""
    echo -e "  ${BOLD}Failed checks:${NC}"
    echo "" >> "$REPORT_FILE"
    echo "  Failed checks:" >> "$REPORT_FILE"
    for failure in "${FAILURES[@]}"; do
        echo -e "    ${RED}•${NC} $failure"
        echo "    • $failure" >> "$REPORT_FILE"
    done
fi

echo ""
echo -e "  ${DIM}Report saved: $REPORT_FILE${NC}"
echo ""

# Exit with failure code if any tests failed
[[ "$TOTAL_FAIL" -gt 0 ]] && exit 1
exit 0
