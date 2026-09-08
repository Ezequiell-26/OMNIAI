import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const required = [
  'AGENTS.md',
  'docs/ai/PROJECT-CONTEXT.md',
  'docs/ai/PROJECT-STATE.json',
  'docs/ai/DECISIONS.md',
  'docs/ai/HANDOFF.md',
  'docs/ai/AI-ENGINEERING-STANDARD.md',
  'docs/architecture/unified-core.md',
  'docs/architecture/audit.md',
  'docs/development/ai-contributor-contract.md',
  'docs/open-source/mit-agent-references.md',
];

const missing = required.filter((file) => !existsSync(join(root, file)));
if (missing.length) {
  console.error(`AI context check failed. Missing: ${missing.join(', ')}`);
  process.exit(1);
}

let state;
try {
  state = JSON.parse(readFileSync(join(root, 'docs/ai/PROJECT-STATE.json'), 'utf8'));
} catch (error) {
  console.error(`AI context check failed. PROJECT-STATE.json is invalid: ${error instanceof Error ? error.message : error}`);
  process.exit(1);
}

if (state.canonicalBranch !== 'main') {
  console.error('AI context check failed. canonicalBranch must be main.');
  process.exit(1);
}

if (state.integrationPolicy?.canonicalBranch !== 'main' || state.integrationPolicy?.finishedWorkMustEndOnMain !== true) {
  console.error('AI context check failed. Main-only integration policy is incomplete.');
  process.exit(1);
}

if (!state.coreVersion || !state.architecture?.brain || state.architecture.brain !== 'src/lib/core') {
  console.error('AI context check failed. Core identity is incomplete.');
  process.exit(1);
}

if (state.aiEngineeringPolicy?.professionalReferenceStandard !== true || state.aiEngineeringPolicy?.preferProductionGrade !== true || state.aiEngineeringPolicy?.preferMITForSourceReuseWhenEquivalent !== true) {
  console.error('AI context check failed. Professional open-source engineering policy is incomplete.');
  process.exit(1);
}

const context = readFileSync(join(root, 'docs/ai/PROJECT-CONTEXT.md'), 'utf8');
const handoff = readFileSync(join(root, 'docs/ai/HANDOFF.md'), 'utf8');
const agents = readFileSync(join(root, 'AGENTS.md'), 'utf8');
const contract = readFileSync(join(root, 'docs/development/ai-contributor-contract.md'), 'utf8');
const standard = readFileSync(join(root, 'docs/ai/AI-ENGINEERING-STANDARD.md'), 'utf8');
const references = readFileSync(join(root, 'docs/open-source/mit-agent-references.md'), 'utf8');

for (const marker of ['PROJECT-STATE.json', 'HANDOFF.md', 'DECISIONS.md', 'AI-ENGINEERING-STANDARD.md']) {
  if (!agents.includes(marker)) {
    console.error(`AI context check failed. AGENTS.md must reference ${marker}.`);
    process.exit(1);
  }
}

for (const marker of ['Core', 'main', 'Web', 'Windows']) {
  if (!context.includes(marker)) {
    console.error(`AI context check failed. PROJECT-CONTEXT.md is missing required concept: ${marker}.`);
    process.exit(1);
  }
}

for (const source of [agents, contract]) {
  const normalized = source.toLocaleLowerCase();
  if (!normalized.includes('main') || !normalized.includes('final') || !normalized.includes('commit')) {
    console.error('AI context check failed. Main-only final commit policy is missing.');
    process.exit(1);
  }
}

for (const marker of ['production-grade', 'actively maintained', 'MIT', 'license', 'reimplement']) {
  if (!standard.includes(marker)) {
    console.error(`AI context check failed. AI engineering standard missing: ${marker}.`);
    process.exit(1);
  }
}

if (!references.includes('Verified') || !references.includes('license') || !references.includes('MIT')) {
  console.error('AI context check failed. Open-source reference registry is incomplete.');
  process.exit(1);
}

if (!handoff.includes('Next extension point') && !handoff.includes('next extension point')) {
  console.error('AI context check failed. HANDOFF.md must contain a continuation point.');
  process.exit(1);
}

console.log(`OMNIAI AI context check passed (Core ${state.coreVersion}, canonical branch main).`);
