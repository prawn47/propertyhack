import { createRequire } from 'module';

const _require = createRequire(import.meta.url);

const mockGenerateImage = vi.fn();
const mockMkdir = vi.fn();
const mockWriteFile = vi.fn();

const mockPrisma = {
  systemPrompt: { findFirst: vi.fn() },
  $disconnect: vi.fn(),
};

// Patch aiProviderService
const aiProviderPath = _require.resolve('../../services/aiProviderService.js');
_require.cache[aiProviderPath] = {
  id: aiProviderPath,
  filename: aiProviderPath,
  loaded: true,
  exports: { generateImage: mockGenerateImage },
};

// Patch fs/promises
const fsPath = _require.resolve('fs/promises');
_require.cache[fsPath] = {
  id: fsPath,
  filename: fsPath,
  loaded: true,
  exports: { mkdir: mockMkdir, writeFile: mockWriteFile },
};

// Patch @prisma/client
const prismaClientPath = _require.resolve('@prisma/client');
_require.cache[prismaClientPath] = {
  id: prismaClientPath,
  filename: prismaClientPath,
  loaded: true,
  exports: { PrismaClient: function () { return mockPrisma; } },
};

// Force fresh load
const svcPath = _require.resolve('../../services/imagenService.js');
delete _require.cache[svcPath];
const imagenService = _require('../../services/imagenService.js');

describe('imagenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockPrisma.systemPrompt.findFirst.mockResolvedValue(null);
    mockPrisma.$disconnect.mockResolvedValue(undefined);
  });

  describe('generateNewsletterImage', () => {
    it('calls aiProviderService.generateImage with styled prompt', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      mockGenerateImage.mockResolvedValue({ imageData: imageBuffer, mimeType: 'image/png' });

      const result = await imagenService.generateNewsletterImage('A modern apartment building');

      expect(mockGenerateImage).toHaveBeenCalledWith(
        'newsletter-image',
        expect.stringContaining('Professional editorial illustration')
      );
      expect(mockGenerateImage).toHaveBeenCalledWith(
        'newsletter-image',
        expect.stringContaining('A modern apartment building')
      );
      expect(result.imageData).toEqual(imageBuffer);
      expect(result.mimeType).toBe('image/png');
    });
  });

  describe('saveImage', () => {
    it('writes file and returns URL', async () => {
      const imageBuffer = Buffer.from('image-data');

      const url = await imagenService.saveImage(imageBuffer, 'draft-123');

      expect(mockMkdir).toHaveBeenCalledWith(expect.stringContaining('newsletters'), { recursive: true });
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('draft-123.png'),
        imageBuffer
      );
      expect(url).toBe('/images/newsletters/draft-123.png');
    });
  });

  describe('generateHeroImage', () => {
    it('orchestrates the full flow and returns url + altText', async () => {
      const imageBuffer = Buffer.from('hero-image');
      mockGenerateImage.mockResolvedValue({ imageData: imageBuffer, mimeType: 'image/png' });

      const result = await imagenService.generateHeroImage('nl-1', 'Big News Today', 'Housing market update');

      expect(mockGenerateImage).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.url).toMatch(/^\/images\/newsletters\/propertyhack-newsletter-.*\.png$/);
      expect(result.altText).toBe('PropertyHack newsletter hero image: Big News Today');
    });

    it('uses jurisdiction in filename when provided', async () => {
      const imageBuffer = Buffer.from('hero-image');
      mockGenerateImage.mockResolvedValue({ imageData: imageBuffer, mimeType: 'image/png' });

      const result = await imagenService.generateHeroImage('nl-1', 'UK Housing', 'Theme', { jurisdiction: 'UK' });

      expect(result.url).toContain('propertyhack-newsletter-uk-');
    });

    it('returns null url on error', async () => {
      mockGenerateImage.mockRejectedValue(new Error('AI service unavailable'));

      const result = await imagenService.generateHeroImage('nl-2', 'Subject', 'Theme');

      expect(result.url).toBeNull();
      expect(result.altText).toBe('PropertyHack newsletter hero image: Subject');
    });
  });

  describe('generateNewsletterFilename', () => {
    it('creates descriptive filename', () => {
      const filename = imagenService.generateNewsletterFilename('AU', '2026-03-21');
      expect(filename).toBe('propertyhack-newsletter-au-2026-03-21-hero');
    });

    it('defaults to au when no jurisdiction', () => {
      const filename = imagenService.generateNewsletterFilename(null, '2026-01-01');
      expect(filename).toBe('propertyhack-newsletter-au-2026-01-01-hero');
    });
  });

  describe('generateNewsletterAltText', () => {
    it('creates alt text from subject', () => {
      expect(imagenService.generateNewsletterAltText('Big News')).toBe('PropertyHack newsletter hero image: Big News');
    });

    it('handles missing subject', () => {
      expect(imagenService.generateNewsletterAltText(null)).toBe('PropertyHack newsletter hero image: latest edition');
    });
  });
});
