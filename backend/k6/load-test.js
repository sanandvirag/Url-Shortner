//P95 latency is a performance metric showing that 95% of requests finish faster than a specific time, while the slowest 5% take longer


import http from "k6/http";
import { check, sleep } from "k6";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

const BASE_URL = (__ENV.BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const TEST_EMAIL = __ENV.TEST_EMAIL || "seed-user-0@example.com";
const TEST_PASSWORD = __ENV.TEST_PASSWORD || "seed-password-123";
const REGISTER_USERS = (__ENV.REGISTER_USERS || "false").toLowerCase() === "true";
const USER_POOL_SIZE = Number(__ENV.USER_POOL_SIZE || 0);
const TARGET_VUS = Number(__ENV.VUS || 10);
const RAMP_UP = __ENV.RAMP_UP || "10s";           // VUs 0--->Target VUs
const HOLD_DURATION = __ENV.DURATION || "60s";    // VUs == Traget VUs
const RAMP_DOWN = __ENV.RAMP_DOWN || "10s";       // Target VUs ----> 0
const THINK_TIME = Number(__ENV.THINK_TIME || 1);
const SEED_USER_EMAILS = Array.from({ length: 10 }, (_, index) => `seed-user-${index}@example.com`);

// Think Time : A deliberate pause inside your VU script between actions, 
// simulating the delay a real user would take reading a page, filling a form, 
// deciding what to click next, etc. Without it, VUs hammer the server back-to-back as fast as possible, 
// which doesn't reflect real usage and can generate unrealistically high RPS for a given VU count.

export const options = {
    stages: [
        { duration: RAMP_UP, target: TARGET_VUS },
        { duration: HOLD_DURATION, target: TARGET_VUS },
        { duration: RAMP_DOWN, target: 0 },
    ],
    thresholds: {
        http_req_failed: ["rate<0.01"],       // test fails if 1% request return error
        http_req_duration: ["p(95)<1000"],    // http_req_duration is the response time of every request 
        //p(95) means 95% request should be completed before 1000ms (its a global one)
        "http_req_duration{endpoint:create}": ["p(95)<1000"], //for just the "create" requests, p95 latency must be under 1000ms
        "http_req_duration{endpoint:redirect}": ["p(95)<500"],//for redirect request p95 latency must be under 500ms
        checks: ["rate>0.95"], //checks aggregates the pass/fail rate of all check()
    },
}; //this object tell k6 engine exactly how to execute the test and what defines a pass or fail.

const jsonHeaders = {
    headers: {
        "Content-Type": "application/json",
    },
};

let authenticated = false;
let authToken = null;
let authCookie = "";
let selectedSeedUserEmail = null;

const getCredentials = () => {
    if (USER_POOL_SIZE <= 0) {
        if (!REGISTER_USERS) {
            return {
                email: TEST_EMAIL,
                password: TEST_PASSWORD,
            };
        }

        return {
            email: `k6-vu-${__VU}@example.com`,
            password: TEST_PASSWORD,
        };
    }

    if (!selectedSeedUserEmail) {
        const poolSize = Math.min(Math.max(1, Math.trunc(USER_POOL_SIZE)), SEED_USER_EMAILS.length);
        const randomIndex = Math.floor(Math.random() * poolSize);
        selectedSeedUserEmail = SEED_USER_EMAILS[randomIndex];
    }

    return {
        email: selectedSeedUserEmail,
        password: TEST_PASSWORD,
    };
};

// Merge auth token (if any) into the standard JSON headers for authenticated calls
const authedHeaders = () => ({
    headers: {
        ...jsonHeaders.headers,
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(authCookie ? { Cookie: `token=${authCookie}` } : {}),
    },
});

const authenticate = () => {
    const credentials = getCredentials();

    if (REGISTER_USERS) {
        const registration = http.post(
            `${BASE_URL}/api/auth/register`,
            JSON.stringify(credentials),
            jsonHeaders,
        );

        check(registration, {
            "registration succeeds or user already exists": (response) =>
                response.status === 201 || response.status === 409,
        });
    }

    const login = http.post(
        `${BASE_URL}/api/auth/login`,
        JSON.stringify(credentials),
        jsonHeaders,
    );

    const loginSucceeded = check(login, {
        "login returns 200": (response) => response.status === 200,
        "login returns a user": (response) => Boolean(response.json("user.id")),
    });

    authenticated = loginSucceeded;

    if (loginSucceeded && login.cookies.token?.[0]?.value) {
        authCookie = login.cookies.token[0].value;
    }

    // If the API returns a JWT in the body (rather than setting an httpOnly
    // cookie), capture it so it can be forwarded on later requests.
    if (loginSucceeded && login.json("token")) {
        authToken = login.json("token");
    }
};

export default function () {
    if (!authenticated) {
        authenticate();
    }

    const health = http.get(`${BASE_URL}/`);
    check(health, {
        "health check returns 200": (response) => response.status === 200,
    });

    if (!authenticated) {
        // Retry auth on the next iteration instead of giving up for the
        // rest of this VU's run.
        sleep(1);
        return;
    }

    const create = http.post(
        `${BASE_URL}/api/urls`,
        JSON.stringify({
            originalUrl: `https://example.com/k6/${__VU}/${__ITER}`,
        }),
        { ...authedHeaders(), tags: { endpoint: "create" } },
    );

    const createSucceeded = check(create, {
        "URL creation returns 201": (response) => response.status === 201,
        "URL creation returns a short code": (response) => Boolean(response.json("shortCode")),
    });

    if (!createSucceeded) {
        // A 401 here means the token/cookie was rejected — treat as an
        // auth failure so the next iteration re-authenticates.
        if (create.status === 401) {
            authenticated = false;
            authToken = null;
            authCookie = "";
        }
        sleep(1);
        return;
    }

    const shortCode = create.json("shortCode");
    const redirect = http.get(`${BASE_URL}/api/urls/${shortCode}`, {
        redirects: 0,
        tags: { endpoint: "redirect" },
    });
    check(redirect, {
        "redirect returns 302": (response) => response.status === 302,
        "redirect points to the original URL": (response) =>
            response.headers.Location === `https://example.com/k6/${__VU}/${__ITER}`,
    });

    const analytics = http.get(`${BASE_URL}/api/urls/analytics?limit=100`, authedHeaders());
    const analyticsPayload = analytics.json();
    const analyticsUrls = analyticsPayload && Array.isArray(analyticsPayload.urls)
        ? analyticsPayload.urls
        : [];
    const analyticsSucceeded = check(analytics, {
        "analytics returns 200": (response) => response.status === 200,
        "analytics returns a URL list": () => analyticsUrls.length >= 0 && analytics.status === 200,
        "analytics includes the created URL": () =>
            analyticsUrls.some((url) => url.shortCode === shortCode),
    });

    if (analyticsSucceeded) {
        const url = analyticsUrls.find((item) => item.shortCode === shortCode);
        if (!url) {
            sleep(THINK_TIME);
            return;
        }
        const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        const update = http.patch(
            `${BASE_URL}/api/urls/${url.id}/expiry`,
            JSON.stringify({ expiresAt: expiry }),
            authedHeaders(),
        );

        check(update, {
            "expiry update returns 200": (response) => response.status === 200,
        });

        const deletion = http.del(`${BASE_URL}/api/urls/${url.id}`, null, authedHeaders());
        check(deletion, {
            "URL deletion returns 204": (response) => response.status === 204,
        });
    }

    sleep(THINK_TIME);
}

export function handleSummary(data) {
    const metrics = data.metrics;
    const summary = {
        benchmark: {
            targetVUs: TARGET_VUS,
            rampUp: RAMP_UP,
            duration: HOLD_DURATION,
            rampDown: RAMP_DOWN,
            thinkTimeSeconds: THINK_TIME,
        },
        throughput: {
            requestsPerSecond: metrics.http_reqs?.values.rate ?? 0,
            totalRequests: metrics.http_reqs?.values.count ?? 0,
            iterationsPerSecond: metrics.iterations?.values.rate ?? 0,
        },
        latencyMilliseconds: {
            average: metrics.http_req_duration?.values.avg ?? 0,
            p90: metrics.http_req_duration?.values["p(90)"] ?? 0,
            p95: metrics.http_req_duration?.values["p(95)"] ?? 0,
            p99: metrics.http_req_duration?.values["p(99)"] ?? 0,
            maximum: metrics.http_req_duration?.values.max ?? 0,
        },
        errorRate: metrics.http_req_failed?.values.rate ?? 0,
    };

    return {
        stdout: textSummary(data, { indent: " ", enableColors: true }),
        "k6-results.json": JSON.stringify(summary, null, 2),
    };
}