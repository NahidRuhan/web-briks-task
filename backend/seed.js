import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
const { Pool } = pg;
import bcrypt from 'bcrypt';
import 'dotenv/config';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Purging database...');
  await prisma.user.deleteMany({});
  console.log('Database purged. Seeding personalized data...');
  
  const passwordHash = await bcrypt.hash('asdf1234', 10);
  
  const usersData = [
    {
      email: 'nahid@kanban.com',
      name: 'Nahid',
      board: {
        title: 'Webriks Platform Launch',
        columns: [
          {
            title: 'Backlog',
            tasks: [
              { title: 'Setup Next.js App Router', description: 'Initialize the project with Next.js and Tailwind CSS.' },
              { title: 'Configure Prisma', description: 'Connect to Neon Postgres and define initial schema.' },
              { title: 'Setup CI/CD pipeline', description: 'Configure GitHub Actions to automatically test and deploy to Vercel.' },
              { title: 'Integrate Redis', description: 'Set up Redis caching to optimize session management and board state.' },
              { title: 'Unit tests for Auth', description: 'Write comprehensive Jest tests for the authentication service.' }
            ]
          },
          {
            title: 'In Progress',
            tasks: [
              { title: 'Implement drag-and-drop', description: 'Use @dnd-kit to make board columns and tasks fully draggable.' },
              { title: 'Build WebSocket gateway', description: 'Implement Socket.io to broadcast task movements in real-time.' },
              { title: 'Design REST API', description: 'Create robust endpoints for column reordering and fractional indexing.' },
              { title: 'Fix hydration error', description: 'Investigate and resolve the mismatch between server and client renders on the Board Canvas.' }
            ]
          },
          {
            title: 'Code Review',
            tasks: [
              { title: 'Refactor BoardHeader', description: 'Clean up the component state and migrate inline styles to Tailwind utility classes.' },
              { title: 'Optimize database queries', description: 'Resolve N+1 query problems when fetching boards with their members.' },
              { title: 'API Rate Limiting', description: 'Implement a throttling middleware for all public-facing endpoints.' }
            ]
          },
          {
            title: 'Cancelled',
            tasks: [
              { title: 'Implement Google login', description: 'Decided to stick with email/password authentication for the MVP.' }
            ]
          }
        ]
      }
    },
    {
      email: 'pervej@kanban.com',
      name: 'Pervej',
      board: {
        title: 'Q4 Product Roadmap',
        columns: [
          {
            title: 'Research',
            tasks: [
              { title: 'Competitor Analysis', description: 'Review Trello and Linear to ensure feature parity for our MVP.' },
              { title: 'User Interviews', description: 'Schedule calls with 5 beta testers to gather feedback on the onboarding flow.' },
              { title: 'Analyze Q3 churn rate', description: 'Dive into Mixpanel data to identify where users are dropping off.' },
              { title: 'Review pricing models', description: 'Compare freemium tiers from top SaaS competitors to inform our monetization strategy.' }
            ]
          },
          {
            title: 'Execution',
            tasks: [
              { title: 'Draft Q4 OKRs', description: 'Finalize objectives and key results for the upcoming quarter.' },
              { title: 'Finalize marketing budget', description: 'Allocate spend across Google Ads and LinkedIn for the holiday campaign.' },
              { title: 'Write PRD for Mobile App', description: 'Draft the Product Requirements Document detailing the scope for the iOS launch.' },
              { title: 'Sync with Engineering', description: 'Review Sprint 4 deliverables and push back any non-critical features.' },
              { title: 'Landing page copy', description: 'Write high-converting headline and sub-copy for the new feature release.' }
            ]
          },
          {
            title: 'Released',
            tasks: [
              { title: 'Publish September release notes', description: 'Post the changelog to the blog and send out the newsletter.' },
              { title: 'Launch email campaign', description: 'Deploy the drip sequence targeting early access users.' },
              { title: 'Stripe Integration', description: 'Successfully deployed the new billing pipeline to production.' }
            ]
          }
        ]
      }
    },
    {
      email: 'ruhan@kanban.com',
      name: 'Ruhan',
      board: {
        title: 'Design System Overhaul',
        columns: [
          {
            title: 'To Do',
            tasks: [
              { title: 'Update color tokens', description: 'Switch to the new slate and indigo color palette across all Figma files.' },
              { title: 'Typography audit', description: 'Ensure all headings use the new Geist font and weights are consistent.' },
              { title: 'Design empty states', description: 'Create friendly, illustrated empty states for the Dashboard and Board views.' },
              { title: 'Dark mode variants', description: 'Design dark mode specific contrasts for all base components (buttons, inputs, cards).' },
              { title: 'Standardize spacing', description: 'Audit and consolidate the padding and margin scale to a strict 4px grid.' }
            ]
          },
          {
            title: 'Wireframing',
            tasks: [
              { title: 'Redesign Auth Screens', description: 'Create new mockups for the Login and Register pages featuring the new logo.' },
              { title: 'User settings layout', description: 'Draft a low-fidelity layout for the account management and profile settings.' },
              { title: 'Kanban board view mockups', description: 'Explore alternative layouts for how columns wrap on smaller screens.' },
              { title: 'Mobile navigation drawer', description: 'Design a slide-out hamburger menu specifically for mobile users.' }
            ]
          },
          {
            title: 'Handoff',
            tasks: [
              { title: 'Export SVG assets', description: 'Organize and export all newly created iconography for the engineering team.' },
              { title: 'Document in Storybook', description: 'Write design specs and usage guidelines for the implemented component variants.' },
              { title: 'Motion guidelines', description: 'Finalize spring physics variables for drag-and-drop transitions.' },
              { title: 'UI Review', description: 'Review the frontend implementation against the original Figma files for pixel-perfection.' }
            ]
          }
        ]
      }
    }
  ];
  
  const createdUsers = [];
  const createdBoards = [];

  for (const u of usersData) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        passwordHash,
      }
    });
    console.log(`Created user: ${user.name}`);
    createdUsers.push(user);
    
    const board = await prisma.board.create({
      data: {
        title: u.board.title,
        ownerId: user.id,
      }
    });
    console.log(`  -> Created board: "${board.title}"`);
    createdBoards.push(board);
    
    let colPosition = 1;
    for (const colData of u.board.columns) {
      const column = await prisma.column.create({
        data: {
          title: colData.title,
          boardId: board.id,
          position: colPosition,
        }
      });
      colPosition++;
      
      let taskPosition = 1;
      for (const taskData of colData.tasks) {
        await prisma.task.create({
          data: {
            title: taskData.title,
            description: taskData.description,
            columnId: column.id,
            boardId: board.id,
            position: taskPosition,
          }
        });
        taskPosition++;
      }
    }
  }

  // 0: Nahid, 1: Pervej, 2: Ruhan
  // Nahid shares with Pervej
  await prisma.boardMember.create({
    data: { boardId: createdBoards[0].id, userId: createdUsers[1].id, role: 'EDITOR' }
  });
  // Pervej shares with Ruhan
  await prisma.boardMember.create({
    data: { boardId: createdBoards[1].id, userId: createdUsers[2].id, role: 'EDITOR' }
  });
  // Ruhan shares with Nahid
  await prisma.boardMember.create({
    data: { boardId: createdBoards[2].id, userId: createdUsers[0].id, role: 'EDITOR' }
  });

  console.log('Successfully shared boards between users!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
