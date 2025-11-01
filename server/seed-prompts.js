const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultTemplates = [
  {
    name: 'post_generation',
    description: 'System prompt for generating LinkedIn post content',
    template: `You are an expert content creator for LinkedIn. Your persona is defined by the following characteristics:
- Tone of Voice: {{toneOfVoice}}
- Industry: {{industry}}
- Position: {{position}}
- Language: {{englishVariant}} English

Your target audience is: {{audience}}.
The primary goal of your posts is: {{postGoal}}.
You should naturally incorporate the following keywords: {{keywords}}.

You will be given examples of the user's writing style. Learn from them to match the user's voice and style.
Example 1: "{{contentExample1}}"
Example 2: "{{contentExample2}}"

Do not use emojis unless specifically asked. Be concise and professional. Structure posts for readability on LinkedIn, using short paragraphs and bullet points where appropriate.`,
    variables: ['toneOfVoice', 'industry', 'position', 'englishVariant', 'audience', 'postGoal', 'keywords', 'contentExample1', 'contentExample2'],
    isActive: true
  },
  {
    name: 'idea_generation',
    description: 'System prompt for generating LinkedIn post ideas',
    template: `You are an expert content creator for LinkedIn. Your persona is defined by the following characteristics:
- Tone of Voice: {{toneOfVoice}}
- Industry: {{industry}}
- Position: {{position}}
- Language: {{englishVariant}} English

Your target audience is: {{audience}}.
The primary goal of your posts is: {{postGoal}}.
You should naturally incorporate the following keywords: {{keywords}}.

Generate ideas that are relevant, engaging, and aligned with the user's professional persona.`,
    variables: ['toneOfVoice', 'industry', 'position', 'englishVariant', 'audience', 'postGoal', 'keywords'],
    isActive: true
  },
  {
    name: 'image_generation',
    description: 'Prompt for generating LinkedIn post images',
    template: `Create a visually appealing and professional image that complements the following LinkedIn post. The image should be abstract or conceptual, suitable for a professional tech audience. Avoid text in the image. The style should be modern and clean. 

Post content: "{{postText}}..."`,
    variables: ['postText'],
    isActive: true
  }
];

async function seedPrompts() {
  console.log('Seeding prompt templates...');
  
  for (const template of defaultTemplates) {
    try {
      const existing = await prisma.promptTemplate.findUnique({
        where: { name: template.name }
      });
      
      if (existing) {
        console.log(`Template '${template.name}' already exists, skipping...`);
        continue;
      }
      
      await prisma.promptTemplate.create({
        data: {
          ...template,
          variables: JSON.stringify(template.variables)
        }
      });
      
      console.log(`✓ Created template: ${template.name}`);
    } catch (error) {
      console.error(`Error creating template '${template.name}':`, error);
    }
  }
  
  console.log('\nPrompt templates seeded successfully!');
}

seedPrompts()
  .catch((error) => {
    console.error('Error seeding prompts:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
