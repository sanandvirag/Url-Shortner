import bcrypt from "bcrypt";
import { prisma } from "./lib/prisma.js";

const DEFAULT_URL_COUNT = 1_000;
const BATCH_SIZE = 500;
const SEEDED_USER_COUNT = 10;

const getUrlCount = (): number => {
    const argument = process.argv.find((value) => value.startsWith("--count="));
    const configuredCount = argument?.split("=")[1] ?? process.env.SEED_URL_COUNT;
    const count = Number(configuredCount ?? DEFAULT_URL_COUNT);

    if (!Number.isInteger(count) || count < 1 || count > 1_000_000) {
        throw new Error("Seed URL count must be an integer between 1 and 1,000,000");
    }

    return count;
};

const createSeedUsers = async () => {
    const password = await bcrypt.hash("seed-password-123", 10);
    const users = [];

    for (let index = 0; index < SEEDED_USER_COUNT; index += 1) {
        users.push(await prisma.user.upsert({
            where: { email: `seed-user-${index}@example.com` },
            update: {},
            create: {
                email: `seed-user-${index}@example.com`,
                password,
            },
        }));
    }

    return users;
};

const deletePreviousSeedData = async () => {
    await prisma.url.deleteMany({
        where: {
            shortCode: {
                startsWith: "seed-",
            },
        },
    });
};

const createSeedUrls = async (count: number, users: Array<{ id: string }>) => {
    let createdUrls = 0;

    for (let start = 0; start < count; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, count);
        const data = [];

        for (let index = start; index < end; index += 1) {
            const hasAlias = index % 10 === 0;
            const hasExpiry = index % 20 === 0;

            data.push({
                originalUrl: `https://example.com/seeded-resource/${index}`,
                shortCode: `seed-${index}`,
                customAlias: hasAlias ? `demo-${index}` : null,
                expiresAt: hasExpiry
                    ? new Date(Date.now() + (index % 40 === 0 ? -86_400_000 : 86_400_000 * 30))
                    : null,
                userId: users[index % users.length].id,
            });
        }

        await prisma.url.createMany({ data });
        createdUrls += data.length;
        console.log(`Created ${createdUrls}/${count} seeded URLs`);
    }
};

const createSeedClicks = async (count: number) => {
    for (let start = 0; start < count; start += BATCH_SIZE) {
        const end = Math.min(start + BATCH_SIZE, count);
        const urls = await prisma.url.findMany({
            where: {
                shortCode: {
                    in: Array.from({ length: end - start }, (_, offset) => `seed-${start + offset}`),
                },
            },
            select: { id: true, shortCode: true },
        });

        const clicks = urls.flatMap((url, urlIndex) => {
            const clickCount = (start + urlIndex) % 5;
            return Array.from({ length: clickCount }, (_, clickIndex) => ({
                urlId: url.id,
                clickedAt: new Date(Date.now() - clickIndex * 3_600_000),
                referer: clickIndex % 2 === 0 ? "https://google.com" : "https://example.com",
                userAgent: "seed-test-agent",
                ipAddress: "127.0.0.1",
            }));
        });

        if (clicks.length > 0) {
            await prisma.click.createMany({ data: clicks });
        }
    }
};

const main = async () => {
    const count = getUrlCount();
    console.log(`Seeding ${count} URLs...`);

    await deletePreviousSeedData();
    const users = await createSeedUsers();
    await createSeedUrls(count, users);
    await createSeedClicks(count);

    console.log("Seed completed successfully.");
    console.log("Seed login: seed-user-0@example.com / seed-password-123");
};

main()
    .catch((error) => {
        console.error("Seed failed", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
