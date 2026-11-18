import 'dotenv/config';
import { hash } from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../apps/api/src/generated/prisma/client';
import { canonicalDirectKey } from '../apps/api/src/chats/chats.utils';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL topilmadi');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function seedUser(email: string, username: string, displayName: string) {
  const passwordHash = await hash('JOVO1234');
  return prisma.user.upsert({
    where: { username },
    update: {},
    create: {
      username,
      profile: { create: { displayName } },
      preferences: { create: {} },
      privacy: { create: {} },
      status: { create: {} },
      identities: { create: { type: 'EMAIL', value: email, verifiedAt: new Date() } },
      password: { create: { passwordHash } },
    },
  });
}

async function main() {
  const alice = await seedUser('alice@jovo.local', 'alice', 'Alisa Karimova');
  await seedUser('bob@jovo.local', 'bob_jovo', 'Bobur Rahimov');
  const sirojiddin = await seedUser('sirojiddin@jovo.local', 'sirojiddin', 'Sirojiddin');

  const directKey = canonicalDirectKey(alice.id, sirojiddin.id);
  const directChat = await prisma.chat.upsert({
    where: { directKey },
    update: {},
    create: {
      type: 'DIRECT',
      directKey,
      members: {
        create: [
          { userId: alice.id, role: 'MEMBER' },
          { userId: sirojiddin.id, role: 'MEMBER' },
        ],
      },
    },
  });

  // Keep the demo conversation visible from both demo accounts on every seed run.
  for (const user of [alice, sirojiddin]) {
    await prisma.chatMember.upsert({
      where: { chatId_userId: { chatId: directChat.id, userId: user.id } },
      update: { leftAt: null, role: 'MEMBER' },
      create: { chatId: directChat.id, userId: user.id, role: 'MEMBER' },
    });
  }

  // Add each demo user to the other's contacts as well as the shared chat.
  await prisma.userContact.upsert({
    where: { ownerId_contactId: { ownerId: alice.id, contactId: sirojiddin.id } },
    update: {},
    create: { ownerId: alice.id, contactId: sirojiddin.id },
  });
  await prisma.userContact.upsert({
    where: { ownerId_contactId: { ownerId: sirojiddin.id, contactId: alice.id } },
    update: {},
    create: { ownerId: sirojiddin.id, contactId: alice.id },
  });

  console.log('Demo loginlar: alice@jovo.local, bob@jovo.local, sirojiddin@jovo.local / parol: JOVO1234');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
